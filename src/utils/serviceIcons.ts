/**
 * Centralized Service Icon Mapping
 * Single source of truth for all streaming service icons
 */

export interface ServiceIconConfig {
  icon: string;
  family: 'material-community' | 'ionicons';
}

/**
 * Service icon mappings with fallbacks
 * Uses MaterialCommunityIcons by default
 */
export const SERVICE_ICONS: Record<string, ServiceIconConfig> = {
  // Netflix
  'netflix': { icon: 'netflix', family: 'material-community' },

  // Hulu
  'hulu': { icon: 'hulu', family: 'material-community' },

  // Amazon Prime Video - Using play-box since 'amazon' icon is not available in all versions
  'amazon prime': { icon: 'play-box', family: 'material-community' },
  'amazon prime video': { icon: 'play-box', family: 'material-community' },
  'prime video': { icon: 'play-box', family: 'material-community' },

  // Disney+ - No official icon, use star-circle
  'disney+': { icon: 'star-circle', family: 'material-community' },
  'disney plus': { icon: 'star-circle', family: 'material-community' },
  'disneyplus': { icon: 'star-circle', family: 'material-community' },
  'disney': { icon: 'star-circle', family: 'material-community' },

  // Max (HBO Max)
  'max': { icon: 'alpha-m-circle', family: 'material-community' },
  'hbo max': { icon: 'hbo', family: 'material-community' },
  'hbo': { icon: 'hbo', family: 'material-community' },

  // Apple TV+
  'apple tv+': { icon: 'apple', family: 'material-community' },
  'apple tv plus': { icon: 'apple', family: 'material-community' },
  'apple tv': { icon: 'apple', family: 'material-community' },

  // Paramount+
  'paramount+': { icon: 'alpha-p-circle', family: 'material-community' },
  'paramount plus': { icon: 'alpha-p-circle', family: 'material-community' },
  'paramount': { icon: 'movie-filter', family: 'material-community' },

  // Peacock - Using bird since feather may not be available in all versions
  'peacock': { icon: 'bird', family: 'material-community' },

  // Spotify
  'spotify': { icon: 'spotify', family: 'material-community' },

  // YouTube
  'youtube': { icon: 'youtube', family: 'material-community' },
  'youtube premium': { icon: 'youtube', family: 'material-community' },

  // Apple Music
  'apple music': { icon: 'apple', family: 'material-community' },
};

/**
 * Get service icon configuration with fallback
 * Normalizes service name and returns icon config
 *
 * @param serviceName - Name of the service
 * @returns Icon configuration with family and icon name
 */
export const getServiceIcon = (serviceName: string): ServiceIconConfig => {
  if (!serviceName) {
    return { icon: 'television', family: 'material-community' };
  }

  // Normalize the service name
  const normalized = serviceName.toLowerCase().trim();

  // Check exact match first
  if (SERVICE_ICONS[normalized]) {
    return SERVICE_ICONS[normalized];
  }

  // Check partial matches for common services
  if (normalized.includes('netflix')) return SERVICE_ICONS['netflix'];
  if (normalized.includes('hulu')) return SERVICE_ICONS['hulu'];
  if (normalized.includes('amazon') || normalized.includes('prime')) {
    return SERVICE_ICONS['amazon prime'];
  }
  if (normalized.includes('disney')) return SERVICE_ICONS['disney+'];
  if (normalized.includes('max') || normalized.includes('hbo')) {
    return normalized.includes('hbo') ? SERVICE_ICONS['hbo'] : SERVICE_ICONS['max'];
  }
  if (normalized.includes('apple tv')) return SERVICE_ICONS['apple tv+'];
  if (normalized.includes('paramount')) return SERVICE_ICONS['paramount+'];
  if (normalized.includes('peacock')) return SERVICE_ICONS['peacock'];
  if (normalized.includes('spotify')) return SERVICE_ICONS['spotify'];
  if (normalized.includes('youtube')) return SERVICE_ICONS['youtube'];
  if (normalized.includes('apple music')) return SERVICE_ICONS['apple music'];

  // Default fallback for unknown services
  return { icon: 'television', family: 'material-community' };
};

/**
 * Get just the icon name (backwards compatible)
 * @param serviceName - Name of the service
 * @returns Icon name string
 */
export const getServiceIconName = (serviceName: string): string => {
  return getServiceIcon(serviceName).icon;
};
