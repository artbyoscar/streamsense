import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_HOURS = 10;
const HOUR_HEIGHT = SCREEN_HEIGHT / (MAX_HOURS + 4); // Height per hour

interface WatchTimeSliderProps {
  serviceName: string;
  monthlyPrice: number;
  currentHours: number;
  onSave: (hours: number) => void;
  onClose: () => void;
}

export const WatchTimeSlider: React.FC<WatchTimeSliderProps> = ({
  serviceName,
  monthlyPrice,
  currentHours,
  onSave,
  onClose,
}) => {
  const translateY = useSharedValue(0);
  const [hours, setHours] = useState(currentHours);
  const lastHapticHour = useSharedValue(Math.floor(currentHours));

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = event.translationY;
      
      // Calculate hours from drag position (inverted: dragging up increases hours)
      // Base hours + (-translation / height)
      const deltaHours = -event.translationY / HOUR_HEIGHT;
      const newHours = Math.max(0, Math.min(MAX_HOURS, currentHours + deltaHours));
      
      // Trigger haptic at each whole hour
      const wholeHour = Math.floor(newHours);
      if (wholeHour !== lastHapticHour.value) {
        lastHapticHour.value = wholeHour;
        runOnJS(triggerHaptic)();
      }
      
      runOnJS(setHours)(Math.round(newHours * 10) / 10);
    })
    .onEnd(() => {
      translateY.value = withSpring(0);
      // Update base hours for next drag
      // In a real implementation, we might want to update currentHours prop or local state base
    });

  const costPerHour = hours > 0 ? monthlyPrice / hours : monthlyPrice;
  
  // Value rating thresholds
  const getValueRating = (cph: number) => {
    if (hours === 0) return { label: 'START WATCHING', color: '#6B7280' };
    if (cph < 0.50) return { label: 'EXCELLENT', color: '#22C55E' };
    if (cph < 1.00) return { label: 'GREAT', color: '#84CC16' };
    if (cph < 2.00) return { label: 'GOOD', color: '#EAB308' };
    if (cph < 4.00) return { label: 'FAIR', color: '#F97316' };
    return { label: 'POOR', color: '#EF4444' };
  };

  const rating = getValueRating(costPerHour);

  // Animated background gradient based on value
  const animatedBackground = useAnimatedStyle(() => {
    const progress = Math.min(hours / 5, 1); // 5 hours = green
    const backgroundColor = interpolateColor(
      progress,
      [0, 0.5, 1],
      ['#7F1D1D', '#78350F', '#14532D'] // Deep red → amber → deep green
    );
    return { backgroundColor };
  });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedBackground]}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialCommunityIcons name="close" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.serviceName}>{serviceName}</Text>
          
          <View style={styles.hoursContainer}>
            <Text style={styles.hoursValue}>{hours.toFixed(1)}</Text>
            <Text style={styles.hoursLabel}>hours this month</Text>
          </View>
          
          <View style={styles.costContainer}>
            <Text style={styles.costValue}>
              ${costPerHour.toFixed(2)}
            </Text>
            <Text style={styles.costLabel}>per hour</Text>
            <View style={[styles.ratingBadge, { backgroundColor: rating.color }]}>
              <Text style={styles.ratingText}>{rating.label}</Text>
            </View>
          </View>
          
          <View style={styles.instructionContainer}>
            <MaterialCommunityIcons name="gesture-swipe-vertical" size={32} color="rgba(255,255,255,0.6)" />
            <Text style={styles.instruction}>Drag up or down to adjust</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={() => onSave(hours)}
        >
          <Text style={styles.saveButtonText}>Save Watch Time</Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 32,
    fontWeight: '800',
    color: 'white',
    marginBottom: 40,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  hoursContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  hoursValue: {
    fontSize: 80,
    fontWeight: '900',
    color: 'white',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  hoursLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: -10,
  },
  costContainer: {
    alignItems: 'center',
    marginBottom: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  costValue: {
    fontSize: 36,
    fontWeight: '700',
    color: 'white',
  },
  costLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  ratingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ratingText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  instructionContainer: {
    alignItems: 'center',
    opacity: 0.8,
  },
  instruction: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
});
