import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;  // 0-10 scale from TMDb
  size?: number;
  showNumber?: boolean;
  color?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  showNumber = true,
  color = '#fbbf24'
}) => {
  const emptyColor = '#4b5563';

  // Convert 0-10 to 0-5 scale
  const fiveStarRating = rating / 2;  // 7.9 -> 3.95

  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (fiveStarRating >= i) {
      // Full star
      stars.push(
        <Ionicons key={i} name="star" size={size} color={color} />
      );
    } else if (fiveStarRating >= i - 0.5) {
      // Half star
      stars.push(
        <Ionicons key={i} name="star-half" size={size} color={color} />
      );
    } else {
      // Empty star
      stars.push(
        <Ionicons key={i} name="star-outline" size={size} color={emptyColor} />
      );
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {stars}
      </View>
      {showNumber && (
        <Text style={[styles.rating, { fontSize: size - 2, color }]}>
          {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  rating: {
    marginLeft: 6,
    fontWeight: '600',
  },
});

export default StarRating;
