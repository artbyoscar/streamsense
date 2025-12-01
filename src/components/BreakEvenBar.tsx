import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface BreakEvenBarProps {
  serviceName: string;
  serviceIcon?: string;
  monthlyCost: number;
  hoursWatched: number;
  onPress?: () => void;
}

const STATUS_COLORS = {
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  lightGreen: '#84CC16',
  green: '#22C55E',
  diamond: '#3B82F6',
};

export const BreakEvenBar: React.FC<BreakEvenBarProps> = ({
  serviceName,
  serviceIcon,
  monthlyCost,
  hoursWatched,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const animatedPulse = useRef(new Animated.Value(1)).current;

  // Calculate break-even data
  const BREAK_EVEN_RATE = 1.50;
  const breakEvenHours = monthlyCost / BREAK_EVEN_RATE;
  const percentComplete = Math.min((hoursWatched / breakEvenHours) * 100, 100);
  const currentRate = hoursWatched > 0 ? monthlyCost / hoursWatched : 0;
  const hoursRemaining = Math.max(breakEvenHours - hoursWatched, 0);

  // Determine status and color
  let status: keyof typeof STATUS_COLORS;
  let message: string;

  if (percentComplete >= 100) {
    status = hoursWatched >= breakEvenHours * 2 ? 'diamond' : 'green';
    message = '✓ Paid off!';
  } else if (percentComplete >= 75) {
    status = 'lightGreen';
    message = `${hoursRemaining.toFixed(1)}h to break even`;
  } else if (percentComplete >= 50) {
    status = 'yellow';
    message = `${hoursRemaining.toFixed(1)}h to break even`;
  } else if (percentComplete >= 25) {
    status = 'orange';
    message = `${hoursRemaining.toFixed(1)}h to break even`;
  } else {
    status = 'red';
    message = hoursWatched === 0
      ? 'Log some watch time!'
      : `${hoursRemaining.toFixed(1)}h to break even`;
  }

  const barColor = STATUS_COLORS[status];

  // Animate bar fill
  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentComplete,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Pulse animation when fully paid
    if (percentComplete >= 100) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedPulse, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(animatedPulse, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [percentComplete]);

  const widthInterpolate = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ scale: animatedPulse }] }
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.serviceInfo}>
          {serviceIcon && (
            <View style={[styles.iconContainer, { backgroundColor: barColor + '20' }]}>
              <Ionicons name={serviceIcon as any} size={20} color={barColor} />
            </View>
          )}
          <Text style={styles.serviceName}>{serviceName}</Text>
        </View>
        <Text style={styles.cost}>${monthlyCost.toFixed(2)}/mo</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.barBackground}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: widthInterpolate,
              backgroundColor: barColor,
            },
          ]}
        />
        {/* Gradient overlay for liquid effect */}
        <Animated.View
          style={[
            styles.barShine,
            { width: widthInterpolate },
          ]}
        />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          {hoursWatched.toFixed(1)} hrs watched
        </Text>
        <Text style={styles.statsDivider}>•</Text>
        <Text style={[styles.statsText, { color: barColor }]}>
          {currentRate > 0 ? `$${currentRate.toFixed(2)}/hr` : '--'}
        </Text>
        <Text style={styles.statsDivider}>•</Text>
        <Text style={styles.statsText}>
          {message}
        </Text>
      </View>

      {/* Motivational Message for low progress */}
      {percentComplete < 50 && hoursWatched > 0 && (
        <View style={[styles.nudgeContainer, { backgroundColor: barColor + '15' }]}>
          <Ionicons name="bulb" size={16} color={barColor} />
          <Text style={[styles.nudgeText, { color: barColor }]}>
            Watch a 2-hour movie to add ${(monthlyCost / breakEvenHours * 2).toFixed(2)} in value!
          </Text>
        </View>
      )}

      {/* Celebration for break-even */}
      {percentComplete >= 100 && (
        <View style={[styles.nudgeContainer, { backgroundColor: barColor + '15' }]}>
          <Ionicons name="trophy" size={16} color={barColor} />
          <Text style={[styles.nudgeText, { color: barColor }]}>
            {status === 'diamond'
              ? 'Amazing value! You are a streaming champion!'
              : 'You have broken even this month!'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(30, 30, 30, 1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  serviceName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cost: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  barBackground: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statsText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  statsDivider: {
    fontSize: 13,
    color: '#4B5563',
    marginHorizontal: 8,
  },
  nudgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  nudgeText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});

export default BreakEvenBar;
