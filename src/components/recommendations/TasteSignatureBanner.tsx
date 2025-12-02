/**
 * TasteSignatureBanner Component
 * Displays user's taste profile signature at the top of recommendations
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface TasteSignatureBannerProps {
  signature: string;
  confidence?: number;
}

export const TasteSignatureBanner: React.FC<TasteSignatureBannerProps> = ({
  signature,
  confidence = 0.5,
}) => {
  const getConfidenceColor = (conf: number) => {
    if (conf > 0.7) return '#4ade80'; // green
    if (conf > 0.4) return '#fbbf24'; // yellow
    return '#f87171'; // red
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf > 0.7) return 'Strong';
    if (conf > 0.4) return 'Good';
    return 'Learning';
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialIcons name="psychology" size={24} color="#8b5cf6" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.label}>Your Taste</Text>
        <Text style={styles.signature}>{signature}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: getConfidenceColor(confidence) + '20' }]}>
        <Text style={[styles.badgeText, { color: getConfidenceColor(confidence) }]}>
          {getConfidenceLabel(confidence)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6' + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  signature: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
