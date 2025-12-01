import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface NowWatchingTimerProps {
  contentTitle: string;
  serviceName: string;
  onStop: (durationMinutes: number) => void;
  onCancel: () => void;
}

export const NowWatchingTimer: React.FC<NowWatchingTimerProps> = ({
  contentTitle,
  serviceName,
  onStop,
  onCancel,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const startTime = useRef(Date.now());
  const appState = useRef(AppState.currentState);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - recalculate time
        const elapsed = Math.floor((Date.now() - startTime.current) / 1000);
        setSeconds(elapsed);
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // Timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStop = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(false);
    const durationMinutes = Math.ceil(seconds / 60);
    onStop(durationMinutes);
  };

  const handlePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(!isRunning);
  };

  return (
    <View style={styles.container}>
      {/* Pulsing indicator */}
      <View style={styles.pulseContainer}>
        <View style={[styles.pulseRing, isRunning && styles.pulseRingActive]} />
        <View style={styles.iconContainer}>
          <Ionicons
            name={isRunning ? 'play' : 'pause'}
            size={32}
            color="#FFFFFF"
          />
        </View>
      </View>

      <Text style={styles.nowWatching}>NOW WATCHING</Text>

      <Text style={styles.contentTitle}>{contentTitle}</Text>
      <Text style={styles.serviceName}>on {serviceName}</Text>

      <Text style={styles.timer}>{formatTime(seconds)}</Text>

      <View style={styles.buttonRow}>
        <Pressable style={styles.pauseButton} onPress={handlePause}>
          <Ionicons
            name={isRunning ? 'pause' : 'play'}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>

        <Pressable style={styles.stopButton} onPress={handleStop}>
          <Ionicons name="stop" size={24} color="#FFFFFF" />
          <Text style={styles.stopButtonText}>Stop & Rate</Text>
        </Pressable>
      </View>

      <Pressable style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel (do not log)</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pulseContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#3B82F6',
    opacity: 0.3,
  },
  pulseRingActive: {
    // Add animation in production
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowWatching: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    letterSpacing: 2,
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  serviceName: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 40,
  },
  timer: {
    fontSize: 64,
    fontWeight: '200',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginBottom: 48,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  pauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  stopButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    padding: 16,
  },
  cancelText: {
    fontSize: 15,
    color: '#6B7280',
  },
});

export default NowWatchingTimer;
