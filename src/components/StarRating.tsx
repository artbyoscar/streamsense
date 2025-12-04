import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StarRatingProps {
  rating: number;  // 0-10 scale from TMDb OR 0-5 scale for user ratings
  size?: number;
  showNumber?: boolean;
  color?: string;
  scale?: '10' | '5';  // Specify input scale, defaults to 10 (TMDb)
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  showNumber = true,
  color = '#fbbf24',
  scale = '10'
}) => {
  const emptyColor = '#4b5563';

  // Convert to 0-5 scale based on input scale
  const fiveStarRating = scale === '10' ? rating / 2 : rating;

  const renderStar = (index: number) => {
    const starValue = index + 1;
    
    if (fiveStarRating >= starValue) {
      // Full star
      return (
        <Ionicons key={index} name="star" size={size} color={color} />
      );
    } else if (fiveStarRating > starValue - 1 && fiveStarRating < starValue) {
      // Partial star - use overlay technique for consistent rendering
      const fillPercent = (fiveStarRating - (starValue - 1)) * 100;
      
      return (
        <View key={index} style={{ width: size, height: size, position: 'relative' }}>
          {/* Background: empty star */}
          <Ionicons 
            name="star-outline" 
            size={size} 
            color={emptyColor} 
            style={{ position: 'absolute' }}
          />
          {/* Foreground: filled star clipped to fill percentage */}
          <View 
            style={{ 
              position: 'absolute', 
              overflow: 'hidden', 
              width: (size * fillPercent) / 100,
              height: size,
            }}
          >
            <Ionicons name="star" size={size} color={color} />
          </View>
        </View>
      );
    } else {
      // Empty star
      return (
        <Ionicons key={index} name="star-outline" size={size} color={emptyColor} />
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {[0, 1, 2, 3, 4].map(renderStar)}
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