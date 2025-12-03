/**
 * Watch Providers Service
 * Filter content by streaming availability based on user's subscriptions
 */

import { tmdbApi } from './tmdb';
import { supabase } from '@/config/supabase';

// Service badge display configuration
export const SERVICE_BADGES: Record<string, { name: string; color: string; initial: string }> = {
  'netflix': { name: 'Netflix', color: '#E50914', initial: 'N' },
  'hulu': { name: 'Hulu', color: '#1CE783', initial: 'H' },
  'disney+': { name: 'Disney+', color: '#113CCF', initial: 'D' },
  'disney': { name: 'Disney+', color: '#113CCF', initial: 'D' },
  'amazon prime video': { name: 'Prime', color: '#00A8E1', initial: 'P' },
  'prime': { name: 'Prime', color: '#00A8E1', initial: 'P' },
  'amazon': { name: 'Prime', color: '#00A8E1', initial: 'P' },
  'max': { name: 'Max', color: '#002BE7', initial: 'M' },
  'hbo max': { name: 'Max', color: '#002BE7', initial: 'M' },
  'hbo': { name: 'Max', color: '#002BE7', initial: 'M' },
  'apple tv+': { name: 'Apple TV+', color: '#000000', initial: 'A' },
  'apple': { name: 'Apple TV+', color: '#000000', initial: 'A' },
  'paramount+': { name: 'Paramount+', color: '#0064FF', initial: 'P+' },
  'paramount': { name: 'Paramount+', color: '#0064FF', initial: 'P+' },
  'peacock': { name: 'Peacock', color: '#000000', initial: 'Pk' },
  'crunchyroll': { name: 'Crunchyroll', color: '#F47521', initial: 'CR' },
  'discovery+': { name: 'Discovery+', color: '#1E4497', initial: 'D+' },
  'funimation': { name: 'Funimation', color: '#5B0BB5', initial: 'F' },
};

// Reverse map: provider ID to service key
export const PROVIDER_ID_TO_SERVICE: Record<number, string> = {
  8: 'netflix',
  15: 'hulu',
  337: 'disney+',
  9: 'prime',
  119: 'prime',
  1899: 'max',
  384: 'max',
  350: 'apple tv+',
  531: 'paramount+',
  386: 'peacock',
  283: 'crunchyroll',
  520: 'discovery+',
  269: 'funimation',
};

// Map service names to TMDb provider IDs (US region)
const SERVICE_TO_PROVIDER_MAP: Record<string, number[]> = {
  'netflix': [8],
  'hulu': [15],
  'disney': [337],
  'disney+': [337],
  'prime': [9, 119],
  'amazon': [9, 119],
  'max': [1899, 384],
  'hbo': [1899, 384],
  'apple': [350],
  'paramount': [531],
  'peacock': [386],
  'showtime': [37],
  'starz': [43],
  'espn': [1788],
  'youtube': [192],
  'crunchyroll': [283],
  'funimation': [269],
};

export const getUserProviderIds = async (userId: string): Promise<number[]> => {
  try {
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('service_name')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) return [];

    const providerIds: number[] = [];
    for (const sub of subscriptions) {
      const serviceName = (sub.service_name || '').toLowerCase();
      for (const [key, ids] of Object.entries(SERVICE_TO_PROVIDER_MAP)) {
        if (serviceName.includes(key)) {
          providerIds.push(...ids);
        }
      }
    }
    return Array.from(new Set(providerIds));
  } catch (error) {
    console.error('[WatchProviders] Error getting user provider IDs:', error);
    return [];
  }
};

export const getUserSubscriptionNames = async (userId: string): Promise<string[]> => {
  try {
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('service_name')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) return [];
    return subscriptions.map(sub => sub.service_name.toLowerCase());
  } catch (error) {
    console.error('[WatchProviders] Error getting subscription names:', error);
    return [];
  }
};

export const isAvailableOnUserServices = async (
  contentId: number,
  mediaType: 'movie' | 'tv',
  userProviderIds: number[]
): Promise<boolean> => {
  if (userProviderIds.length === 0) return true;

  try {
    const response = await tmdbApi.get(`/${mediaType}/${contentId}/watch/providers`);
    const providers = response.data?.results?.US;
    if (!providers) return false;

    const streamingProviders = providers.flatrate || [];
    return streamingProviders.some((provider: any) =>
      userProviderIds.includes(provider.provider_id)
    );
  } catch (error) {
    console.error('[WatchProviders] Error checking availability:', error);
    return true;
  }
};

export const filterByUserServices = async (
  content: Array<{ id: number; type: 'movie' | 'tv' }>,
  userProviderIds: number[]
): Promise<Set<number>> => {
  if (userProviderIds.length === 0) {
    return new Set(content.map(c => c.id));
  }

  const availableIds = new Set<number>();
  const batchSize = 5;

  for (let i = 0; i < content.length; i += batchSize) {
    const batch = content.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (item) => {
        const isAvailable = await isAvailableOnUserServices(item.id, item.type, userProviderIds);
        if (isAvailable) availableIds.add(item.id);
      })
    );
    if (i + batchSize < content.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  return availableIds;
};

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

    if (!providers) return { streaming: [], rent: [], buy: [] };

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

export const getServiceNamesFromProviderIds = (providerIds: number[]): string[] => {
  const serviceNames: string[] = [];
  for (const [service, ids] of Object.entries(SERVICE_TO_PROVIDER_MAP)) {
    if (ids.some(id => providerIds.includes(id))) {
      serviceNames.push(service.charAt(0).toUpperCase() + service.slice(1));
    }
  }
  return Array.from(new Set(serviceNames));
};

export const getContentServiceBadge = async (
  contentId: number,
  mediaType: 'movie' | 'tv',
  userSubscriptions: string[]
): Promise<{ name: string; color: string; initial: string } | null> => {
  try {
    const providers = await getWatchProviders(contentId, mediaType);
    if (!providers?.streaming?.length) return null;

    const contentProviderIds = providers.streaming.map((p) => p.id);

    for (const providerId of contentProviderIds) {
      const serviceKey = PROVIDER_ID_TO_SERVICE[providerId];
      if (serviceKey) {
        const hasService = userSubscriptions.some(
          sub => sub.toLowerCase().includes(serviceKey.toLowerCase()) ||
                 serviceKey.toLowerCase().includes(sub.toLowerCase())
        );
        if (hasService && SERVICE_BADGES[serviceKey]) {
          return SERVICE_BADGES[serviceKey];
        }
      }
    }
    return null;
  } catch (error) {
    console.log('[WatchProviders] Error fetching badge:', error);
    return null;
  }
};

export const batchGetServiceBadges = async (
  items: Array<{ id: number; media_type?: string; type?: string }>,
  userSubscriptions: string[]
): Promise<Map<number, { name: string; color: string; initial: string }>> => {
  const badgeMap = new Map();

  if (!userSubscriptions.length || !items.length) return badgeMap;

  const batchSize = 5;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (item) => {
        const mediaType = (item.media_type || item.type || 'movie') as 'movie' | 'tv';
        const badge = await getContentServiceBadge(item.id, mediaType, userSubscriptions);
        return { id: item.id, badge };
      })
    );
    results.forEach(({ id, badge }) => {
      if (badge) badgeMap.set(id, badge);
    });
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  return badgeMap;
};
