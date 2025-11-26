/**
 * OptimizedImage Component
 * Wrapper around expo-image with caching and performance optimizations
 */

import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Image, ImageProps, ImageContentFit } from 'expo-image';
import { COLORS } from './theme';

interface OptimizedImageProps {
  source: string | { uri: string } | number;
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
  contentFit?: ImageContentFit;
  placeholder?: string;
  blurhash?: string;
  priority?: 'low' | 'normal' | 'high';
  cachePolicy?: 'memory' | 'disk' | 'memory-disk';
  onLoad?: () => void;
  onError?: (error: any) => void;
  style?: any;
  borderRadius?: number;
}

/**
 * Optimized image component with caching and loading states
 *
 * @example
 * // Basic usage
 * <OptimizedImage
 *   source={{ uri: 'https://...' }}
 *   width={100}
 *   height={100}
 * />
 *
 * @example
 * // With blurhash placeholder
 * <OptimizedImage
 *   source={{ uri: 'https://...' }}
 *   aspectRatio={16/9}
 *   blurhash="LGF5?xYk^6#M@-5c,1J5@[or[Q6."
 * />
 *
 * @example
 * // High priority (for above-the-fold images)
 * <OptimizedImage
 *   source={{ uri: 'https://...' }}
 *   priority="high"
 *   cachePolicy="memory-disk"
 * />
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = React.memo(({
  source,
  width = '100%',
  height,
  aspectRatio,
  contentFit = 'cover',
  placeholder,
  blurhash,
  priority = 'normal',
  cachePolicy = 'memory-disk',
  onLoad,
  onError,
  style,
  borderRadius,
}) => {
  // Convert source to proper format
  const imageSource = typeof source === 'string' ? { uri: source } : source;

  // Calculate height from aspectRatio if not provided
  const calculatedHeight = height || (aspectRatio ? undefined : width);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height: calculatedHeight,
          aspectRatio,
          borderRadius,
          overflow: borderRadius ? 'hidden' : undefined,
        },
        style,
      ]}
    >
      <Image
        source={imageSource}
        placeholder={placeholder || blurhash}
        contentFit={contentFit}
        priority={priority}
        cachePolicy={cachePolicy}
        onLoad={onLoad}
        onError={onError}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
        transition={200}
      />
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// ============================================================================
// AVATAR COMPONENT
// ============================================================================

interface AvatarProps {
  source?: string | { uri: string };
  name?: string;
  size?: number;
  borderRadius?: number;
}

/**
 * Avatar component with fallback initials
 *
 * @example
 * <Avatar source={{ uri: avatarUrl }} name="John Doe" size={48} />
 */
export const Avatar: React.FC<AvatarProps> = React.memo(({
  source,
  name,
  size = 40,
  borderRadius,
}) => {
  const initials = name
    ? name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: borderRadius || size / 2,
        },
      ]}
    >
      {source ? (
        <OptimizedImage
          source={source}
          width={size}
          height={size}
          contentFit="cover"
          borderRadius={borderRadius || size / 2}
          priority="low"
        />
      ) : (
        <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: borderRadius || size / 2 }]}>
          <Text style={[styles.avatarText, { fontSize: size / 2.5 }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
});

Avatar.displayName = 'Avatar';

// ============================================================================
// LOGO COMPONENT
// ============================================================================

interface LogoProps {
  source: string | { uri: string };
  size?: number;
  name?: string;
}

/**
 * Service logo with fallback
 *
 * @example
 * <Logo source={{ uri: logoUrl }} name="Netflix" size={40} />
 */
export const Logo: React.FC<LogoProps> = React.memo(({
  source,
  size = 40,
  name,
}) => {
  return (
    <View style={[styles.logo, { width: size, height: size }]}>
      <OptimizedImage
        source={source}
        width={size}
        height={size}
        contentFit="contain"
        borderRadius={8}
        priority="low"
        onError={() => {
          // Could show fallback with service name initial
          console.log(`Failed to load logo for ${name}`);
        }}
      />
    </View>
  );
});

Logo.displayName = 'Logo';

// ============================================================================
// STYLES
// ============================================================================

import { Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  avatar: {
    overflow: 'hidden',
  },
  avatarFallback: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  logo: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
