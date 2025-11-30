/**
 * Watch Providers Service
 * Filter content by streaming availability based on user's subscriptions
 */

import { tmdbApi } from './tmdb';
import { supabase } from '@/config/supabase';

// Map service names to TMDb provider IDs (US region)
const SERVICE_TO_PROVIDER_MAP: Record<string, number[]> = {
  'netflix': [8],
  'hulu': [15],
  'disney': [337], // Disney+
  'disney+': [337],
  'prime': [9, 119], // Amazon Prime Video
  'amazon': [9, 119],
  'max': [1899, 384], // Max (formerly HBO Max)
  'hbo': [1899, 384],
  'apple': [350], // Apple TV+
  'paramount': [531], // Paramount+
  'peacock': [386],
  'showtime': [37],
  'starz': [43],
  'espn': [1788], // ESPN+
  'youtube': [192], // YouTube Premium
  'crunchyroll': [283],
  'funimation': [269],
};

/**
 * Get TMDb provider IDs for user's active subscriptions
 */
export const getUserProviderIds = async (userId: string): Promise<number[]> => {
  try {
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('service_name')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }

    const providerIds: number[] = [];

    for (const sub of subscriptions) {
      const serviceName = (sub.service_name || '').toLowerCase();

      // Find matching provider IDs
      for (const [key, ids] of Object.entries(SERVICE_TO_PROVIDER_MAP)) {
        if (serviceName.includes(key)) {
          providerIds.push(...ids);
        }
      }
    }

    // Remove duplicates
    return Array.from(new Set(providerIds));
  } catch (error) {
    console.error('[WatchProviders] Error getting user provider IDs:', error);
    return [];
  }
};

/**
 * Check if content is available on any of the user's providers
 */
export const isAvailableOnUserServices = async (
  contentId: number,
  mediaType: 'movie' | 'tv',
  userProviderIds: number[]
): Promise<boolean> => {
  if (userProviderIds.length === 0) return true; // If no subscriptions, don't filter

  try {
    const response = await tmdbApi.get(`/${mediaType}/${contentId}/watch/providers`);
    const providers = response.data?.results?.US; // US region only for now

    if (!providers) return false;

    // Check if available on any streaming service (flatrate)
    const streamingProviders = providers.flatrate || [];

    return streamingProviders.some((provider: any) =>
      userProviderIds.includes(provider.provider_id)
    );
  } catch (error) {
    console.error('[WatchProviders] Error checking availability:', error);
    return true; // On error, don't filter out
  }
};

/**
 * Filter array of content by user's available services
 */
export const filterByUserServices = async (
  content: Array<{ id: number; type: 'movie' | 'tv' }>,
  userProviderIds: number[]
): Promise<Set<number>> => {
  if (userProviderIds.length === 0) {
    return new Set(content.map(c => c.id)); // Return all if no filtering
  }

  const availableIds = new Set<number>();

  // Check in batches to avoid rate limiting
  const batchSize = 5;
  for (let i = 0; i < content.length; i += batchSize) {
    const batch = content.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (item) => {
        const isAvailable = await isAvailableOnUserServices(
          item.id,
          item.type,
          userProviderIds
        );

        if (isAvailable) {
          availableIds.add(item.id);
        }
      })
    );

    // Small delay between batches
    if (i + batchSize < content.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return availableIds;
};

/**
 * Get watch providers for a specific piece of content
 */
export const getWatchProviders = async (
  contentId: number,
  mediaType: 'movie' | 'tv'
): Promise<{
  streaming: Array<{ id: number; name: string; logo: string }>;
  rent: Array<{ id: number; name: string; logo: string }>;
  buy: Array<{ id: number; name: string; logo: string }>;
}> => {
  try {
    const response = await tmdbApi.get(`/${mediaType}/${contentId}/watch/providers`);
    const providers = response.data?.results?.US;

    if (!providers) {
      return { streaming: [], rent: [], buy: [] };
    }

    const formatProvider = (p: any) => ({
      id: p.provider_id,
      name: p.provider_name,
      logo: p.logo_path,
    });

    return {
      streaming: (providers.flatrate || []).map(formatProvider),
      rent: (providers.rent || []).map(formatProvider),
      buy: (providers.buy || []).map(formatProvider),
    };
  } catch (error) {
    console.error('[WatchProviders] Error getting providers:', error);
    return { streaming: [], rent: [], buy: [] };
  }
};

/**
 * Get human-readable service names from provider IDs
 */
export const getServiceNamesFromProviderIds = (providerIds: number[]): string[] => {
  const serviceNames: string[] = [];

  for (const [service, ids] of Object.entries(SERVICE_TO_PROVIDER_MAP)) {
    if (ids.some(id => providerIds.includes(id))) {
      // Capitalize first letter
      serviceNames.push(service.charAt(0).toUpperCase() + service.slice(1));
    }
  }

  return Array.from(new Set(serviceNames));
};
