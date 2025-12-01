
/**
 * Subscription Coach Service
 * Generates actionable advice for subscription management based on usage and interests
 */

import { supabase } from '@/config/supabase';
import { getUSWatchProviders } from './tmdb';
import type { UserSubscription } from '@/types';

export interface CoachingSuggestion {
    type: 'consider_adding' | 'consider_pausing' | 'upcoming_content' | 'rotation_opportunity';
    service: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    action: string;
    contentTitles?: string[];
    savings?: number;
}

interface WatchlistItem {
    id: string;
    status: string;
    content?: {
        tmdb_id: number;
        type: 'movie' | 'tv';
        title: string;
    };
    // Fallback for flat structure if needed
    tmdb_id?: number;
    type?: 'movie' | 'tv';
    title?: string;
}

/**
 * Generate coaching suggestions based on user data
 */
export async function generateCoachingSuggestions(
    userId: string,
    subscriptions: UserSubscription[],
    watchlist: WatchlistItem[]
): Promise<CoachingSuggestion[]> {
    const suggestions: CoachingSuggestion[] = [];
    const currentServices = subscriptions.map(s => (s.service_name || '').toLowerCase());

    // 1. Identify "Consider Adding"
    // Find watchlist items NOT on current services
    const wantToWatch = watchlist.filter(w => w.status === 'want_to_watch');

    // Map service name to count of items
    const servicePotential = new Map<string, { count: number; titles: string[] }>();

    // Check availability for a subset of watchlist to avoid rate limits
    // (In a real app, this would be cached or batched more efficiently)
    const itemsToCheck = wantToWatch.slice(0, 10);

    for (const item of itemsToCheck) {
        // Handle both joined and flat structure
        const tmdbId = item.content?.tmdb_id || item.tmdb_id;
        const type = item.content?.type || item.type;
        const title = item.content?.title || item.title || 'Unknown Title';

        if (!tmdbId || !type) continue;

        const providers = await getUSWatchProviders(tmdbId, type);
        const flatrate = providers?.flatrate || [];

        for (const provider of flatrate) {
            const serviceName = provider.provider_name;
            const serviceKey = serviceName.toLowerCase();

            // If user doesn't have this service
            if (!currentServices.some(cs => serviceKey.includes(cs) || cs.includes(serviceKey))) {
                const current = servicePotential.get(serviceName) || { count: 0, titles: [] };

                if (!current.titles.includes(title)) {
                    current.count++;
                    current.titles.push(title);
                    servicePotential.set(serviceName, current);
                }
            }
        }
    }

    // Generate suggestions for services with multiple items
    for (const [service, data] of servicePotential.entries()) {
        if (data.count >= 2) {
            suggestions.push({
                type: 'consider_adding',
                service: service,
                priority: data.count >= 4 ? 'high' : 'medium',
                reason: `${data.count} items on your watchlist stream on ${service}.`,
                action: 'Consider subscribing',
                contentTitles: data.titles.slice(0, 3)
            });
        }
    }

    // 2. Identify "Consider Pausing"
    // Services with low usage and no immediate watchlist items
    for (const sub of subscriptions) {
        // Skip if recently added (less than 1 month)
        const created = new Date(sub.created_at);
        const now = new Date();
        const daysSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

        if (daysSinceCreation < 30) continue;

        const hours = sub.monthly_viewing_hours || 0;

        // Low usage threshold (< 2 hours)
        if (hours < 2) {
            // Check if any watchlist items are on this service
            // We'd need to know which items are on this service. 
            // For now, we'll assume if they have low usage, they might not be watching what they planned.

            suggestions.push({
                type: 'consider_pausing',
                service: sub.service_name,
                priority: 'high',
                reason: `Only ${hours.toFixed(1)} hours watched recently.`,
                action: `Pause to save $${sub.price}/mo`,
                savings: sub.price
            });
        }
    }

    return suggestions;
}
