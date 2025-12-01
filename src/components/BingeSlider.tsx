import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

interface BingeSliderProps {
  showTitle: string;
  seasonNumber?: number;
  episodeDurationMinutes: number;
  maxEpisodes?: number;
  onLog: (episodes: number, totalMinutes: number) => void;
  onCancel: () => void;
  subscriptionName?: string;
  monthlyCost?: number;
}

export const BingeSlider: React.FC<BingeSliderProps> = ({
  showTitle,
  seasonNumber,
  episodeDurationMinutes,
  maxEpisodes = 10,
  onLog,
  onCancel,
  subscriptionName,
  monthlyCost = 15.99,
}) => {
  const [episodes, setEpisodes] = useState(1);
  const [lastHapticValue, setLastHapticValue] = useState(1);

  const totalMinutes = episodes * episodeDurationMinutes;
  const totalHours = totalMinutes / 60;

  // Calculate value added (at $1.50/hr break-even rate)
  const valueAdded = totalHours * 1.50;

  const handleSliderChange = useCallback((value: number) => {
    const roundedValue = Math.round(value);

    // Haptic feedback on each episode tick
    if (roundedValue !== lastHapticValue) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLastHapticValue(roundedValue);
    }

    setEpisodes(roundedValue);
  }, [lastHapticValue]);

  const handleLog = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onLog(episodes, totalMinutes);
  };

  // Format time display
  const formatTime = (mins: number): string => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Ionicons name="close" size={24} color="#9CA3AF" />
        </Pressable>
        <Text style={styles.headerTitle}>Log Watch Time</Text>
        <View style={styles.cancelButton} />
      </View>

      {/* Show Info */}
      <View style={styles.showInfo}>
        <Text style={styles.showTitle}>{showTitle}</Text>
        <Text style={styles.showMeta}>
          {seasonNumber ? `Season ${seasonNumber} • ` : ''}
          {episodeDurationMinutes} min/ep
        </Text>
      </View>

      {/* Episode Counter Display */}
      <View style={styles.counterDisplay}>
        <Text style={styles.counterNumber}>{episodes}</Text>
        <Text style={styles.counterLabel}>
          {episodes === 1 ? 'episode' : 'episodes'}
        </Text>
      </View>

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>1</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={maxEpisodes}
          step={1}
          value={episodes}
          onValueChange={handleSliderChange}
          minimumTrackTintColor="#3B82F6"
          maximumTrackTintColor="rgba(255,255,255,0.2)"
          thumbTintColor="#3B82F6"
        />
        <Text style={styles.sliderLabel}>{maxEpisodes}</Text>
      </View>

      {/* Quick Select Buttons */}
      <View style={styles.quickSelect}>
        {[1, 3, 5, 8].map((num) => (
          <Pressable
            key={num}
            style={[
              styles.quickButton,
              episodes === num && styles.quickButtonActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setEpisodes(num);
            }}
          >
            <Text
              style={[
                styles.quickButtonText,
                episodes === num && styles.quickButtonTextActive,
              ]}
            >
              {num}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Time & Value Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Ionicons name="time-outline" size={20} color="#3B82F6" />
          <Text style={styles.summaryValue}>{formatTime(totalMinutes)}</Text>
          <Text style={styles.summaryLabel}>watch time</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Ionicons name="trending-up" size={20} color="#22C55E" />
          <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
            +${valueAdded.toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>value added</Text>
        </View>
      </View>

      {/* Log Button */}
      <Pressable style={styles.logButton} onPress={handleLog}>
        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
        <Text style={styles.logButtonText}>Log {episodes} Episode{episodes !== 1 ? 's' : ''}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  showInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  showTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  showMeta: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 4,
  },
  counterDisplay: {
    alignItems: 'center',
    marginBottom: 24,
  },
  counterNumber: {
    fontSize: 72,
    fontWeight: '800',
    color: '#3B82F6',
  },
  counterLabel: {
    fontSize: 18,
    color: '#9CA3AF',
    marginTop: -8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 24,
    textAlign: 'center',
  },
  quickSelect: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  quickButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickButtonActive: {
    backgroundColor: '#3B82F6',
  },
  quickButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  quickButtonTextActive: {
    color: '#FFFFFF',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  logButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default BingeSlider;
