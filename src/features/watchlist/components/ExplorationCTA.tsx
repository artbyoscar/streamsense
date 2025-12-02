/**
 * Exploration CTA Component
 * Bottom section encouraging discovery
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass, ArrowRight } from 'lucide-react-native';

interface ExplorationCTAProps {
  onPress: () => void;
}

export const ExplorationCTA: React.FC<ExplorationCTAProps> = ({ onPress }) => {
  return (
    <View style={styles.explorationContainer}>
      <LinearGradient
        colors={['#1a1a1a', '#2a1a3a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.explorationGradient}
      >
        <Compass size={32} color="#a78bfa" />
        <Text style={styles.explorationTitle}>Want more recommendations?</Text>
        <Text style={styles.explorationSubtitle}>
          Swipe through personalized picks in Discover mode
        </Text>
        <TouchableOpacity style={styles.explorationButton} onPress={onPress}>
          <Text style={styles.explorationButtonText}>Open Discover</Text>
          <ArrowRight size={18} color="#000" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  explorationContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 40,
    borderRadius: 16,
    overflow: 'hidden',
  },
  explorationGradient: {
    padding: 32,
    alignItems: 'center',
  },
  explorationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  explorationSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  explorationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  explorationButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
  },
});
