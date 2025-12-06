/**
 * Recommendation Orchestrator
 * Unified coordinator for the 6-layer recommendation intelligence system
 *
 * This is the main entry point for all recommendation operations.
 * It coordinates DNA computation, taste profile building, and lane generation.
 *
 * Usage:
 *   await recommendationOrchestrator.initialize();
 *   const lanes = await recommendationOrchestrator.generateLanes(userId);
 */

import { supabase } from '@/config/supabase';
import { tmdbApi } from '@/services/tmdb';
import { contentDNAService, type ContentDNA, type UserTasteProfile } from './contentDNA';
import { recommendationLanesService, type RecommendationLane } from './recommendationLanes';
import { interestGraphService } from './interestGraph';
import { contextualRecommendationService, ContextualRecommendationService } from './contextualRecommendations';
import { llmRecommendationService } from './llmRecommendations';
import { getSmartRecommendations } from './smartRecommendations'; // Fallback
import { GLOBAL_EDGES } from '@/data/globalInterestEdges';
import { PerformanceTimer } from '@/utils/performance';

export interface OrchestratorStats {
  dnaComputations: number;
  profileUpdates: number;
  laneGenerations: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
}

export class RecommendationOrchestrator {
  private initialized = false;
  private isUpdatingProfile = false;
  private profileUpdateTimeout: NodeJS.Timeout | null = null;
  private lastProfileUpdate: Map<string, number> = new Map();
  private stats: OrchestratorStats = {
    dnaComputations: 0,
    profileUpdates: 0,
    laneGenerations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
  };

  /**
   * Initialize the recommendation system
   * Call this at app startup
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[Orchestrator] Already initialized');
      return;
    }

    console.log('[Orchestrator] Initializing recommendation system...');

    try {
      // Pre-seed global interest graph edges (if not already done)
      await this.seedGlobalGraphEdges();

      this.initialized = true;
      console.log('[Orchestrator] ✅ Initialization complete');
    } catch (error) {
      console.error('[Orchestrator] ❌ Initialization failed:', error);
      // Don't block app startup on initialization failure
      this.initialized = true; // Mark as initialized anyway
    }
  }

  /**
   * Compute and cache Content DNA for a title
   * Call this when user adds content to watchlist
   *
   * @param tmdbId - TMDb ID of the content
   * @param mediaType - 'movie' or 'tv'
   * @returns ContentDNA object (from cache or freshly computed)
   */
  async computeContentDNA(tmdbId: number, mediaType: 'movie' | 'tv'): Promise<ContentDNA | null> {
    const timer = new PerformanceTimer('Orchestrator: Compute DNA', { tmdbId, mediaType });

    try {
      // Check Supabase cache first
      const cached = await this.getDNAFromCache(tmdbId, mediaType);
      if (cached) {
        console.log(`[Orchestrator] ✅ DNA cache hit for ${mediaType} ${tmdbId}`);
        this.stats.cacheHits++;
        timer.end();
        return cached;
      }

      // Cache miss - compute DNA
      console.log(`[Orchestrator] ⚠️ DNA cache miss for ${mediaType} ${tmdbId}, computing...`);
      this.stats.cacheMisses++;

      const dna = await contentDNAService.computeDNA(tmdbId, mediaType);
      this.stats.dnaComputations++;

      // If DNA computation failed (e.g., 404), return null
      if (!dna) {
        console.warn(`[Orchestrator] ⚠️ DNA computation returned null for ${mediaType} ${tmdbId}`);
        timer.end();
        return null;
      }

      // Save to Supabase cache
      await this.saveDNAToCache(tmdbId, mediaType, dna);

      console.log(`[Orchestrator] ✅ DNA computed and cached for ${mediaType} ${tmdbId}`);
      timer.end();
      return dna;
    } catch (error) {
      timer.end();
      console.error(`[Orchestrator] ❌ Error computing DNA for ${mediaType} ${tmdbId}:`, error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Update user's taste profile
   * Call this when user rates content or periodically in background
   *
   * OPTIMIZED: Debounced and non-blocking to prevent UI freezes
   *
   * @param userId - User ID
   * @returns Updated UserTasteProfile
   */
  async updateUserProfile(userId: string): Promise<UserTasteProfile | null> {
    // Skip if already updating for this user (debounce duplicate calls)
    if (this.isUpdatingProfile) {
      console.log('[Orchestrator] ⏭️  Profile update already in progress, skipping duplicate call');
      return null;
    }

    // Throttle: Skip if updated within last 30 seconds
    const lastUpdate = this.lastProfileUpdate.get(userId) || 0;
    const timeSinceUpdate = Date.now() - lastUpdate;
    const THROTTLE_MS = 30000; // 30 seconds

    if (timeSinceUpdate < THROTTLE_MS) {
      console.log(`[Orchestrator] ⏭️  Profile updated ${Math.round(timeSinceUpdate / 1000)}s ago, throttling`);
      return null;
    }

    const timer = new PerformanceTimer('Orchestrator: Update profile', { userId });
    this.isUpdatingProfile = true;

    try {
      console.log(`[Orchestrator] Updating taste profile for user ${userId}...`);

      // Build fresh taste profile (this now includes batch fetching)
      const profile = await contentDNAService.buildUserTasteProfile(userId);
      if (!profile) {
        console.log(`[Orchestrator] ⚠️ No profile data for user ${userId}`);
        timer.end();
        return null;
      }

      this.stats.profileUpdates++;

      // Save to Supabase cache
      await this.saveProfileToCache(userId, profile);

      // Update interest graph IN BACKGROUND (don't await - run async)
      // This prevents blocking the UI for 5+ seconds
      interestGraphService.buildUserGraph(userId).then(() => {
        console.log(`[Orchestrator] ✅ Interest graph updated for user ${userId} (background)`);
      }).catch((error) => {
        console.warn(`[Orchestrator] ⚠️ Interest graph update failed:`, error);
      });

      console.log(`[Orchestrator] ✅ Profile updated for user ${userId}`);
      console.log(`[Orchestrator]    Taste Signature: ${profile.tasteSignature}`);
      console.log(`[Orchestrator]    Confidence: ${Math.round(profile.confidence * 100)}%`);
      console.log(`[Orchestrator]    Sample Size: ${profile.sampleSize} items`);
      console.log(`[Orchestrator]    ⚡ Interest graph building in background (non-blocking)`);

      // Update throttle timestamp
      this.lastProfileUpdate.set(userId, Date.now());

      timer.end();
      return profile;
    } catch (error) {
      timer.end();
      console.error(`[Orchestrator] ❌ Error updating profile for user ${userId}:`, error);
      this.stats.errors++;
      return null;
    } finally {
      this.isUpdatingProfile = false;
    }
  }

  /**
   * Generate personalized recommendation lanes
   * Call this when user opens For You tab
   *
   * @param userId - User ID
   * @param context - Optional viewing context (auto-detects if not provided)
   * @returns Array of recommendation lanes
   */
  async generateLanes(userId: string, context?: any): Promise<RecommendationLane[]> {
    const timer = new PerformanceTimer('Orchestrator: Generate lanes', { userId });

    try {
      console.log(`[Orchestrator] Generating lanes for user ${userId}...`);

      this.stats.laneGenerations++;

      // Generate lanes using Layer 3 service
      // This internally uses all 6 layers:
      // - Layer 1: DNA extraction (via DNA service)
      // - Layer 2: Taste profile building (via DNA service)
      // - Layer 3: Multi-lane generation (this service)
      // - Layer 4: LLM recommendations (optional)
      // - Layer 5: Interest graph (for explanations)
      // - Layer 6: Contextual adjustments (automatic)
      const lanes = await recommendationLanesService.generateLanes(userId, context);

      console.log(`[Orchestrator] ✅ Generated ${lanes.length} lanes for user ${userId}`);

      if (lanes.length > 0) {
        console.log(`[Orchestrator]    Top lane: "${lanes[0].title}" (${lanes[0].items.length} items)`);
      }

      timer.end();
      return lanes;
    } catch (error) {
      timer.end();
      console.error(`[Orchestrator] ❌ Error generating lanes for user ${userId}:`, error);
      this.stats.errors++;

      // FALLBACK: Use legacy smart recommendations
      console.log(`[Orchestrator] 🔄 Falling back to legacy recommendations...`);
      return this.getFallbackRecommendations(userId);
    }
  }

  /**
   * Get explanation for why content was recommended
   * Uses Layer 5 Interest Graph for human-readable explanations
   *
   * @param userId - User ID
   * @param contentId - TMDb ID of recommended content
   * @param mediaType - 'movie' or 'tv'
   * @returns Human-readable explanation string
   */
  async getExplanation(
    userId: string,
    contentId: number,
    mediaType: 'movie' | 'tv'
  ): Promise<string> {
    try {
      console.log(`[Orchestrator] Generating explanation for ${mediaType} ${contentId}...`);

      // Get user profile
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        return 'Recommended based on your viewing history';
      }

      // Get content DNA
      const dna = await this.computeContentDNA(contentId, mediaType);
      if (!dna) {
        return 'Recommended based on your viewing history';
      }

      // Get content details for better explanation
      const endpoint = mediaType === 'movie' ? '/movie' : '/tv';
      const { data } = await tmdbApi.get(`${endpoint}/${contentId}`);

      // Generate explanation using interest graph
      const explanation = interestGraphService.explainConnection(data, profile, dna);

      console.log(`[Orchestrator] ✅ Explanation generated: "${explanation}"`);
      return explanation;
    } catch (error) {
      console.error(`[Orchestrator] ❌ Error generating explanation:`, error);
      return 'Recommended based on your viewing history';
    }
  }

  /**
   * Get recommendation statistics
   */
  getStats(): OrchestratorStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      dnaComputations: 0,
      profileUpdates: 0,
      laneGenerations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
    };
    console.log('[Orchestrator] Stats reset');
  }

  /**
   * PRIVATE METHODS
   */

  /**
   * Get DNA from Supabase cache
   */
  private async getDNAFromCache(
    tmdbId: number,
    mediaType: 'movie' | 'tv'
  ): Promise<ContentDNA | null> {
    try {
      const { data, error } = await supabase
        .from('content_dna')
        .select('*')
        .eq('tmdb_id', tmdbId)
        .eq('media_type', mediaType)
        .single();

      if (error || !data) return null;

      // Convert database format to ContentDNA format
      return this.databaseToDNA(data);
    } catch (error) {
      console.warn('[Orchestrator] Error reading DNA cache:', error);
      return null;
    }
  }

  /**
   * Save DNA to Supabase cache
   */
  private async saveDNAToCache(
    tmdbId: number,
    mediaType: 'movie' | 'tv',
    dna: ContentDNA
  ): Promise<void> {
    try {
      const dbFormat = this.dnaToDatabase(tmdbId, mediaType, dna);

      const { error } = await supabase
        .from('content_dna')
        .upsert(dbFormat, {
          onConflict: 'tmdb_id,media_type',
        });

      if (error) {
        console.warn('[Orchestrator] Error saving DNA to cache:', error);
      }
    } catch (error) {
      console.warn('[Orchestrator] Error saving DNA to cache:', error);
    }
  }

  /**
   * Get user profile from cache or build fresh
   */
  private async getUserProfile(userId: string): Promise<UserTasteProfile | null> {
    try {
      // Try cache first
      const { data } = await supabase
        .from('user_taste_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        // Check if cache is fresh (< 6 hours old)
        const cacheAge = Date.now() - new Date(data.last_updated).getTime();
        const sixHours = 6 * 60 * 60 * 1000;

        if (cacheAge < sixHours) {
          console.log(`[Orchestrator] Using cached profile (age: ${Math.round(cacheAge / 1000 / 60)} min)`);
          return this.databaseToProfile(data);
        }
      }

      // Cache miss or stale - build fresh
      return await this.updateUserProfile(userId);
    } catch (error) {
      console.warn('[Orchestrator] Error getting user profile:', error);
      return await contentDNAService.buildUserTasteProfile(userId);
    }
  }

  /**
   * Save user profile to Supabase cache
   */
  private async saveProfileToCache(userId: string, profile: UserTasteProfile): Promise<void> {
    try {
      const dbFormat = this.profileToDatabase(userId, profile);

      const { error } = await supabase
        .from('user_taste_profiles')
        .upsert(dbFormat, {
          onConflict: 'user_id',
        });

      if (error) {
        console.warn('[Orchestrator] Error saving profile to cache:', error);
      }
    } catch (error) {
      console.warn('[Orchestrator] Error saving profile to cache:', error);
    }
  }

  /**
   * Fallback to legacy recommendations if intelligent system fails
   */
  private async getFallbackRecommendations(userId: string): Promise<RecommendationLane[]> {
    try {
      const smartRecs = await getSmartRecommendations(userId, 20);

      return [
        {
          id: 'fallback_for_you',
          title: 'For You',
          subtitle: 'Based on your viewing history',
          strategy: 'because_you_watched',
          items: smartRecs,
          explanation: 'Personalized recommendations based on your genre preferences',
          priority: 50,
        },
      ];
    } catch (error) {
      console.error('[Orchestrator] ❌ Fallback recommendations failed:', error);
      return [];
    }
  }

  /**
   * Seed global interest graph edges with pre-defined relationships
   */
  private async seedGlobalGraphEdges(): Promise<void> {
    try {
      // Check if already seeded
      const { count, error: checkError } = await supabase
      .from('interest_graph_edges')
      .select('*', { count: 'exact', head: true })
      .eq('is_global', true);

    // Handle missing table gracefully
    if (checkError) {
      if (checkError.code === 'PGRST205') {
        console.log('[Orchestrator] interest_graph_edges table not yet created - skipping');
        return;
      }
      console.warn('[Orchestrator] Error checking global edges:', checkError);
      return;
    }

    if (count && count > 0) {
        console.log(`[Orchestrator] Global graph edges already seeded (${count} edges)`);
        return;
      }

      console.log('[Orchestrator] Seeding global graph edges...');

      // Use comprehensive pre-defined relationships from globalInterestEdges.ts
      const edges = GLOBAL_EDGES.map(edge => ({
        from_node_type: edge.from.split('_')[0],
        from_node_id: edge.from,
        to_node_type: edge.to.split('_')[0],
        to_node_id: edge.to,
        edge_weight: edge.weight,
        relationship_type: edge.type,
        is_global: true,
        user_id: null,
      }));

      const { error } = await supabase.from('interest_graph_edges').insert(edges);

      if (error) {
        console.warn('[Orchestrator] ⚠️ Error seeding global edges:', error);
      } else {
        console.log(`[Orchestrator] ✅ Seeded ${edges.length} global graph edges`);
      }
    } catch (error) {
      console.warn('[Orchestrator] ⚠️ Error seeding global edges:', error);
    }
  }

  /**
   * Convert database format to ContentDNA
   */
  private databaseToDNA(data: any): ContentDNA {
    return {
      tmdbId: data.tmdb_id,
      mediaType: data.media_type,
      tone: {
        dark: data.tone_dark || 0,
        humorous: data.tone_humorous || 0,
        tense: data.tone_tense || 0,
        emotional: data.tone_emotional || 0,
        cerebral: data.tone_cerebral || 0,
        escapist: data.tone_escapist || 0,
      },
      themes: {
        redemption: data.theme_redemption || 0,
        revenge: data.theme_revenge || 0,
        familyDynamics: data.theme_family || 0,
        comingOfAge: data.theme_coming_of_age || 0,
        goodVsEvil: data.theme_good_vs_evil || 0,
        survival: data.theme_survival || 0,
        identity: data.theme_identity || 0,
        power: data.theme_power || 0,
        love: data.theme_love || 0,
        loss: data.theme_loss || 0,
        technology: data.theme_technology || 0,
        nature: data.theme_nature || 0,
        isolation: data.theme_isolation || 0,
        friendship: data.theme_friendship || 0,
        betrayal: data.theme_betrayal || 0,
        justice: data.theme_justice || 0,
      },
      pacing: {
        slow: data.pacing_slow || 0,
        medium: data.pacing_medium || 0,
        fast: data.pacing_fast || 0,
        episodic: 0,
        serialized: 0,
      },
      aesthetic: {
        visuallyStunning: data.aesthetic_visual || 0,
        gritty: data.aesthetic_gritty || 0,
        stylized: data.aesthetic_stylized || 0,
        animated: 0,
        practicalEffects: 0,
        cgiHeavy: 0,
      },
      narrative: {
        nonLinear: data.narrative_nonlinear || 0,
        multiPerspective: 0,
        unreliableNarrator: 0,
        twistEnding: data.narrative_twist || 0,
        openEnded: 0,
        closedEnding: 0,
      },
      talent: {
        directors: data.directors || [],
        leadActors: data.lead_actors || [],
        writers: data.writers || [],
        composers: data.composers || [],
      },
      production: {
        budget: data.production_budget || 'unknown',
        era: data.production_era || 'unknown',
        originCountry: data.origin_countries || [],
      },
      content: {
        violence: data.content_violence || 0,
        sexualContent: data.content_mature || 0,
        language: 0,
      },
      keywords: data.keywords || [],
      collections: [],
      similarTitles: data.similar_titles || [],
    };
  }

  /**
   * Convert ContentDNA to database format
   */
  private dnaToDatabase(tmdbId: number, mediaType: string, dna: ContentDNA): any {
    return {
      tmdb_id: tmdbId,
      media_type: mediaType,
      tone_dark: dna.tone.dark,
      tone_humorous: dna.tone.humorous,
      tone_tense: dna.tone.tense,
      tone_emotional: dna.tone.emotional,
      tone_cerebral: dna.tone.cerebral,
      tone_escapist: dna.tone.escapist,
      theme_redemption: dna.themes.redemption,
      theme_revenge: dna.themes.revenge,
      theme_family: dna.themes.familyDynamics,
      theme_coming_of_age: dna.themes.comingOfAge,
      theme_good_vs_evil: dna.themes.goodVsEvil,
      theme_survival: dna.themes.survival,
      theme_identity: dna.themes.identity,
      theme_power: dna.themes.power,
      theme_love: dna.themes.love,
      theme_loss: dna.themes.loss,
      theme_technology: dna.themes.technology,
      theme_nature: dna.themes.nature,
      theme_isolation: dna.themes.isolation,
      theme_friendship: dna.themes.friendship,
      theme_betrayal: dna.themes.betrayal,
      theme_justice: dna.themes.justice,
      pacing_slow: dna.pacing.slow,
      pacing_medium: dna.pacing.medium,
      pacing_fast: dna.pacing.fast,
      aesthetic_visual: dna.aesthetic.visuallyStunning,
      aesthetic_gritty: dna.aesthetic.gritty,
      aesthetic_stylized: dna.aesthetic.stylized,
      narrative_nonlinear: dna.narrative.nonLinear,
      narrative_twist: dna.narrative.twistEnding,
      content_violence: dna.content.violence,
      content_mature: dna.content.sexualContent,
      production_budget: dna.production.budget,
      production_era: dna.production.era,
      origin_countries: dna.production.originCountry,
      directors: dna.talent.directors,
      writers: dna.talent.writers,
      lead_actors: dna.talent.leadActors,
      composers: dna.talent.composers,
      keywords: dna.keywords,
      similar_titles: dna.similarTitles,
    };
  }

  /**
   * Convert database format to UserTasteProfile
   */
  private databaseToProfile(data: any): UserTasteProfile {
    return {
      userId: data.user_id,
      preferredTone: {
        dark: data.pref_tone_dark || 0,
        humorous: data.pref_tone_humorous || 0,
        tense: data.pref_tone_tense || 0,
        emotional: data.pref_tone_emotional || 0,
        cerebral: data.pref_tone_cerebral || 0,
        escapist: data.pref_tone_escapist || 0,
      },
      preferredThemes: {
        redemption: data.pref_theme_redemption || 0,
        revenge: data.pref_theme_revenge || 0,
        familyDynamics: data.pref_theme_family || 0,
        comingOfAge: data.pref_theme_coming_of_age || 0,
        goodVsEvil: data.pref_theme_good_vs_evil || 0,
        survival: data.pref_theme_survival || 0,
        identity: data.pref_theme_identity || 0,
        power: data.pref_theme_power || 0,
        love: data.pref_theme_love || 0,
        loss: data.pref_theme_loss || 0,
        technology: data.pref_theme_technology || 0,
        nature: data.pref_theme_nature || 0,
        isolation: data.pref_theme_isolation || 0,
        friendship: data.pref_theme_friendship || 0,
        betrayal: data.pref_theme_betrayal || 0,
        justice: data.pref_theme_justice || 0,
      },
      preferredPacing: {
        slow: data.pref_pacing_slow || 0,
        medium: data.pref_pacing_medium || 0,
        fast: data.pref_pacing_fast || 0,
        episodic: 0,
        serialized: 0,
      },
      preferredAesthetic: { visuallyStunning: 0, gritty: 0, stylized: 0, animated: 0, practicalEffects: 0, cgiHeavy: 0 },
      preferredNarrative: { nonLinear: 0, multiPerspective: 0, unreliableNarrator: 0, twistEnding: 0, openEnded: 0, closedEnding: 0 },
      favoriteDirectors: data.favorite_directors || [],
      favoriteActors: data.favorite_actors || [],
      favoriteWriters: [],
      favoriteDecades: data.favorite_decades || [],
      favoriteOrigins: [],
      violenceTolerance: data.violence_tolerance || 0.5,
      complexityPreference: data.complexity_preference || 0.5,
      patterns: {
        preferredLength: 'any',
        bingeVsEpisodic: 0.5,
        newVsClassic: data.new_vs_classic_ratio || 0.5,
        mainstreamVsNiche: data.mainstream_vs_niche || 0.5,
        movieVsTv: data.movie_vs_tv_ratio || 0.5,
      },
      interestClusters: [],
      avoidGenres: data.avoid_genres || [],
      avoidKeywords: data.avoid_keywords || [],
      avoidThemes: [],
      explorationScore: data.exploration_score || 0.5,
      timeBasedPreferences: {
        weekdayEvening: [],
        weekendAfternoon: [],
        lateNight: [],
      },
      tasteSignature: data.taste_signature || 'Eclectic Viewer',
      discoveryOpportunities: data.discovery_opportunities || [],
      confidence: 0.5,
      sampleSize: data.content_count || 0,
      lastUpdated: new Date(data.last_updated),
    };
  }

  /**
   * Convert UserTasteProfile to database format
   */
  private profileToDatabase(userId: string, profile: UserTasteProfile): any {
    return {
      user_id: userId,
      pref_tone_dark: profile.preferredTone.dark,
      pref_tone_humorous: profile.preferredTone.humorous,
      pref_tone_tense: profile.preferredTone.tense,
      pref_tone_emotional: profile.preferredTone.emotional,
      pref_tone_cerebral: profile.preferredTone.cerebral,
      pref_tone_escapist: profile.preferredTone.escapist,
      pref_theme_redemption: profile.preferredThemes.redemption,
      pref_theme_revenge: profile.preferredThemes.revenge,
      pref_theme_family: profile.preferredThemes.familyDynamics,
      pref_theme_coming_of_age: profile.preferredThemes.comingOfAge,
      pref_theme_good_vs_evil: profile.preferredThemes.goodVsEvil,
      pref_theme_survival: profile.preferredThemes.survival,
      pref_theme_identity: profile.preferredThemes.identity,
      pref_theme_power: profile.preferredThemes.power,
      pref_theme_love: profile.preferredThemes.love,
      pref_theme_loss: profile.preferredThemes.loss,
      pref_theme_technology: profile.preferredThemes.technology,
      pref_theme_nature: profile.preferredThemes.nature,
      pref_theme_isolation: profile.preferredThemes.isolation,
      pref_theme_friendship: profile.preferredThemes.friendship,
      pref_theme_betrayal: profile.preferredThemes.betrayal,
      pref_theme_justice: profile.preferredThemes.justice,
      pref_pacing_slow: profile.preferredPacing.slow,
      pref_pacing_medium: profile.preferredPacing.medium,
      pref_pacing_fast: profile.preferredPacing.fast,
      exploration_score: profile.explorationScore,
      violence_tolerance: profile.violenceTolerance,
      complexity_preference: profile.complexityPreference,
      movie_vs_tv_ratio: profile.patterns.movieVsTv,
      new_vs_classic_ratio: profile.patterns.newVsClassic,
      mainstream_vs_niche: profile.patterns.mainstreamVsNiche,
      favorite_directors: profile.favoriteDirectors,
      favorite_actors: profile.favoriteActors,
      favorite_decades: profile.favoriteDecades,
      taste_signature: profile.tasteSignature,
      discovery_opportunities: profile.discoveryOpportunities,
      avoid_genres: profile.avoidGenres,
      avoid_keywords: profile.avoidKeywords,
      content_count: profile.sampleSize,
      last_updated: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const recommendationOrchestrator = new RecommendationOrchestrator();


