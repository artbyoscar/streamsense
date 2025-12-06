/**
 * DNA Computation Queue
 * Background service for computing Content DNA with rate limiting and retry logic
 */

import { supabase } from '@/config/supabase';
import { recommendationOrchestrator } from './recommendationOrchestrator';

// ============================================================================
// TYPES
// ============================================================================

interface QueueItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  retryCount: number;
  addedAt: number;
}

// ============================================================================
// QUEUE CONFIGURATION
// ============================================================================

const MAX_CONCURRENT = 3; // Process max 3 items at once
const BATCH_DELAY_MS = 500; // Wait 500ms between batches
const MAX_RETRIES = 3; // Retry failed items up to 3 times
const RETRY_DELAY_MS = 2000; // Wait 2s before retrying

// ============================================================================
// DNA COMPUTATION QUEUE SERVICE
// ============================================================================

class DNAComputationQueue {
  private queue: QueueItem[] = [];
  private processing = new Set<string>(); // Track currently processing items
  private isProcessing = false;
  private processingPromise: Promise<void> | null = null;

  /**
   * Check if DNA already exists in the database
   */
  private async dnaExists(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('content_dna')
        .select('id')
        .eq('tmdb_id', tmdbId)
        .eq('media_type', mediaType)
        .single();

      // Handle missing table (PGRST205) OR not found (PGRST116)
      if (error) {
        if (error.code === 'PGRST205' || error.code === 'PGRST116') {
          return false;
        }
        console.warn('[DNAQueue] Error checking DNA existence:', error.message);
        return false;
      }

      return !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add item to queue if DNA doesn't exist
   */
  async enqueue(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<void> {
    const key = `${mediaType}-${tmdbId}`;

    // Skip if already in queue or processing
    if (this.processing.has(key)) {
      console.log(`[DNAQueue] Already processing: ${key}`);
      return;
    }

    if (this.queue.some(item => item.tmdbId === tmdbId && item.mediaType === mediaType)) {
      console.log(`[DNAQueue] Already in queue: ${key}`);
      return;
    }

    // Check if DNA already exists
    const exists = await this.dnaExists(tmdbId, mediaType);
    if (exists) {
      console.log(`[DNAQueue] DNA already exists: ${key}`);
      return;
    }

    // Add to queue
    this.queue.push({
      tmdbId,
      mediaType,
      retryCount: 0,
      addedAt: Date.now(),
    });

    console.log(`[DNAQueue] Added to queue: ${key} (Queue size: ${this.queue.length})`);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }
  }

  /**
   * Process a single item from the queue
   */
  private async processItem(item: QueueItem): Promise<boolean> {
    const key = `${item.mediaType}-${item.tmdbId}`;
    this.processing.add(key);

    try {
      console.log(`[DNAQueue] Computing DNA for ${key} (Attempt ${item.retryCount + 1}/${MAX_RETRIES + 1})`);

      // Compute DNA using orchestrator
      const dna = await recommendationOrchestrator.computeContentDNA(item.tmdbId, item.mediaType);

      if (dna) {
        console.log(`[DNAQueue] ✓ Successfully computed DNA for ${key}`);
        this.processing.delete(key);
        return true;
      } else {
        console.warn(`[DNAQueue] ✗ Failed to compute DNA for ${key} (returned null)`);
        this.processing.delete(key);
        return false;
      }
    } catch (error) {
      console.error(`[DNAQueue] ✗ Error computing DNA for ${key}:`, error);
      this.processing.delete(key);
      return false;
    }
  }

  /**
   * Process the queue in batches with rate limiting
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;
    console.log('[DNAQueue] Started processing queue');

    while (this.queue.length > 0) {
      // Get next batch (up to MAX_CONCURRENT items)
      const batch = this.queue.splice(0, MAX_CONCURRENT);
      console.log(`[DNAQueue] Processing batch of ${batch.length} items (${this.queue.length} remaining)`);

      // Process batch concurrently
      const results = await Promise.all(
        batch.map(item => this.processItem(item))
      );

      // Handle failed items
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const success = results[i];

        if (!success && item.retryCount < MAX_RETRIES) {
          // Retry failed item
          const key = `${item.mediaType}-${item.tmdbId}`;
          console.log(`[DNAQueue] Scheduling retry for ${key} in ${RETRY_DELAY_MS}ms`);

          setTimeout(() => {
            this.queue.push({
              ...item,
              retryCount: item.retryCount + 1,
            });

            // Resume processing if stopped
            if (!this.isProcessing && this.queue.length > 0) {
              this.startProcessing();
            }
          }, RETRY_DELAY_MS);
        } else if (!success) {
          const key = `${item.mediaType}-${item.tmdbId}`;
          console.error(`[DNAQueue] ✗ Max retries exceeded for ${key}, giving up`);
        }
      }

      // Wait before next batch (rate limiting)
      if (this.queue.length > 0) {
        console.log(`[DNAQueue] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    this.isProcessing = false;
    console.log('[DNAQueue] Queue processing complete');
  }

  /**
   * Get queue status
   */
  getStatus(): { queueSize: number; processing: number; isProcessing: boolean } {
    return {
      queueSize: this.queue.length,
      processing: this.processing.size,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Clear the queue (for testing/debugging)
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
    console.log('[DNAQueue] Queue cleared');
  }

  /**
   * Scan watchlist for items missing DNA and add to queue
   */
  async scanWatchlistForMissingDNA(userId: string): Promise<void> {
    try {
      console.log('[DNAQueue] Scanning watchlist for missing DNA...');

      // Get all watchlist items for user
      const { data: watchlistItems, error: watchlistError } = await supabase
        .from('watchlist_items')
        .select('tmdb_id, media_type')
        .eq('user_id', userId);

      if (watchlistError) {
        console.error('[DNAQueue] Error fetching watchlist:', watchlistError);
        return;
      }

      if (!watchlistItems || watchlistItems.length === 0) {
        console.log('[DNAQueue] No watchlist items found');
        return;
      }

      console.log(`[DNAQueue] Found ${watchlistItems.length} watchlist items, checking for missing DNA...`);

      // Get all existing DNA records (filter out null/invalid tmdb_ids)
      const tmdbIds = watchlistItems
        .map(item => item.tmdb_id)
        .filter(id => id != null && id !== 'null' && !isNaN(Number(id)));

      if (tmdbIds.length === 0) {
        console.log('[DNAQueue] No valid tmdb_ids to check');
        return;
      }

      const { data: existingDNA, error: dnaError } = await supabase
        .from('content_dna')
        .select('tmdb_id, media_type')
        .in('tmdb_id', tmdbIds);

      if (dnaError) {
      if (dnaError.code === 'PGRST205') {
        console.log('[DNAQueue] content_dna table not yet created - skipping DNA scan');
        return;
      }
      console.error('[DNAQueue] Error fetching existing DNA:', dnaError);
      return;
    }

      // Create set of existing DNA for fast lookup
      const existingDNASet = new Set(
        (existingDNA || []).map(dna => `${dna.media_type}-${dna.tmdb_id}`)
      );

      // Find items missing DNA (and have valid tmdb_ids)
      const missingDNA = watchlistItems.filter(item => {
        // Skip items with invalid tmdb_id
        if (!item.tmdb_id || item.tmdb_id === 'null' || isNaN(Number(item.tmdb_id))) {
          return false;
        }
        const key = `${item.media_type}-${item.tmdb_id}`;
        return !existingDNASet.has(key);
      });

      if (missingDNA.length === 0) {
        console.log('[DNAQueue] ✓ All watchlist items have DNA');
        return;
      }

      console.log(`[DNAQueue] Found ${missingDNA.length} items missing DNA, adding to queue...`);

      // Add missing items to queue
      for (const item of missingDNA) {
        await this.enqueue(item.tmdb_id, item.media_type as 'movie' | 'tv');
      }

      console.log(`[DNAQueue] ✓ Added ${missingDNA.length} items to queue`);
    } catch (error) {
      console.error('[DNAQueue] Error scanning watchlist:', error);
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const dnaComputationQueue = new DNAComputationQueue();


