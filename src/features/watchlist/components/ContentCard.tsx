/**
 * Content Card Component
 * Netflix-style poster card with optional badges
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Play } from 'lucide-react-native';
import { getPosterUrl } from '@/hooks/useTMDb';
import type { UnifiedContent } from '@/types';

interface ServiceInfo {
  name: string;
  color: string;
  initial: string;
  isSubscribed: boolean;
}

interface ContentCardProps {
  item: UnifiedContent | any;
  serviceBadge?: { name: string; color: string; initial: string } | null;
  showServiceBadge?: boolean;
  showMatchScore?: boolean;
  showProgress?: boolean;
  onPress: () => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  item,
  serviceBadge = null,
  showServiceBadge = false,
  showMatchScore = false,
  showProgress = false,
  onPress,
}) => {
  const posterPath = item.posterPath || item.poster_path || item.content?.poster_url;
  const posterUrl = posterPath ? getPosterUrl(posterPath, 'w342') : null;
  const title = item.title || item.name || item.content?.title || 'Unknown Title';
  const status = item.status;
  const progress = item.progress || 0;
  const matchScore = item.matchScore || item.match_score;

  // Use real service badge if provided
  const serviceInfo = showServiceBadge && serviceBadge ? serviceBadge : null;

  return (
    <TouchableOpacity style={styles.contentCard} onPress={onPress} activeOpacity={0.8}>
      {/* Poster */}
      <View style={styles.posterContainer}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} />
        ) : (
          <View style={styles.posterPlaceholder}>
            <Text style={styles.posterPlaceholderText}>{title.charAt(0)}</Text>
          </View>
        )}

        {/* Match Score Badge */}
        {showMatchScore && matchScore && (
          <View style={styles.matchScoreBadge}>
            <Text style={styles.matchScoreText}>{Math.round(matchScore * 100)}%</Text>
          </View>
        )}

        {/* Service Badge */}
        {serviceInfo && (
          <View style={[styles.serviceIndicator, { backgroundColor: serviceInfo.color }]}>
            <Text style={styles.serviceInitial}>{serviceInfo.initial}</Text>
          </View>
        )}

        {/* Progress Bar (for watching items) */}
        {showProgress && progress > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        )}

        {/* Play indicator for "Watching" status */}
        {status === 'watching' && (
          <View style={styles.playIndicator}>
            <Play size={14} color="#fff" fill="#fff" />
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.contentTitle} numberOfLines={2}>
        {title}
      </Text>

      {/* Year (extract from release_date or releaseDate) */}
      {(item.releaseDate || item.release_date || item.content?.release_date) && (
        <Text style={styles.contentYear}>
          {(item.releaseDate || item.release_date || item.content?.release_date).split('-')[0]}
        </Text>
      )}

      {/* Overview/Bio */}
      {(item.overview || item.content?.overview) && (
        <Text style={styles.contentOverview} numberOfLines={2}>
          {item.overview || item.content?.overview}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentCard: {
    width: 120,
  },
  posterContainer: {
    position: 'relative',
    width: 120,
    height: 180,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterPlaceholderText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#a78bfa',
  },
  matchScoreBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  matchScoreText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  serviceIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInitial: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ef4444',
  },
  playIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(167, 139, 250, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentTitle: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 16,
  },
  contentYear: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  contentOverview: {
    fontSize: 11,
    color: '#999',
    lineHeight: 14,
    marginTop: 4,
  },
});



