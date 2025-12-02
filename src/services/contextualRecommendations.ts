/**
 * Contextual & Temporal Intelligence Service
 * Layer 6: Adjusts recommendations based on viewing context and learned temporal patterns
 *
 * Provides context-aware recommendations that consider:
 * - Time of day (morning, afternoon, evening, late night)
 * - Day of week (weekday vs weekend)
 * - User's mood and available time
 * - Device being used
 * - Learned temporal viewing patterns
 */

import { supabase } from '@/config/supabase';

export interface ViewingContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'lateNight';
  dayOfWeek: 'weekday' | 'weekend';
  recentMood?: 'energetic' | 'relaxed' | 'emotional' | 'curious';
  availableTime?: number; // minutes
  device?: 'mobile' | 'tablet' | 'tv';
}

export interface ContentItem {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
  runtime?: number;
  episode_run_time?: number[];
  genre_ids?: number[];
  vote_average?: number;
  contextScore?: number;
}

interface ViewingHistoryItem {
  tmdb_id: number;
  media_type: string;
  watched_at: string;
  runtime?: number;
  genre_ids?: number[];
}

interface TimeSlotPreference {
  genrePreferences: Map<number, number>; // genre_id -> frequency
  avgRuntime: number;
  contentCount: number;
}

/**
 * User's temporal viewing patterns learned from history
 */
class UserTemporalPatterns {
  private patterns: Map<string, TimeSlotPreference> = new Map();

  recordView(
    view: ViewingHistoryItem,
    timeSlot: string,
    dayType: 'weekday' | 'weekend'
  ): void {
    const key = `${dayType}_${timeSlot}`;

    if (!this.patterns.has(key)) {
      this.patterns.set(key, {
        genrePreferences: new Map(),
        avgRuntime: 0,
        contentCount: 0,
      });
    }

    const pattern = this.patterns.get(key)!;

    // Update genre preferences
    for (const genreId of view.genre_ids || []) {
      const currentCount = pattern.genrePreferences.get(genreId) || 0;
      pattern.genrePreferences.set(genreId, currentCount + 1);
    }

    // Update average runtime
    if (view.runtime) {
      pattern.avgRuntime =
        (pattern.avgRuntime * pattern.contentCount + view.runtime) /
        (pattern.contentCount + 1);
    }

    pattern.contentCount++;
  }

  getMatchScore(item: ContentItem, context: ViewingContext): number {
    const timeSlot = this.getTimeSlotFromContext(context);
    const key = `${context.dayOfWeek}_${timeSlot}`;

    const pattern = this.patterns.get(key);
    if (!pattern || pattern.contentCount < 3) {
      return 0; // Not enough data
    }

    let score = 0;

    // Genre match score
    if (item.genre_ids && item.genre_ids.length > 0) {
      const totalGenreViews = Array.from(pattern.genrePreferences.values()).reduce(
        (sum, count) => sum + count,
        0
      );

      for (const genreId of item.genre_ids) {
        const genreViews = pattern.genrePreferences.get(genreId) || 0;
        score += genreViews / totalGenreViews;
      }

      score /= item.genre_ids.length; // Average across all genres
    }

    // Runtime match score
    if (item.runtime && pattern.avgRuntime > 0) {
      const runtimeDiff = Math.abs(item.runtime - pattern.avgRuntime);
      const runtimeScore = Math.max(0, 1 - runtimeDiff / 120); // Penalize differences over 2 hours
      score = (score + runtimeScore) / 2;
    }

    return score;
  }

  private getTimeSlotFromContext(context: ViewingContext): string {
    return context.timeOfDay;
  }
}

/**
 * Main contextual recommendation service
 */
export class ContextualRecommendationService {
  /**
   * Get context-aware recommendations
   * Adjusts base recommendations based on viewing context
   */
  async getContextAwareRecommendations(
    userId: string,
    context: ViewingContext,
    baseRecommendations: ContentItem[]
  ): Promise<ContentItem[]> {
    console.log('[Context] Adjusting recommendations for context:', context);

    // Learn user's temporal patterns
    const patterns = await this.learnTemporalPatterns(userId);

    // Adjust recommendations based on context
    const scored = baseRecommendations.map(item => ({
      item: {
        ...item,
        contextScore: this.computeContextScore(item, context, patterns),
      },
    }));

    const sorted = scored.sort((a, b) => b.item.contextScore! - a.item.contextScore!);

    console.log('[Context] Adjusted recommendations based on context');
    console.log('[Context] Top 3 scores:', sorted.slice(0, 3).map(s => s.item.contextScore));

    return sorted.map(({ item }) => item);
  }

  /**
   * Get current viewing context automatically
   */
  static getCurrentContext(availableTime?: number, device?: 'mobile' | 'tablet' | 'tv'): ViewingContext {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Determine time of day
    let timeOfDay: ViewingContext['timeOfDay'];
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'lateNight';
    }

    // Determine day type
    const dayOfWeek: ViewingContext['dayOfWeek'] = day === 0 || day === 6 ? 'weekend' : 'weekday';

    return {
      timeOfDay,
      dayOfWeek,
      availableTime,
      device,
    };
  }

  /**
   * Compute how well content matches the current context
   */
  private computeContextScore(
    item: ContentItem,
    context: ViewingContext,
    patterns: UserTemporalPatterns
  ): number {
    let score = 1.0;

    // TIME OF DAY ADJUSTMENTS
    if (context.timeOfDay === 'lateNight') {
      // Late night (10pm-5am): Prefer shorter, engaging content
      const runtime = item.runtime || item.episode_run_time?.[0] || 90;
      if (runtime < 120) score *= 1.2; // Shorter content
      if (item.genre_ids?.includes(53)) score *= 1.3; // Thriller
      if (item.genre_ids?.includes(35)) score *= 1.2; // Comedy
      if (item.genre_ids?.includes(27)) score *= 1.15; // Horror
      // Reduce heavy dramas
      if (
        item.genre_ids?.includes(18) &&
        !item.genre_ids?.includes(35) &&
        !item.genre_ids?.includes(10749)
      ) {
        score *= 0.8;
      }
    }

    if (context.timeOfDay === 'morning') {
      // Morning (5am-12pm): Lighter, uplifting content
      if (item.genre_ids?.includes(35)) score *= 1.3; // Comedy
      if (item.genre_ids?.includes(10751)) score *= 1.2; // Family
      if (item.genre_ids?.includes(16)) score *= 1.15; // Animation
      if (item.genre_ids?.includes(99)) score *= 1.2; // Documentary
      // Reduce dark content
      if (item.genre_ids?.includes(27)) score *= 0.5; // Horror
      if (item.genre_ids?.includes(53) && item.vote_average && item.vote_average < 7) score *= 0.7; // Mediocre thrillers
    }

    if (context.timeOfDay === 'afternoon') {
      // Afternoon (12pm-5pm): Relaxed viewing
      if (item.genre_ids?.includes(10749)) score *= 1.2; // Romance
      if (item.genre_ids?.includes(99)) score *= 1.3; // Documentary
      if (item.genre_ids?.includes(12)) score *= 1.15; // Adventure
      // Neutral to most other content
    }

    if (context.timeOfDay === 'evening') {
      // Evening (5pm-10pm): Prime time - anything goes
      // Slight boost to quality content
      if (item.vote_average && item.vote_average > 7.5) score *= 1.1;
      // This is the most flexible time slot
    }

    // DAY OF WEEK ADJUSTMENTS
    if (context.dayOfWeek === 'weekend') {
      // Weekends: More time for longer, complex content
      const runtime = item.runtime || item.episode_run_time?.[0] || 90;
      if (runtime > 150) score *= 1.3; // Epic movies
      if (item.media_type === 'tv') score *= 1.2; // TV series binges
      if (item.genre_ids?.includes(878)) score *= 1.15; // Sci-Fi (often complex)
      if (item.genre_ids?.includes(14)) score *= 1.15; // Fantasy (often long)
    } else {
      // Weekdays: Prefer digestible content
      const runtime = item.runtime || item.episode_run_time?.[0] || 90;
      if (runtime < 120) score *= 1.2; // Shorter movies
      if (item.media_type === 'tv' && item.episode_run_time?.[0] && item.episode_run_time[0] < 45) {
        score *= 1.3; // Short episodes
      }
    }

    // MOOD ADJUSTMENTS
    if (context.recentMood) {
      if (context.recentMood === 'energetic') {
        if (item.genre_ids?.includes(28)) score *= 1.4; // Action
        if (item.genre_ids?.includes(12)) score *= 1.3; // Adventure
        if (item.genre_ids?.includes(53)) score *= 1.2; // Thriller
      }

      if (context.recentMood === 'relaxed') {
        if (item.genre_ids?.includes(35)) score *= 1.3; // Comedy
        if (item.genre_ids?.includes(10749)) score *= 1.2; // Romance
        if (item.genre_ids?.includes(10751)) score *= 1.2; // Family
        if (item.genre_ids?.includes(16)) score *= 1.15; // Animation
      }

      if (context.recentMood === 'emotional') {
        if (item.genre_ids?.includes(18)) score *= 1.4; // Drama
        if (item.genre_ids?.includes(10749)) score *= 1.3; // Romance
        if (item.vote_average && item.vote_average > 7.5) score *= 1.2; // High quality
      }

      if (context.recentMood === 'curious') {
        if (item.genre_ids?.includes(99)) score *= 1.4; // Documentary
        if (item.genre_ids?.includes(878)) score *= 1.3; // Sci-Fi
        if (item.genre_ids?.includes(9648)) score *= 1.2; // Mystery
      }
    }

    // AVAILABLE TIME ADJUSTMENTS
    if (context.availableTime) {
      const runtime = item.runtime || item.episode_run_time?.[0] || 90;

      if (runtime <= context.availableTime) {
        // Perfect fit or comfortably fits
        score *= 1.5;
      } else if (runtime <= context.availableTime + 15) {
        // Slightly over - still watchable
        score *= 1.1;
      } else if (runtime > context.availableTime + 30) {
        // Too long - significant penalty
        score *= 0.4;
      } else {
        // Moderately over - small penalty
        score *= 0.8;
      }
    }

    // DEVICE ADJUSTMENTS
    if (context.device) {
      if (context.device === 'mobile') {
        // Mobile: Prefer shorter content, avoid visually complex
        const runtime = item.runtime || item.episode_run_time?.[0] || 90;
        if (runtime < 45) score *= 1.3;
        if (item.media_type === 'tv') score *= 1.2; // Easier to watch in chunks
        // Reduce visually spectacular content (better on big screen)
        if (item.genre_ids?.includes(878)) score *= 0.9; // Sci-Fi
        if (item.genre_ids?.includes(12)) score *= 0.9; // Adventure
      }

      if (context.device === 'tv') {
        // TV: Prefer visually stunning content
        if (item.genre_ids?.includes(28)) score *= 1.2; // Action
        if (item.genre_ids?.includes(12)) score *= 1.2; // Adventure
        if (item.genre_ids?.includes(878)) score *= 1.2; // Sci-Fi
        if (item.genre_ids?.includes(14)) score *= 1.15; // Fantasy
        if (item.vote_average && item.vote_average > 8.0) score *= 1.15; // Premium content
      }

      if (context.device === 'tablet') {
        // Tablet: Balanced, slight preference for TV shows
        if (item.media_type === 'tv') score *= 1.1;
      }
    }

    // LEARNED PATTERN MATCHING
    const patternMatch = patterns.getMatchScore(item, context);
    score *= 1 + patternMatch * 0.5; // Up to 50% boost from patterns

    return score;
  }

  /**
   * Learn user's temporal viewing patterns from history
   */
  private async learnTemporalPatterns(userId: string): Promise<UserTemporalPatterns> {
    console.log('[Context] Learning temporal patterns for user:', userId);

    const history = await this.getViewingHistoryWithTimestamps(userId);
    const patterns = new UserTemporalPatterns();

    for (const view of history) {
      const timestamp = new Date(view.watched_at);
      const hour = timestamp.getHours();
      const day = timestamp.getDay();
      const isWeekend = day === 0 || day === 6;

      const timeSlot = this.getTimeSlot(hour);
      const dayType = isWeekend ? 'weekend' : 'weekday';

      patterns.recordView(view, timeSlot, dayType);
    }

    console.log('[Context] Learned patterns from', history.length, 'viewing sessions');
    return patterns;
  }

  /**
   * Get viewing history with timestamps
   */
  private async getViewingHistoryWithTimestamps(
    userId: string
  ): Promise<ViewingHistoryItem[]> {
    const { data: items } = await supabase
      .from('watchlist_items')
      .select('tmdb_id, media_type, created_at, updated_at')
      .eq('user_id', userId)
      .in('status', ['watched', 'watching'])
      .order('updated_at', { ascending: false })
      .limit(200); // Last 200 views

    if (!items) return [];

    // Map to viewing history (use updated_at as proxy for watched_at)
    return items.map(item => ({
      tmdb_id: item.tmdb_id,
      media_type: item.media_type,
      watched_at: item.updated_at || item.created_at,
      // Note: runtime and genre_ids would need to be fetched from TMDb
      // For now, we'll return items without this data
      // In production, you'd want to fetch and cache this
    }));
  }

  /**
   * Map hour to time slot
   */
  private getTimeSlot(hour: number): string {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'lateNight';
  }

  /**
   * Suggest optimal viewing times for content
   */
  suggestOptimalViewingTime(item: ContentItem): {
    timeOfDay: string;
    dayType: string;
    reason: string;
  }[] {
    const suggestions: Array<{ timeOfDay: string; dayType: string; reason: string }> = [];

    const runtime = item.runtime || item.episode_run_time?.[0] || 90;

    // Long content -> weekends
    if (runtime > 150) {
      suggestions.push({
        timeOfDay: 'afternoon',
        dayType: 'weekend',
        reason: 'Long runtime - perfect for a lazy weekend afternoon',
      });
    }

    // Thrillers/Horror -> late night
    if (item.genre_ids?.includes(53) || item.genre_ids?.includes(27)) {
      suggestions.push({
        timeOfDay: 'lateNight',
        dayType: 'any',
        reason: 'Suspenseful content hits different late at night',
      });
    }

    // Comedy/Light content -> morning/afternoon
    if (item.genre_ids?.includes(35) || item.genre_ids?.includes(10751)) {
      suggestions.push({
        timeOfDay: 'morning',
        dayType: 'weekend',
        reason: 'Light, uplifting content to start the day',
      });
    }

    // Epic/Complex content -> weekend evening
    if (item.genre_ids?.includes(878) || item.genre_ids?.includes(14)) {
      if (runtime > 120) {
        suggestions.push({
          timeOfDay: 'evening',
          dayType: 'weekend',
          reason: 'Complex story deserves your full attention',
        });
      }
    }

    return suggestions;
  }
}

// Export singleton instance
export const contextualRecommendationService = new ContextualRecommendationService();
