/**
 * Churn Calendar Service
 * Optimize subscription timing based on content release schedules
 * Kill/Keep Cycle: Cancel when you've watched everything, resubscribe when new content arrives
 */

import { supabase } from '@/config/supabase';
import { tmdbApi } from './tmdb';

export interface ChurnEvent {
  id: string;
  date: Date;
  action: 'cancel' | 'subscribe' | 'binge';
  service: string;
  serviceId: string;
  reason: string;
  contentTitle?: string;
  contentId?: number;
  priority: 'high' | 'medium' | 'low';
  estimatedSavings?: number;
}

export interface ChurnRecommendation {
  service: string;
  serviceId: string;
  monthlyCost: number;
  action: 'cancel_now' | 'keep' | 'cancel_after_binge';
  reason: string;
  upcomingContent: Array<{
    title: string;
    releaseDate: Date | null;
    daysUntil: number | null;
  }>;
  lastWatchedDate: Date | null;
  daysSinceLastWatch: number;
  potentialSavings: number; // How much you'd save if you cancel
}

/**
 * Get upcoming release dates for content on user's watchlist
 */
const getUpcomingReleases = async (userId: string): Promise<Map<string, any[]>> => {
  const { data: watchlist } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['want_to_watch', 'watching']);

  const releasesByService = new Map<string, any[]>();

  if (!watchlist) return releasesByService;

  for (const item of watchlist) {
    const service = (item.streaming_service || 'Unknown').toLowerCase();

    try {
      // For TV shows, check for upcoming seasons/episodes
      if (item.content_type === 'tv') {
        const response = await tmdbApi.get(`/tv/${item.tmdb_id}`);
        const tvData = response.data;

        // Check for next episode
        if (tvData.next_episode_to_air) {
          const releaseDate = new Date(tvData.next_episode_to_air.air_date);
          const daysUntil = Math.ceil((releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          if (!releasesByService.has(service)) {
            releasesByService.set(service, []);
          }

          releasesByService.get(service)!.push({
            title: tvData.name,
            releaseDate,
            daysUntil,
            tmdbId: item.tmdb_id,
            type: 'episode',
            episodeInfo: `S${tvData.next_episode_to_air.season_number}E${tvData.next_episode_to_air.episode_number}`,
          });
        }

        // Check for next season
        if (tvData.seasons) {
          const lastSeason = tvData.seasons[tvData.seasons.length - 1];
          // If last season aired recently, there might be another season coming
          if (lastSeason.air_date) {
            const lastSeasonDate = new Date(lastSeason.air_date);
            const monthsSinceLastSeason = (Date.now() - lastSeasonDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

            // Assume new season comes ~12 months after previous one
            if (monthsSinceLastSeason > 8 && monthsSinceLastSeason < 18) {
              const estimatedNextSeason = new Date(lastSeasonDate);
              estimatedNextSeason.setMonth(estimatedNextSeason.getMonth() + 12);
              const daysUntil = Math.ceil((estimatedNextSeason.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

              if (daysUntil > 0 && daysUntil < 180) {
                if (!releasesByService.has(service)) {
                  releasesByService.set(service, []);
                }

                releasesByService.get(service)!.push({
                  title: tvData.name,
                  releaseDate: estimatedNextSeason,
                  daysUntil,
                  tmdbId: item.tmdb_id,
                  type: 'season_estimate',
                  seasonNumber: lastSeason.season_number + 1,
                });
              }
            }
          }
        }
      }

      // For movies on watchlist that haven't been released yet
      if (item.content_type === 'movie') {
        const response = await tmdbApi.get(`/movie/${item.tmdb_id}`);
        const movieData = response.data;

        if (movieData.release_date) {
          const releaseDate = new Date(movieData.release_date);
          const daysUntil = Math.ceil((releaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          // Only include if it's releasing in the future
          if (daysUntil > 0 && daysUntil < 180) {
            if (!releasesByService.has(service)) {
              releasesByService.set(service, []);
            }

            releasesByService.get(service)!.push({
              title: movieData.title,
              releaseDate,
              daysUntil,
              tmdbId: item.tmdb_id,
              type: 'movie',
            });
          }
        }
      }
    } catch (error) {
      console.error('[ChurnCalendar] Error fetching release data for', item.title, error);
    }
  }

  return releasesByService;
};

/**
 * Calculate when user last watched content on each service
 */
const getLastWatchDates = async (userId: string): Promise<Map<string, Date>> => {
  const { data: watchlist } = await supabase
    .from('watchlist_items')
    .select('streaming_service, watched_at, updated_at, status')
    .eq('user_id', userId)
    .in('status', ['watching', 'watched'])
    .order('watched_at', { ascending: false });

  const lastWatchByService = new Map<string, Date>();

  if (!watchlist) return lastWatchByService;

  for (const item of watchlist) {
    const service = (item.streaming_service || 'Unknown').toLowerCase();
    const watchDate = new Date(item.watched_at || item.updated_at);

    if (!lastWatchByService.has(service) || watchDate > lastWatchByService.get(service)!) {
      lastWatchByService.set(service, watchDate);
    }
  }

  return lastWatchByService;
};

/**
 * Generate churn calendar events
 */
export const generateChurnCalendar = async (userId: string): Promise<ChurnEvent[]> => {
  const events: ChurnEvent[] = [];

  console.log('[ChurnCalendar] Generating churn calendar for user:', userId);

  try {
    // Get subscriptions
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[ChurnCalendar] No active subscriptions');
      return [];
    }

    // Get upcoming releases by service
    const upcomingReleases = await getUpcomingReleases(userId);

    // Get last watch dates
    const lastWatchDates = await getLastWatchDates(userId);

    console.log('[ChurnCalendar] Upcoming releases:', Object.fromEntries(upcomingReleases));
    console.log('[ChurnCalendar] Last watch dates:', Object.fromEntries(lastWatchDates));

    // Process each subscription
    for (const sub of subscriptions) {
      const serviceName = (sub.service_name || '').toLowerCase();
      const monthlyCost = sub.monthly_cost || sub.cost || 0;

      // Get upcoming content for this service
      const upcoming = upcomingReleases.get(serviceName) || [];
      const lastWatch = lastWatchDates.get(serviceName);

      // Calculate days since last watch
      const daysSinceWatch = lastWatch
        ? Math.floor((Date.now() - lastWatch.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // CASE 1: No upcoming content and haven't watched in 30+ days = CANCEL NOW
      if (upcoming.length === 0 && daysSinceWatch > 30) {
        events.push({
          id: `cancel-${sub.id}-now`,
          date: new Date(), // Today
          action: 'cancel',
          service: sub.service_name,
          serviceId: sub.id,
          reason: `No upcoming watchlist content. Last watched ${daysSinceWatch} days ago.`,
          priority: 'high',
          estimatedSavings: monthlyCost,
        });
      }

      // CASE 2: Upcoming content - suggest resubscribe a week before
      for (const release of upcoming) {
        if (release.daysUntil > 7) {
          const subscribeDate = new Date(release.releaseDate);
          subscribeDate.setDate(subscribeDate.getDate() - 7); // 7 days before release

          events.push({
            id: `subscribe-${sub.id}-${release.tmdbId}`,
            date: subscribeDate,
            action: 'subscribe',
            service: sub.service_name,
            serviceId: sub.id,
            reason: `${release.title} ${release.type === 'episode' ? release.episodeInfo : 'releases'} soon`,
            contentTitle: release.title,
            contentId: release.tmdbId,
            priority: release.daysUntil < 30 ? 'high' : 'medium',
          });
        } else if (release.daysUntil <= 7 && release.daysUntil > 0) {
          // Content releasing within a week - suggest binge period
          events.push({
            id: `binge-${sub.id}-${release.tmdbId}`,
            date: new Date(release.releaseDate),
            action: 'binge',
            service: sub.service_name,
            serviceId: sub.id,
            reason: `${release.title} ${release.type === 'episode' ? release.episodeInfo : 'releasing'} in ${release.daysUntil} days`,
            contentTitle: release.title,
            contentId: release.tmdbId,
            priority: 'high',
          });
        }
      }

      // CASE 3: Watched recently but no upcoming content - suggest cancel in 30 days
      if (upcoming.length === 0 && daysSinceWatch <= 30 && daysSinceWatch > 7) {
        const cancelDate = new Date();
        cancelDate.setDate(cancelDate.getDate() + (30 - daysSinceWatch));

        events.push({
          id: `cancel-${sub.id}-future`,
          date: cancelDate,
          action: 'cancel',
          service: sub.service_name,
          serviceId: sub.id,
          reason: 'No upcoming watchlist content',
          priority: 'medium',
          estimatedSavings: monthlyCost,
        });
      }
    }

    // Sort by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log('[ChurnCalendar] Generated', events.length, 'events');
    return events;
  } catch (error) {
    console.error('[ChurnCalendar] Error generating calendar:', error);
    return [];
  }
};

/**
 * Get churn recommendations for each subscription
 */
export const getChurnRecommendations = async (userId: string): Promise<ChurnRecommendation[]> => {
  const recommendations: ChurnRecommendation[] = [];

  try {
    // Get subscriptions
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }

    const upcomingReleases = await getUpcomingReleases(userId);
    const lastWatchDates = await getLastWatchDates(userId);

    for (const sub of subscriptions) {
      const serviceName = (sub.service_name || '').toLowerCase();
      const monthlyCost = sub.monthly_cost || sub.cost || 0;
      const upcoming = upcomingReleases.get(serviceName) || [];
      const lastWatch = lastWatchDates.get(serviceName);

      const daysSinceWatch = lastWatch
        ? Math.floor((Date.now() - lastWatch.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Determine action
      let action: 'cancel_now' | 'keep' | 'cancel_after_binge' = 'keep';
      let reason = 'You have content to watch';

      if (upcoming.length === 0 && daysSinceWatch > 30) {
        action = 'cancel_now';
        reason = `Haven't watched in ${daysSinceWatch} days. Cancel and save $${monthlyCost.toFixed(2)}/month.`;
      } else if (upcoming.length === 0 && daysSinceWatch > 7) {
        action = 'cancel_after_binge';
        reason = `Finish watching your shows, then cancel to save $${monthlyCost.toFixed(2)}/month.`;
      } else if (upcoming.length > 0) {
        const nextRelease = upcoming.reduce((earliest, curr) =>
          curr.daysUntil < earliest.daysUntil ? curr : earliest
        );
        reason = `${nextRelease.title} ${nextRelease.type === 'episode' ? nextRelease.episodeInfo : ''} in ${nextRelease.daysUntil} days`;
      }

      // Calculate potential savings (assuming you cancel for 2 months)
      const potentialSavings = action === 'cancel_now' || action === 'cancel_after_binge'
        ? monthlyCost * 2
        : 0;

      recommendations.push({
        service: sub.service_name,
        serviceId: sub.id,
        monthlyCost,
        action,
        reason,
        upcomingContent: upcoming.map(u => ({
          title: u.title,
          releaseDate: u.releaseDate,
          daysUntil: u.daysUntil,
        })),
        lastWatchedDate: lastWatch || null,
        daysSinceLastWatch: daysSinceWatch,
        potentialSavings,
      });
    }

    // Sort by action priority (cancel_now first)
    recommendations.sort((a, b) => {
      const priority = { cancel_now: 0, cancel_after_binge: 1, keep: 2 };
      return priority[a.action] - priority[b.action];
    });

    return recommendations;
  } catch (error) {
    console.error('[ChurnCalendar] Error generating recommendations:', error);
    return [];
  }
};

/**
 * Calculate total potential savings from churn optimization
 */
export const calculatePotentialSavings = async (userId: string): Promise<number> => {
  const recommendations = await getChurnRecommendations(userId);

  return recommendations
    .filter(r => r.action === 'cancel_now' || r.action === 'cancel_after_binge')
    .reduce((sum, r) => sum + r.potentialSavings, 0);
};
