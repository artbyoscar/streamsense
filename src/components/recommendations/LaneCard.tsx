/**
 * LaneCard Component
 * Compact card for displaying content in recommendation lanes
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface LaneCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage?: number;
  mediaType: 'movie' | 'tv';
  onPress?: () => void;
}

export const LaneCard: React.FC<LaneCardProps> = ({
  id,
  title,
  posterPath,
  voteAverage,
  mediaType,
  onPress,
}) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to detail screen
      navigation.navigate('Details' as never, {
        id,
        mediaType,
      } as never);
    }
  };

  const imageUrl = posterPath
    ? `https://image.tmdb.org/t/p/w342${posterPath}`
    : 'https://via.placeholder.com/120x180/333/666?text=No+Image';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.poster}
        resizeMode="cover"
      />
      {voteAverage && voteAverage > 0 && (
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>
            {voteAverage.toFixed(1)}
          </Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 120,
    marginRight: 12,
  },
  poster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    backgroundColor: '#222',
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 16,
  },
});
