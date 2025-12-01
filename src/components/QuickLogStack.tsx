import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface ContentCard {
  id: number;
  title: string;
  posterUrl: string;
  serviceName: string;
  releaseYear?: string;
}

interface QuickLogStackProps {
  cards: ContentCard[];
  onSwipeRight: (card: ContentCard) => void;  // Watched
  onSwipeLeft: (card: ContentCard) => void;   // Skip
  onSwipeUp: (card: ContentCard) => void;     // Want to watch
  onEmpty: () => void;
}

export const QuickLogStack: React.FC<QuickLogStackProps> = ({
  cards,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  onEmpty,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const currentCard = cards[currentIndex];
  const nextCard = cards[currentIndex + 1];

  const handleSwipeComplete = (direction: 'left' | 'right' | 'up') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const card = cards[currentIndex];
    if (direction === 'right') onSwipeRight(card);
    else if (direction === 'left') onSwipeLeft(card);
    else onSwipeUp(card);

    if (currentIndex >= cards.length - 1) {
      onEmpty();
    } else {
      setCurrentIndex((i) => i + 1);
    }

    translateX.value = 0;
    translateY.value = 0;
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(SCREEN_WIDTH * 1.5);
        runOnJS(handleSwipeComplete)('right');
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-SCREEN_WIDTH * 1.5);
        runOnJS(handleSwipeComplete)('left');
      } else if (event.translationY < -SWIPE_THRESHOLD) {
        translateY.value = withSpring(-500);
        runOnJS(handleSwipeComplete)('up');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${translateX.value / 20}deg` },
    ],
  }));

  const watchedOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(translateX.value / SWIPE_THRESHOLD, 1),
  }));

  const skipOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(-translateX.value / SWIPE_THRESHOLD, 1),
  }));

  const wantOpacity = useAnimatedStyle(() => ({
    opacity: Math.min(-translateY.value / SWIPE_THRESHOLD, 1),
  }));

  if (!currentCard) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>All caught up!</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Next card (behind) */}
      {nextCard && (
        <View style={[styles.card, styles.nextCard]}>
          <Image
            source={{ uri: nextCard.posterUrl }}
            style={styles.poster}
          />
        </View>
      )}

      {/* Current card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          <Image
            source={{ uri: currentCard.posterUrl }}
            style={styles.poster}
          />

          {/* Overlay labels */}
          <Animated.View style={[styles.label, styles.watchedLabel, watchedOpacity]}>
            <Text style={styles.labelText}>WATCHED ✓</Text>
          </Animated.View>

          <Animated.View style={[styles.label, styles.skipLabel, skipOpacity]}>
            <Text style={styles.labelText}>SKIP</Text>
          </Animated.View>

          <Animated.View style={[styles.label, styles.wantLabel, wantOpacity]}>
            <Text style={styles.labelText}>WANT TO WATCH</Text>
          </Animated.View>

          {/* Card info */}
          <View style={styles.cardInfo}>
            <Text style={styles.title}>{currentCard.title}</Text>
            <Text style={styles.meta}>
              {currentCard.serviceName} • {currentCard.releaseYear}
            </Text>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>← Skip</Text>
        <Text style={styles.instructionText}>↑ Want to watch</Text>
        <Text style={styles.instructionText}>Watched →</Text>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_WIDTH * 1.25,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
    position: 'absolute',
  },
  nextCard: {
    transform: [{ scale: 0.95 }],
    opacity: 0.5,
  },
  poster: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  label: {
    position: 'absolute',
    top: 40,
    padding: 12,
    borderRadius: 8,
    borderWidth: 3,
  },
  watchedLabel: {
    right: 20,
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  skipLabel: {
    left: 20,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  wantLabel: {
    alignSelf: 'center',
    left: '25%',
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  labelText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  meta: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  instructions: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
});

export default QuickLogStack;
