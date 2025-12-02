/**
 * Hero Spotlight Component
 * Large featured recommendation (like Netflix's auto-playing hero)
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Info, Star } from 'lucide-react-native';
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
  const matchScore = item.matchScore || item.match_score || 0.85;
  const rating = item.rating || item.vote_average || 0;
  const year = item.releaseDate?.split('-')[0] || item.release_date?.split('-')[0] || 'N/A';
  const mediaType = item.type || item.media_type || 'movie';

  return (
    <View style={styles.heroContainer}>
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
        {/* Match Badge */}
        <View style={styles.matchBadge}>
          <Text style={styles.matchPercentage}>{Math.round(matchScore * 100)}% Match</Text>
        </View>

        {/* Title */}
        <Text style={styles.heroTitle} numberOfLines={2}>
          {title}
        </Text>

        {/* Meta Row */}
        <View style={styles.heroMeta}>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#fbbf24" fill="#fbbf24" />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.heroMetaText}>{year}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.heroMetaText}>{mediaType === 'tv' ? 'Series' : 'Movie'}</Text>
        </View>

        {/* Service Availability (placeholder) */}
        <View style={styles.serviceRow}>
          <View style={[styles.serviceBadge, { backgroundColor: '#E50914' }]}>
            <Text style={styles.serviceBadgeText}>Netflix</Text>
          </View>
          <Text style={styles.includedText}>Included in your subscription</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.primaryButton} onPress={onAddToList}>
            <Plus size={20} color="#000" />
            <Text style={styles.primaryButtonText}>My List</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onViewDetails}>
            <Info size={20} color="#fff" />
            <Text style={styles.secondaryButtonText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
  },
  matchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  matchPercentage: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '700',
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  serviceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  serviceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  includedText: {
    color: '#22c55e',
    fontSize: 12,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
