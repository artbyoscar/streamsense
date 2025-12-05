/**
 * Hero Spotlight Component
 * Large featured recommendation (like Netflix's auto-playing hero)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Star } from 'lucide-react-native';
import type { UnifiedContent } from '@/types';

interface HeroSpotlightProps {
  item: UnifiedContent | any;
  onAddToList: () => void;
  onViewDetails: () => void;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  item,
  onAddToList,
  onViewDetails,
}) => {
  const backdropUrl = item.backdropPath || item.backdrop_path
    ? `https://image.tmdb.org/t/p/w780${item.backdropPath || item.backdrop_path}`
    : null;

  const title = item.title || item.name || 'Unknown Title';
  const rating = item.rating || item.vote_average || 0;
  const year = item.releaseDate?.split('-')[0] || item.release_date?.split('-')[0] || '';
  const mediaType = item.type || item.media_type || 'movie';
  const streamingServices = item.streaming_services || [];

  return (
    <TouchableOpacity
      style={styles.heroContainer}
      onPress={onViewDetails}
      activeOpacity={0.95}
    >
      {/* Backdrop Image */}
      {backdropUrl && (
        <Image source={{ uri: backdropUrl }} style={styles.heroBackdrop} />
      )}

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(15,15,15,0.6)', '#0f0f0f']}
        locations={[0.3, 0.7, 1]}
        style={styles.heroGradient}
      />

      {/* Content */}
      <View style={styles.heroContent}>
        {/* Title */}
        <Text style={styles.heroTitle} numberOfLines={2}>
          {title}
        </Text>

        {/* Meta Row */}
        <View style={styles.heroMeta}>
          {rating > 0 && (
            <>
              <View style={styles.ratingBadge}>
                <Star size={12} color="#fbbf24" fill="#fbbf24" />
                <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.metaDot}>•</Text>
            </>
          )}
          {year && (
            <>
              <Text style={styles.heroMetaText}>{year}</Text>
              <Text style={styles.metaDot}>•</Text>
            </>
          )}
          <Text style={styles.heroMetaText}>{mediaType === 'tv' ? 'Series' : 'Movie'}</Text>
        </View>

        {/* Streaming Services - Show real data */}
        {streamingServices.length > 0 && (
          <View style={styles.serviceRow}>
            {streamingServices.slice(0, 3).map((service: string, index: number) => (
              <View key={index} style={styles.serviceBadge}>
                <Text style={styles.serviceBadgeText}>{service}</Text>
              </View>
            ))}
            {streamingServices.length > 3 && (
              <Text style={styles.moreServices}>
                +{streamingServices.length - 3} more
              </Text>
            )}
          </View>
        )}

        {/* Action Buttons - Only Add to List */}
        <View style={styles.heroActions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={(e) => {
              e.stopPropagation();
              onAddToList();
            }}
          >
            <Plus size={20} color="#000" />
            <Text style={styles.primaryButtonText}>Add to List</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  heroContainer: {
    height: 420,
    marginBottom: 24,
    position: 'relative',
  },
  heroBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 36,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
  },
  metaDot: {
    color: '#666',
  },
  heroMetaText: {
    color: '#ccc',
    fontSize: 14,
  },
  serviceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  serviceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  serviceBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  moreServices: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    alignSelf: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
});
