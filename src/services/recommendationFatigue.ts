import { supabase } from '@/config/supabase';
import { Content } from '@/types';

// Configuration
const FATIGUE_THRESHOLD = 3;        // After 3 impressions without engagement
const COOLDOWN_DAYS = 7;            // Hide for 7 days
const DEPRIORITIZE_MULTIPLIER = 0.5; // Reduce score by 50%

export interface ImpressionRecord {
    contentId: number;
    impressions: number;      // Times shown
    lastShown: Date;
    engaged: boolean;         // Did user interact?
}

/**
 * Get impression history for a user
 */
export const getImpressionHistory = async (userId: string): Promise<Map<number, ImpressionRecord>> => {
    try {
        const { data, error } = await supabase
            .from('content_impressions')
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error('[Fatigue] Error fetching impressions:', error);
            return new Map();
        }

        const map = new Map<number, ImpressionRecord>();
        data?.forEach(record => {
            map.set(record.content_id, {
                contentId: record.content_id,
                impressions: record.impression_count,
                lastShown: new Date(record.last_shown_at),
                engaged: record.engaged,
            });
        });

        return map;
    } catch (error) {
        console.error('[Fatigue] Error in getImpressionHistory:', error);
        return new Map();
    }
};

/**
 * Track an impression for a content item
 * Increments count if exists, creates new if not
 */
export const trackImpression = async (userId: string, contentId: number) => {
    try {
        // Check if exists first (or use upsert if unique constraint is set)
        const { data: existing } = await supabase
            .from('content_impressions')
            .select('*')
            .eq('user_id', userId)
            .eq('content_id', contentId)
            .single();

        if (existing) {
            // Don't update if already engaged (no need to track further fatigue)
            if (existing.engaged) return;

            await supabase
                .from('content_impressions')
                .update({
                    impression_count: existing.impression_count + 1,
                    last_shown_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('content_impressions')
                .insert({
                    user_id: userId,
                    content_id: contentId,
                    impression_count: 1,
                    last_shown_at: new Date().toISOString(),
                    engaged: false,
                });
        }
    } catch (error) {
        console.error('[Fatigue] Error tracking impression:', error);
    }
};

/**
 * Batch track impressions for multiple items
 */
export const trackBatchImpressions = async (userId: string, contentIds: number[]) => {
    // Process in parallel but handle errors individually
    await Promise.all(contentIds.map(id => trackImpression(userId, id)));
};

/**
 * Mark a content item as engaged (user clicked/added to watchlist)
 * Resets fatigue for this item
 */
export const markEngaged = async (userId: string, contentId: number) => {
    try {
        // Check if exists
        const { data: existing } = await supabase
            .from('content_impressions')
            .select('id')
            .eq('user_id', userId)
            .eq('content_id', contentId)
            .single();

        if (existing) {
            await supabase
                .from('content_impressions')
                .update({ engaged: true })
                .eq('id', existing.id);
        } else {
            // If marking engaged but never shown (edge case), insert as engaged
            await supabase
                .from('content_impressions')
                .insert({
                    user_id: userId,
                    content_id: contentId,
                    impression_count: 1,
                    last_shown_at: new Date().toISOString(),
                    engaged: true,
                });
        }
    } catch (error) {
        console.error('[Fatigue] Error marking engaged:', error);
    }
};

/**
 * Apply fatigue filter to recommendations
 * Removes or deprioritizes items based on impression history
 */
export const applyFatigueFilter = (
    recommendations: any[],
    impressionHistory: Map<number, ImpressionRecord>
): any[] => {
    const now = new Date();

    return recommendations
        .map(item => {
            const history = impressionHistory.get(item.id);

            if (!history) {
                // Never shown - full priority
                return { ...item, fatigueScore: 1.0 };
            }

            // If user engaged, reset fatigue (full score)
            if (history.engaged) {
                return { ...item, fatigueScore: 1.0 };
            }

            // Check if in cooldown period
            const daysSinceShown = Math.floor(
                (now.getTime() - history.lastShown.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (history.impressions >= FATIGUE_THRESHOLD) {
                if (daysSinceShown < COOLDOWN_DAYS) {
                    // In cooldown - exclude entirely (score 0)
                    // console.log(`[Fatigue] Hiding ${item.title} (Impressions: ${history.impressions}, Days: ${daysSinceShown})`);
                    return { ...item, fatigueScore: 0 };
                }
                // Out of cooldown but was fatigued - deprioritize
                // console.log(`[Fatigue] Deprioritizing ${item.title} (Impressions: ${history.impressions}, Days: ${daysSinceShown})`);
                return { ...item, fatigueScore: DEPRIORITIZE_MULTIPLIER };
            }

            // Gradually reduce score based on impressions
            // 1 imp = 0.85, 2 imp = 0.70, 3 imp = 0.55 (if threshold > 3)
            const fatigueScore = 1 - (history.impressions * 0.15);
            return { ...item, fatigueScore: Math.max(fatigueScore, 0.3) };
        })
        .filter(item => item.fatigueScore > 0)
        .sort((a, b) => {
            // Sort by fatigue-adjusted relevance
            // Assuming existing relevanceScore or default to 1
            const aScore = (a.relevanceScore || a.popularity || 1) * a.fatigueScore;
            const bScore = (b.relevanceScore || b.popularity || 1) * b.fatigueScore;
            return bScore - aScore;
        });
};
