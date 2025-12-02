/**
 * LaneSkeleton Component
 * Loading skeleton for recommendation lanes
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export const CardSkeleton: React.FC = () => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.poster} />
      <View style={styles.title} />
    </Animated.View>
  );
};

export const LaneSkeleton: React.FC = () => {
  return (
    <View style={styles.lane}>
      <View style={styles.header}>
        <View style={styles.headerTitle} />
        <View style={styles.headerSubtitle} />
      </View>
      <View style={styles.scrollContent}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  lane: {
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerTitle: {
    width: 200,
    height: 20,
    backgroundColor: '#222',
    borderRadius: 4,
    marginBottom: 8,
  },
  headerSubtitle: {
    width: 150,
    height: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
  },
  scrollContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  card: {
    width: 120,
    marginRight: 12,
  },
  poster: {
    width: 120,
    height: 180,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  title: {
    width: 100,
    height: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    marginTop: 8,
  },
});
