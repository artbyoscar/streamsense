/**
 * Interest Graph Service
 * Layer 5: Maps how interests connect to enable powerful discovery
 *
 * Builds a graph of user's interests (genres, themes, directors, actors, etc.)
 * and finds connections between them to:
 * - Discover "bridge content" that connects different interests
 * - Suggest new interests based on existing preferences
 * - Generate explanations for recommendations
 * - Find hidden patterns in viewing preferences
 */

import { supabase } from '@/config/supabase';
import { tmdbApi } from '@/services/tmdb';
import { contentDNAService, type ContentDNA, type UserTasteProfile } from './contentDNA';

export interface InterestNode {
  id: string;
  type: 'genre' | 'theme' | 'director' | 'actor' | 'keyword' | 'franchise' | 'tone';
  name: string;
  userStrength: number; // 0-1 score for how much user likes this
  count?: number; // Number of times this appears in user's watched content
}

export interface InterestEdge {
  from: string;
  to: string;
  weight: number; // Connection strength (0-1)
  relationship: 'often_together' | 'same_director' | 'thematic_link' | 'talent_connection' | 'franchise';
  coOccurrenceCount?: number; // How many times these appeared together
}

export interface BridgeRecommendation {
  content: any;
  fromInterest: string;
  toInterest: string;
  bridgeStrength: number;
  explanation: string;
}

export interface InterestSuggestion {
  node: InterestNode;
  suggestedScore: number;
  connectedVia: string[]; // Which existing interests connect to this
  reason: string;
}

export class InterestGraphService {
  private nodes: Map<string, InterestNode> = new Map();
  private edges: InterestEdge[] = [];

  /**
   * Build the interest graph for a user
   */
  async buildUserGraph(userId: string): Promise<void> {
    console.log('[InterestGraph] Building interest graph for user:', userId);

    // Clear existing graph
    this.nodes.clear();
    this.edges = [];

    // Get user's watched content
    const { data: watchedItems, error } = await supabase
      .from('watchlist_items')
      .select('tmdb_id, media_type, status, rating, created_at')
      .eq('user_id', userId)
      .in('status', ['watched', 'watching'])
      .not('tmdb_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error || !watchedItems || watchedItems.length === 0) {
      console.log('[InterestGraph] No watched items found');
      return;
    }

    console.log(`[InterestGraph] Processing ${watchedItems.length} watched items...`);

    // Build nodes from watched content
    const dnaMap = new Map<number, ContentDNA>();

    for (const item of watchedItems) {
      try {
        const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
        const dna = await contentDNAService.computeDNA(item.tmdb_id, mediaType);
        dnaMap.set(item.tmdb_id, dna);

        // Fetch TMDb details for genres, keywords, etc.
        const endpoint = mediaType === 'movie' ? '/movie' : '/tv';
        const { data: details } = await tmdbApi.get(`${endpoint}/${item.tmdb_id}`, {
          params: { append_to_response: 'keywords' },
        });

        if (!details) continue;

        const rating = item.rating || 3; // Default to neutral if no rating

        // Add genre nodes
        for (const genre of details.genres || []) {
          this.addOrUpdateNode({
            id: `genre_${genre.id}`,
            type: 'genre',
            name: genre.name,
            userStrength: rating / 5,
          });
        }

        // Add theme nodes (from DNA)
        for (const [theme, strength] of Object.entries(dna.themes)) {
          if (strength > 0.3) {
            this.addOrUpdateNode({
              id: `theme_${theme}`,
              type: 'theme',
              name: theme,
              userStrength: strength * (rating / 5),
            });
          }
        }

        // Add tone nodes (from DNA)
        for (const [tone, strength] of Object.entries(dna.tone)) {
          if (strength > 0.3) {
            this.addOrUpdateNode({
              id: `tone_${tone}`,
              type: 'tone',
              name: tone,
              userStrength: strength * (rating / 5),
            });
          }
        }

        // Add director nodes
        for (const director of dna.talent.directors) {
          this.addOrUpdateNode({
            id: `director_${director.replace(/\s+/g, '_').toLowerCase()}`,
            type: 'director',
            name: director,
            userStrength: rating / 5,
          });
        }

        // Add actor nodes
        for (const actor of dna.talent.leadActors.slice(0, 3)) {
          this.addOrUpdateNode({
            id: `actor_${actor.replace(/\s+/g, '_').toLowerCase()}`,
            type: 'actor',
            name: actor,
            userStrength: rating / 5,
          });
        }

        // Add keyword nodes
        const keywords = details.keywords?.keywords || details.keywords?.results || [];
        for (const keyword of keywords.slice(0, 5)) {
          this.addOrUpdateNode({
            id: `keyword_${keyword.id}`,
            type: 'keyword',
            name: keyword.name,
            userStrength: rating / 5,
          });
        }

        // Add franchise nodes
        if (details.belongs_to_collection) {
          this.addOrUpdateNode({
            id: `franchise_${details.belongs_to_collection.id}`,
            type: 'franchise',
            name: details.belongs_to_collection.name,
            userStrength: rating / 5,
          });
        }
      } catch (error) {
        console.warn(`[InterestGraph] Failed to process item ${item.tmdb_id}:`, error);
      }
    }

    console.log(`[InterestGraph] Built ${this.nodes.size} interest nodes`);

    // Build edges based on co-occurrence
    await this.buildEdgesFromCoOccurrence(watchedItems, dnaMap);

    // Add known thematic relationships
    this.addThematicEdges();

    console.log(`[InterestGraph] Built ${this.edges.length} interest edges`);
  }

  /**
   * Find bridge content that connects two interests
   */
  async findBridgeContent(
    fromInterest: string,
    toInterest: string,
    limit: number = 10
  ): Promise<BridgeRecommendation[]> {
    console.log(`[InterestGraph] Finding bridge content: ${fromInterest} -> ${toInterest}`);

    const fromNode = this.nodes.get(fromInterest);
    const toNode = this.nodes.get(toInterest);

    if (!fromNode || !toNode) {
      console.warn('[InterestGraph] One or both interests not found in graph');
      return [];
    }

    // Build search params based on node types
    const searchParams: any = {
      sort_by: 'vote_average.desc',
      'vote_count.gte': 500,
      'vote_average.gte': 7.0,
    };

    // Add genre filters
    const genreIds: number[] = [];
    if (fromNode.type === 'genre') genreIds.push(parseInt(fromNode.id.replace('genre_', '')));
    if (toNode.type === 'genre') genreIds.push(parseInt(toNode.id.replace('genre_', '')));

    if (genreIds.length > 0) {
      searchParams.with_genres = genreIds.join(','); // AND operation
    }

    // Add keyword filters
    const keywordIds: number[] = [];
    if (fromNode.type === 'keyword') keywordIds.push(parseInt(fromNode.id.replace('keyword_', '')));
    if (toNode.type === 'keyword') keywordIds.push(parseInt(toNode.id.replace('keyword_', '')));

    if (keywordIds.length > 0) {
      searchParams.with_keywords = keywordIds.join(',');
    }

    try {
      const { data } = await tmdbApi.get('/discover/movie', { params: searchParams });

      const recommendations: BridgeRecommendation[] = (data?.results || [])
        .slice(0, limit)
        .map((content: any) => ({
          content,
          fromInterest,
          toInterest,
          bridgeStrength: (fromNode.userStrength + toNode.userStrength) / 2,
          explanation: `Bridges your interest in ${fromNode.name} and ${toNode.name}`,
        }));

      console.log(`[InterestGraph] Found ${recommendations.length} bridge recommendations`);
      return recommendations;
    } catch (error) {
      console.error('[InterestGraph] Error finding bridge content:', error);
      return [];
    }
  }

  /**
   * Suggest new interests based on graph connections
   */
  suggestNewInterests(currentInterests: string[], limit: number = 10): InterestSuggestion[] {
    console.log('[InterestGraph] Suggesting new interests from:', currentInterests);

    const suggestions: Map<string, { score: number; connectedVia: Set<string> }> = new Map();

    for (const interest of currentInterests) {
      // Find all nodes connected to this interest
      const connectedEdges = this.edges.filter(
        e => e.from === interest || e.to === interest
      );

      for (const edge of connectedEdges) {
        const connectedNodeId = edge.from === interest ? edge.to : edge.from;

        // Skip if already in user's current interests
        if (currentInterests.includes(connectedNodeId)) continue;

        const current = suggestions.get(connectedNodeId) || { score: 0, connectedVia: new Set() };
        current.score += edge.weight;
        current.connectedVia.add(interest);

        suggestions.set(connectedNodeId, current);
      }
    }

    // Convert to suggestions with explanations
    const results: InterestSuggestion[] = [];

    for (const [nodeId, data] of suggestions.entries()) {
      const node = this.nodes.get(nodeId);
      if (!node) continue;

      const connectedNames = Array.from(data.connectedVia)
        .map(id => this.nodes.get(id)?.name || id)
        .join(', ');

      results.push({
        node,
        suggestedScore: data.score,
        connectedVia: Array.from(data.connectedVia),
        reason: `Connected to your interests in ${connectedNames}`,
      });
    }

    return results
      .sort((a, b) => b.suggestedScore - a.suggestedScore)
      .slice(0, limit);
  }

  /**
   * Generate explanation for why content is recommended
   */
  explainConnection(
    content: any,
    userProfile: UserTasteProfile,
    contentDNA: ContentDNA
  ): string {
    const connections: string[] = [];

    // Check director connection
    for (const director of contentDNA.talent.directors) {
      const favDirector = userProfile.favoriteDirectors.find(fd => fd.name === director);
      if (favDirector && favDirector.score > 0.2) {
        connections.push(`From ${director}, a director you love`);
        break; // Only mention one director
      }
    }

    // Check actor connection
    for (const actor of contentDNA.talent.leadActors.slice(0, 2)) {
      const favActor = userProfile.favoriteActors.find(fa => fa.name === actor);
      if (favActor && favActor.score > 0.2) {
        connections.push(`Stars ${actor}, an actor you enjoy`);
        break;
      }
    }

    // Check cluster connection
    for (const cluster of userProfile.interestClusters) {
      // Simple heuristic: check if content themes/tones match cluster
      const clusterNode = this.nodes.get(`cluster_${cluster.name.replace(/\s+/g, '_').toLowerCase()}`);
      if (clusterNode) {
        connections.push(`Matches your "${cluster.name}" interest`);
        break;
      }
    }

    // Check theme connection
    const dominantThemes = Object.entries(contentDNA.themes)
      .filter(([_, strength]) => strength > 0.4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    for (const [theme, strength] of dominantThemes) {
      const userThemeStrength = userProfile.preferredThemes[theme as keyof typeof userProfile.preferredThemes];
      if (userThemeStrength > 0.3) {
        const themeName = theme.replace(/([A-Z])/g, ' $1').trim();
        connections.push(`Strong ${themeName} themes you appreciate`);
        break;
      }
    }

    // Check tone connection
    const dominantTone = Object.entries(contentDNA.tone)
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantTone && dominantTone[1] > 0.4) {
      const userToneStrength = userProfile.preferredTone[dominantTone[0] as keyof typeof userProfile.preferredTone];
      if (userToneStrength > 0.3) {
        const toneLabels: Record<string, string> = {
          dark: 'Dark',
          humorous: 'Funny',
          tense: 'Suspenseful',
          emotional: 'Emotional',
          cerebral: 'Thought-provoking',
          escapist: 'Adventurous',
        };
        connections.push(`${toneLabels[dominantTone[0]] || dominantTone[0]} tone you prefer`);
      }
    }

    return connections.slice(0, 3).join(' • ') || 'Based on your overall taste profile';
  }

  /**
   * Get the interest graph summary
   */
  getGraphSummary(): {
    nodeCount: number;
    edgeCount: number;
    topInterests: InterestNode[];
    strongestConnections: InterestEdge[];
  } {
    // Get top 10 interests by user strength
    const topInterests = Array.from(this.nodes.values())
      .sort((a, b) => b.userStrength - a.userStrength)
      .slice(0, 10);

    // Get top 10 strongest connections
    const strongestConnections = this.edges
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.length,
      topInterests,
      strongestConnections,
    };
  }

  /**
   * Export graph for visualization
   */
  exportGraph(): { nodes: InterestNode[]; edges: InterestEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  /**
   * Private helper methods
   */

  private addOrUpdateNode(node: Omit<InterestNode, 'count'>): void {
    const existing = this.nodes.get(node.id);

    if (existing) {
      // Update existing node - average the strengths
      existing.userStrength = (existing.userStrength + node.userStrength) / 2;
      existing.count = (existing.count || 1) + 1;
    } else {
      // Add new node
      this.nodes.set(node.id, { ...node, count: 1 });
    }
  }

  private async buildEdgesFromCoOccurrence(
    watchedItems: any[],
    dnaMap: Map<number, ContentDNA>
  ): Promise<void> {
    // Build co-occurrence matrix
    const coOccurrence: Map<string, Map<string, number>> = new Map();

    for (const item of watchedItems) {
      const dna = dnaMap.get(item.tmdb_id);
      if (!dna) continue;

      // Get all interests for this item
      const itemInterests: string[] = [];

      // Add genre interests
      const endpoint = item.media_type === 'tv' ? '/tv' : '/movie';
      try {
        const { data: details } = await tmdbApi.get(`${endpoint}/${item.tmdb_id}`);
        if (details?.genres) {
          for (const genre of details.genres) {
            itemInterests.push(`genre_${genre.id}`);
          }
        }
      } catch (error) {
        // Skip if details can't be fetched
      }

      // Add theme interests
      for (const [theme, strength] of Object.entries(dna.themes)) {
        if (strength > 0.3) {
          itemInterests.push(`theme_${theme}`);
        }
      }

      // Add tone interests
      for (const [tone, strength] of Object.entries(dna.tone)) {
        if (strength > 0.3) {
          itemInterests.push(`tone_${tone}`);
        }
      }

      // Record co-occurrences
      for (let i = 0; i < itemInterests.length; i++) {
        for (let j = i + 1; j < itemInterests.length; j++) {
          const from = itemInterests[i];
          const to = itemInterests[j];

          if (!coOccurrence.has(from)) {
            coOccurrence.set(from, new Map());
          }

          const fromMap = coOccurrence.get(from)!;
          fromMap.set(to, (fromMap.get(to) || 0) + 1);
        }
      }
    }

    // Convert co-occurrence to edges
    for (const [from, toMap] of coOccurrence.entries()) {
      for (const [to, count] of toMap.entries()) {
        // Only add edge if co-occurrence is significant (appeared together at least 2 times)
        if (count >= 2) {
          this.edges.push({
            from,
            to,
            weight: Math.min(1, count / 5), // Normalize to 0-1
            relationship: 'often_together',
            coOccurrenceCount: count,
          });
        }
      }
    }
  }

  private addThematicEdges(): void {
    // Pre-defined thematic relationships based on domain knowledge
    const relationships: Omit<InterestEdge, 'coOccurrenceCount'>[] = [
      // Genre bridges
      { from: 'genre_878', to: 'genre_14', weight: 0.7, relationship: 'thematic_link' }, // Sci-Fi <-> Fantasy
      { from: 'genre_28', to: 'genre_53', weight: 0.8, relationship: 'often_together' }, // Action <-> Thriller
      { from: 'genre_18', to: 'genre_10749', weight: 0.6, relationship: 'often_together' }, // Drama <-> Romance
      { from: 'genre_80', to: 'genre_53', weight: 0.9, relationship: 'thematic_link' }, // Crime <-> Thriller
      { from: 'genre_12', to: 'genre_14', weight: 0.7, relationship: 'often_together' }, // Adventure <-> Fantasy
      { from: 'genre_27', to: 'genre_53', weight: 0.8, relationship: 'thematic_link' }, // Horror <-> Thriller

      // Theme bridges
      { from: 'theme_technology', to: 'theme_identity', weight: 0.7, relationship: 'thematic_link' },
      { from: 'theme_power', to: 'theme_betrayal', weight: 0.8, relationship: 'thematic_link' },
      { from: 'theme_familyDynamics', to: 'theme_comingOfAge', weight: 0.7, relationship: 'thematic_link' },
      { from: 'theme_survival', to: 'theme_isolation', weight: 0.8, relationship: 'thematic_link' },
      { from: 'theme_technology', to: 'theme_power', weight: 0.6, relationship: 'thematic_link' },
      { from: 'theme_love', to: 'theme_loss', weight: 0.7, relationship: 'thematic_link' },
      { from: 'theme_goodVsEvil', to: 'theme_redemption', weight: 0.6, relationship: 'thematic_link' },
      { from: 'theme_justice', to: 'theme_betrayal', weight: 0.7, relationship: 'thematic_link' },

      // Tone bridges
      { from: 'tone_cerebral', to: 'theme_identity', weight: 0.6, relationship: 'thematic_link' },
      { from: 'tone_dark', to: 'theme_betrayal', weight: 0.7, relationship: 'thematic_link' },
      { from: 'tone_emotional', to: 'theme_loss', weight: 0.7, relationship: 'thematic_link' },
      { from: 'tone_tense', to: 'theme_survival', weight: 0.8, relationship: 'thematic_link' },
      { from: 'tone_escapist', to: 'theme_goodVsEvil', weight: 0.6, relationship: 'thematic_link' },

      // Cross-dimension bridges (tone <-> genre)
      { from: 'tone_dark', to: 'genre_27', weight: 0.8, relationship: 'thematic_link' }, // Dark <-> Horror
      { from: 'tone_cerebral', to: 'genre_878', weight: 0.7, relationship: 'thematic_link' }, // Cerebral <-> Sci-Fi
      { from: 'tone_humorous', to: 'genre_35', weight: 0.9, relationship: 'thematic_link' }, // Humorous <-> Comedy
      { from: 'tone_tense', to: 'genre_53', weight: 0.8, relationship: 'thematic_link' }, // Tense <-> Thriller
    ];

    this.edges.push(...relationships);
  }
}

// Export singleton instance
export const interestGraphService = new InterestGraphService();
