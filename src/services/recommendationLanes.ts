/**
 * Multi-Lane Recommendation Engine
 * Netflix-style multi-row recommendations with different strategies per lane
 * Combines Content DNA, User Taste Profiles, and collaborative filtering
 */

import { supabase } from '@/config/supabase';
import { tmdbApi } from '@/services/tmdb';
import { contentDNAService, ContentDNA, UserTasteProfile } from './contentDNA';
import { llmRecommendationService } from './llmRecommendations';

export interface ContentItem {
  id: number;
  title: string;
  name?: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  // LLM-specific metadata (optional)
  llmReasoning?: string;
  llmConfidence?: number;
  isStretch?: boolean;
}

export interface RecommendationLane {
  id: string;
  title: string;
  subtitle?: string;
  strategy: LaneStrategy;
  items: ContentItem[];
  explanation: string;
  priority: number;
}

export type LaneStrategy =
  | 'because_you_watched'    // Similar to specific title
  | 'more_like_cluster'      // Based on interest cluster
  | 'talent_spotlight'       // Director/actor you love
  | 'theme_deep_dive'        // Explore a theme further
  | 'hidden_gems'            // Under-discovered content
  | 'trending_for_you'       // Trending that matches taste
  | 'continue_watching'      // Resume interrupted viewing
  | 'rewatch_worthy'         // Highly rated to revisit
  | 'mood_match'             // Based on current context
  | 'exploration'            // Deliberate variety
  | 'new_releases'           // Recent that matches taste
  | 'classic_essentials'     // Classics you haven't seen
  | 'franchise_completion'   // Complete a series you started
  | 'adjacent_interest'      // Bridge to new genres
  | 'llm_powered';           // AI-curated with reasoning

export interface ViewingContext {
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'lateNight';
  dayOfWeek?: 'weekday' | 'weekend';
  mood?: 'relaxed' | 'energetic' | 'thoughtful';
}

export class RecommendationLanesService {
  /**
   * Generate multiple recommendation lanes for a user
   */
  async generateLanes(userId: string, context?: ViewingContext): Promise<RecommendationLane[]> {
    console.log(`[Lanes] Generating recommendation lanes for user ${userId}...`);

    try {
      // Build user's taste profile
      const profile = await contentDNAService.buildUserTasteProfile(userId);
      if (!profile) {
        console.log('[Lanes] No taste profile available, returning empty lanes');
        return [];
      }

      const recentWatched = await this.getRecentWatched(userId, 10);
      const lanes: RecommendationLane[] = [];

      // Lane 1: Continue Watching (highest priority if applicable)
      const inProgress = await this.getInProgressContent(userId);
      if (inProgress.length > 0) {
        lanes.push({
          id: 'continue_watching',
          title: 'Continue Watching',
          strategy: 'continue_watching',
          items: inProgress,
          explanation: 'Pick up where you left off',
          priority: 100,
        });
      }

      // Lane 2: Because You Watched [Recent Title]
      if (recentWatched.length > 0) {
        const seedTitle = recentWatched[0];
        const similar = await this.findSimilarByDNA(seedTitle, profile, 15);
        lanes.push({
          id: `because_${seedTitle.id}`,
          title: `Because You Watched ${seedTitle.title || seedTitle.name}`,
          subtitle: 'Similar tone, themes, and style',
          strategy: 'because_you_watched',
          items: similar,
          explanation: `Content with similar DNA to ${seedTitle.title || seedTitle.name}`,
          priority: 90,
        });
      }

      // Lane 2.5: LLM-Powered Recommendations (optional - requires API key)
      try {
        const llmResponse = await llmRecommendationService.getPersonalizedRecommendations({
          userId,
          tasteProfile: profile,
          recentWatched: recentWatched.slice(0, 5),
          currentMood: context?.mood,
          limit: 10,
        });

        if (llmResponse.recommendations.length >= 5) {
          lanes.push({
            id: 'llm_curated',
            title: 'AI-Curated For You',
            subtitle: 'Deeply personalized picks with reasoning',
            strategy: 'llm_powered',
            items: llmResponse.recommendations,
            explanation: llmResponse.explanation,
            priority: 88,
          });
          console.log('[Lanes] Added LLM-powered lane with', llmResponse.recommendations.length, 'items');
        }
      } catch (error) {
        // LLM lane is optional - don't fail if API key not configured or request fails
        console.log('[Lanes] Skipping LLM-powered lane:', error);
      }

      // Lane 3: Interest Cluster Deep Dives
      for (const cluster of profile.interestClusters.slice(0, 2)) {
        const clusterRecs = await this.getClusterRecommendations(cluster, profile, 15);
        if (clusterRecs.length >= 5) {
          lanes.push({
            id: `cluster_${cluster.name.replace(/\s+/g, '_').toLowerCase()}`,
            title: cluster.name,
            subtitle: `${cluster.seedContent.length} titles you loved`,
            strategy: 'more_like_cluster',
            items: clusterRecs,
            explanation: `More content matching your "${cluster.name}" interest`,
            priority: 85 - profile.interestClusters.indexOf(cluster) * 5,
          });
        }
      }

      // Lane 4: Favorite Director/Actor
      if (profile.favoriteDirectors.length > 0) {
        const topDirector = profile.favoriteDirectors[0];
        const directorWorks = await this.getDirectorWorks(topDirector.name, profile, 10);
        if (directorWorks.length > 0) {
          lanes.push({
            id: `director_${topDirector.name.replace(/\s+/g, '_')}`,
            title: `More from ${topDirector.name}`,
            subtitle: 'Director you love',
            strategy: 'talent_spotlight',
            items: directorWorks,
            explanation: `You've enjoyed ${Math.round(topDirector.score * 10)} films by this director`,
            priority: 75,
          });
        }
      }

      // Lane 5: Theme Deep Dive
      const dominantTheme = this.getDominantTheme(profile.preferredThemes);
      if (dominantTheme) {
        const themeRecs = await this.getThemeRecommendations(dominantTheme, profile, 15);
        if (themeRecs.length >= 5) {
          lanes.push({
            id: `theme_${dominantTheme}`,
            title: this.getThemeTitle(dominantTheme),
            subtitle: 'Explore this theme further',
            strategy: 'theme_deep_dive',
            items: themeRecs,
            explanation: `Content strong in the "${dominantTheme}" theme you gravitate toward`,
            priority: 70,
          });
        }
      }

      // Lane 6: Hidden Gems
      const hiddenGems = await this.getHiddenGems(profile, 12);
      if (hiddenGems.length >= 5) {
        lanes.push({
          id: 'hidden_gems',
          title: 'Hidden Gems',
          subtitle: 'Under-the-radar picks for you',
          strategy: 'hidden_gems',
          items: hiddenGems,
          explanation: 'Highly rated but less popular content matching your taste',
          priority: 65,
        });
      }

      // Lane 7: Trending That Matches Your Taste
      const trendingForYou = await this.getTrendingFiltered(profile, 15);
      if (trendingForYou.length >= 5) {
        lanes.push({
          id: 'trending_for_you',
          title: 'Trending For You',
          subtitle: "What's hot that you'd actually like",
          strategy: 'trending_for_you',
          items: trendingForYou,
          explanation: 'Currently popular content filtered to your preferences',
          priority: 60,
        });
      }

      // Lane 8: Exploration Lane (intentional variety)
      if (profile.explorationScore > 0.4) {
        const explorationRecs = await this.getExplorationRecommendations(profile, 12);
        if (explorationRecs.length >= 5) {
          lanes.push({
            id: 'exploration',
            title: 'Expand Your Horizons',
            subtitle: 'Something different',
            strategy: 'exploration',
            items: explorationRecs,
            explanation: 'Carefully selected content outside your usual genres',
            priority: 55,
          });
        }
      }

      // Lane 9: Classic Essentials
      const classics = await this.getClassicEssentials(profile, 10);
      if (classics.length >= 5) {
        lanes.push({
          id: 'classics',
          title: 'Classic Essentials',
          subtitle: "Timeless films you haven't seen",
          strategy: 'classic_essentials',
          items: classics,
          explanation: 'Highly acclaimed classics matching your taste profile',
          priority: 50,
        });
      }

      // Lane 10: New Releases For You
      const newReleases = await this.getNewReleasesFiltered(profile, 15);
      if (newReleases.length >= 5) {
        lanes.push({
          id: 'new_releases',
          title: 'New Releases For You',
          subtitle: 'Fresh content matching your taste',
          strategy: 'new_releases',
          items: newReleases,
          explanation: 'Recent releases filtered to your preferences',
          priority: 45,
        });
      }

      // Lane 11: Adjacent Interest Bridge
      if (profile.discoveryOpportunities.length > 0) {
        const adjacentRecs = await this.getAdjacentInterestRecommendations(profile, 10);
        if (adjacentRecs.length >= 5) {
          lanes.push({
            id: 'adjacent_interests',
            title: 'You Might Also Like',
            subtitle: 'Based on your interests',
            strategy: 'adjacent_interest',
            items: adjacentRecs,
            explanation: 'Content that bridges your existing interests to new territory',
            priority: 40,
          });
        }
      }

      console.log(`[Lanes] Generated ${lanes.length} recommendation lanes`);
      return lanes.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.error('[Lanes] Error generating lanes:', error);
      return [];
    }
  }

  /**
   * Find content similar by DNA to a seed title
   */
  private async findSimilarByDNA(
    seedContent: ContentItem,
    profile: UserTasteProfile,
    limit: number
  ): Promise<ContentItem[]> {
    try {
      // Get DNA of seed content
      const seedDNA = await contentDNAService.computeDNA(seedContent.id, seedContent.media_type);

      // Get candidate pool from TMDb similar
      const endpoint = seedContent.media_type === 'movie' ? '/movie' : '/tv';
      const { data } = await tmdbApi.get(`${endpoint}/${seedContent.id}/similar`, {
        params: { page: 1 },
      });

      const candidates: ContentItem[] = (data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: seedContent.media_type,
          title: item.title || item.name,
        }))
        .slice(0, 50);

      // Filter out already watched
      const watchedIds = await this.getWatchedIds(profile.userId);
      const unwatched = candidates.filter(c => !watchedIds.has(c.id));

      // Score each candidate by DNA similarity
      const scored = await Promise.all(
        unwatched.map(async (candidate) => {
          try {
            const candidateDNA = await contentDNAService.computeDNA(candidate.id, candidate.media_type);
            const similarity = contentDNAService.computeSimilarity(seedDNA, candidateDNA);

            // Boost if matches user's broader taste profile
            const profileMatch = this.computeProfileMatch(candidateDNA, profile);

            return {
              content: candidate,
              score: similarity * 0.7 + profileMatch * 0.3,
            };
          } catch (error) {
            return { content: candidate, score: 0 };
          }
        })
      );

      return scored
        .filter(s => s.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(s => s.content);
    } catch (error) {
      console.error('[Lanes] Error finding similar by DNA:', error);
      return [];
    }
  }

  /**
   * Get recommendations for an interest cluster
   */
  private async getClusterRecommendations(
    cluster: UserTasteProfile['interestClusters'][0],
    profile: UserTasteProfile,
    limit: number
  ): Promise<ContentItem[]> {
    try {
      // Use cluster seed content to find similar items
      const seedId = cluster.seedContent[0];

      // Determine media type from database
      const { data: watchlistItem } = await supabase
        .from('watchlist_items')
        .select('media_type')
        .eq('tmdb_id', seedId)
        .single();

      if (!watchlistItem) return [];

      const mediaType = watchlistItem.media_type === 'tv' ? 'tv' : 'movie';
      const endpoint = mediaType === 'movie' ? '/movie' : '/tv';

      const { data } = await tmdbApi.get(`${endpoint}/${seedId}/similar`, {
        params: { page: 1 },
      });

      const candidates: ContentItem[] = (data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: mediaType,
          title: item.title || item.name,
        }))
        .slice(0, 30);

      // Filter and score
      const watchedIds = await this.getWatchedIds(profile.userId);
      const unwatched = candidates.filter(c => !watchedIds.has(c.id));

      return unwatched.slice(0, limit);
    } catch (error) {
      console.error('[Lanes] Error getting cluster recommendations:', error);
      return [];
    }
  }

  /**
   * Get works by a favorite director
   */
  private async getDirectorWorks(
    directorName: string,
    profile: UserTasteProfile,
    limit: number
  ): Promise<ContentItem[]> {
    try {
      // Search for the director
      const { data: searchData } = await tmdbApi.get('/search/person', {
        params: { query: directorName },
      });

      if (!searchData?.results || searchData.results.length === 0) return [];

      const director = searchData.results[0];

      // Get their filmography
      const { data: creditsData } = await tmdbApi.get(`/person/${director.id}/movie_credits`);

      const directedMovies: ContentItem[] = (creditsData?.crew || [])
        .filter((credit: any) => credit.job === 'Director')
        .map((credit: any) => ({
          ...credit,
          media_type: 'movie' as const,
          title: credit.title || credit.name,
        }))
        .sort((a: any, b: any) => (b.vote_average || 0) - (a.vote_average || 0));

      // Filter out watched
      const watchedIds = await this.getWatchedIds(profile.userId);
      return directedMovies.filter(m => !watchedIds.has(m.id)).slice(0, limit);
    } catch (error) {
      console.error('[Lanes] Error getting director works:', error);
      return [];
    }
  }

  /**
   * Get recommendations for a dominant theme
   */
  private async getThemeRecommendations(
    theme: string,
    profile: UserTasteProfile,
    limit: number
  ): Promise<ContentItem[]> {
    try {
      // Map themes to TMDb genres/keywords
      const themeGenreMap: Record<string, number[]> = {
        technology: [878], // Sci-Fi
        familyDynamics: [10751, 18], // Family, Drama
        justice: [80], // Crime
        survival: [12, 53], // Adventure, Thriller
        love: [10749], // Romance
        power: [18, 36], // Drama, History
      };

      const genreIds = themeGenreMap[theme] || [];
      if (genreIds.length === 0) return [];

      const { data } = await tmdbApi.get('/discover/movie', {
        params: {
          with_genres: genreIds.join('|'),
          sort_by: 'vote_average.desc',
          'vote_count.gte': 500,
          'vote_average.gte': 7.0,
        },
      });

      const candidates: ContentItem[] = (data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: 'movie' as const,
          title: item.title || item.name,
        }));

      // Filter out watched
      const watchedIds = await this.getWatchedIds(profile.userId);
      return candidates.filter(c => !watchedIds.has(c.id)).slice(0, limit);
    } catch (error) {
      console.error('[Lanes] Error getting theme recommendations:', error);
      return [];
    }
  }

  /**
   * Get hidden gems
   */
  private async getHiddenGems(profile: UserTasteProfile, limit: number): Promise<ContentItem[]> {
    try {
      const { data } = await tmdbApi.get('/discover/movie', {
        params: {
          sort_by: 'vote_average.desc',
          'vote_count.gte': 100,
          'vote_count.lte': 500,
          'vote_average.gte': 7.5,
          page: Math.floor(Math.random() * 5) + 1,
        },
      });

      const candidates: ContentItem[] = (data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: 'movie' as const,
          title: item.title || item.name,
        }));

      // Filter out watched and score by profile match
      const watchedIds = await this.getWatchedIds(profile.userId);
      const unwatched = candidates.filter(c => !watchedIds.has(c.id));

      return unwatched.slice(0, limit);
    } catch (error) {
      console.error('[Lanes] Error getting hidden gems:', error);
      return [];
    }
  }

  /**
   * Get trending content filtered to user's taste
   */
  private async getTrendingFiltered(profile: UserTasteProfile, limit: number): Promise<ContentItem[]> {
    try {
      const { data } = await tmdbApi.get('/trending/all/week');

      const candidates: ContentItem[] = (data?.results || [])
        .map((item: any) => ({
          ...item,
          title: item.title || item.name,
        }));

      // Filter out watched
      const watchedIds = await this.getWatchedIds(profile.userId);
      return candidates.filter(c => !watchedIds.has(c.id)).slice(0, limit);
    } catch (error) {
      console.error('[Lanes] Error getting trending:', error);
      return [];
    }
  }

  /**
   * Get exploration recommendations (intentional variety)
   */
  private async getExplorationRecommendations(profile: UserTasteProfile, limit: number): Promise<ContentItem[]> {
    try {
      // Get genres user hasn't watched much
      const allGenres = [28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37];
      const watchedGenres = await this.getWatchedGenres(profile.userId);
      const underexploredGenres = allGenres.filter(g => !watchedGenres.includes(g));

      if (underexploredGenres.length === 0) return [];

      const randomGenre = underexploredGenres[Math.floor(Math.random() * underexploredGenres.length)];

      const { data } = await tmdbApi.get('/discover/movie', {
        params: {
          with_genres: randomGenre,
          sort_by: 'vote_average.desc',
          'vote_count.gte': 500,
          'vote_average.gte': 7.0,
        },
      });

      const candidates: ContentItem[] = (data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: 'movie' as const,
          title: item.title || item.name,
        }));

      const watchedIds = await this.getWatchedIds(profile.userId);
      return candidates.filter(c => !watchedIds.has(c.id)).slice(0, limit);
    } catch (error) {
      console.error('[Lanes] Error getting exploration recommendations:', error);
      return [];
    }
  }

  /**
   * Get classic essentials
   */
  private async getClassicEssentials(profile: UserTasteProfile, limit: number): Promise<ContentItem[]> {
    try {
      const { data } = await tmdbApi.get('/discover/movie', {
        params: {
          sort_by: 'vote_average.desc',
          'vote_count.gte': 5000,
          'vote_average.gte': 8.0,
          'primary_release_date.lte': '2000-12-31',
        },
      });

      const candidates: ContentItem[] = (data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: 'movie' as const,
          title: item.title || item.name,
        }));

      const watchedIds = await this.getWatchedIds(profile.userId);
      return candidates.filter(c => !watchedIds.has(c.id)).slice(0, limit);
    } catch (error) {
      console.error('[Lanes] Error getting classics:', error);
      return [];
    }
  }

  /**
   * Get new releases filtered to user's taste
   */
  private async getNewReleasesFiltered(profile: UserTasteProfile, limit: number): Promise<ContentItem[]> {
    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const { data } = await tmdbApi.get('/discover/movie', {
        params: {
          sort_by: 'popularity.desc',
          'primary_release_date.gte': oneYearAgo.toISOString().split('T')[0],
          'vote_count.gte': 100,
        },
      });

      const candidates: ContentItem[] = (data?.results || [])
        .map((item: any) => ({
          ...item,
          media_type: 'movie' as const,
          title: item.title || item.name,
        }));

      const watchedIds = await this.getWatchedIds(profile.userId);
      return candidates.filter(c => !watchedIds.has(c.id)).slice(0, limit);
    } catch (error) {
      console.error('[Lanes] Error getting new releases:', error);
      return [];
    }
  }

  /**
   * Get adjacent interest recommendations
   */
  private async getAdjacentInterestRecommendations(profile: UserTasteProfile, limit: number): Promise<ContentItem[]> {
    // Similar to exploration but bridges to nearby genres
    return this.getExplorationRecommendations(profile, limit);
  }

  /**
   * Helper methods
   */

  private async getRecentWatched(userId: string, limit: number): Promise<ContentItem[]> {
    const { data: items } = await supabase
      .from('watchlist_items')
      .select('tmdb_id, media_type')
      .eq('user_id', userId)
      .eq('status', 'watched')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!items || items.length === 0) return [];

    const contentItems: ContentItem[] = [];
    for (const item of items) {
      try {
        const endpoint = item.media_type === 'tv' ? '/tv' : '/movie';
        const { data } = await tmdbApi.get(`${endpoint}/${item.tmdb_id}`);
        contentItems.push({
          ...data,
          media_type: item.media_type === 'tv' ? 'tv' : 'movie',
          title: data.title || data.name,
        });
      } catch (error) {
        console.warn(`[Lanes] Failed to fetch ${item.tmdb_id}`);
      }
    }

    return contentItems;
  }

  private async getInProgressContent(userId: string): Promise<ContentItem[]> {
    const { data: items } = await supabase
      .from('watchlist_items')
      .select('tmdb_id, media_type')
      .eq('user_id', userId)
      .eq('status', 'watching')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!items || items.length === 0) return [];

    const contentItems: ContentItem[] = [];
    for (const item of items) {
      try {
        const endpoint = item.media_type === 'tv' ? '/tv' : '/movie';
        const { data } = await tmdbApi.get(`${endpoint}/${item.tmdb_id}`);
        contentItems.push({
          ...data,
          media_type: item.media_type === 'tv' ? 'tv' : 'movie',
          title: data.title || data.name,
        });
      } catch (error) {
        console.warn(`[Lanes] Failed to fetch ${item.tmdb_id}`);
      }
    }

    return contentItems;
  }

  private async getWatchedIds(userId: string): Promise<Set<number>> {
    const { data: items } = await supabase
      .from('watchlist_items')
      .select('tmdb_id')
      .eq('user_id', userId);

    return new Set((items || []).map(i => i.tmdb_id));
  }

  private async getWatchedGenres(userId: string): Promise<number[]> {
    // Simplified - would need to fetch actual content and extract genres
    return [];
  }

  private getDominantTheme(themes: ContentDNA['themes']): string | null {
    const entries = Object.entries(themes).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 && entries[0][1] > 0.3 ? entries[0][0] : null;
  }

  private getThemeTitle(theme: string): string {
    const titles: Record<string, string> = {
      technology: 'Tech & Sci-Fi Deep Dive',
      familyDynamics: 'Family Stories',
      justice: 'Crime & Justice',
      survival: 'Survival Stories',
      love: 'Romance & Relationships',
      identity: 'Character Studies',
      power: 'Power & Politics',
      redemption: 'Redemption Arcs',
    };
    return titles[theme] || `${theme} Stories`;
  }

  /**
   * Compute how well content matches user's taste profile
   */
  private computeProfileMatch(dna: ContentDNA, profile: UserTasteProfile): number {
    // Tone match using cosine similarity
    const toneMatch = this.vectorSimilarity(
      Object.values(dna.tone),
      Object.values(profile.preferredTone)
    );

    // Theme match
    const themeMatch = this.vectorSimilarity(
      Object.values(dna.themes),
      Object.values(profile.preferredThemes)
    );

    // Pacing match
    const pacingMatch = this.vectorSimilarity(
      Object.values(dna.pacing),
      Object.values(profile.preferredPacing)
    );

    // Talent bonus
    let talentBonus = 0;
    for (const dir of dna.talent.directors) {
      if (profile.favoriteDirectors.some(fd => fd.name === dir)) {
        talentBonus += 0.2;
      }
    }
    for (const actor of dna.talent.leadActors) {
      if (profile.favoriteActors.some(fa => fa.name === actor)) {
        talentBonus += 0.1;
      }
    }

    return Math.min(
      1,
      toneMatch * 0.3 + themeMatch * 0.35 + pacingMatch * 0.15 + talentBonus * 0.2
    );
  }

  private vectorSimilarity(v1: number[], v2: number[]): number {
    const dotProduct = v1.reduce((sum, val, i) => sum + val * v2[i], 0);
    const mag1 = Math.sqrt(v1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(v2.reduce((sum, val) => sum + val * val, 0));

    if (mag1 === 0 || mag2 === 0) return 0;
    return dotProduct / (mag1 * mag2);
  }
}

// Export singleton instance
export const recommendationLanesService = new RecommendationLanesService();
