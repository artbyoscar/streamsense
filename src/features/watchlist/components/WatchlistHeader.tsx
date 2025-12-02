/**
 * Watchlist Header Component
 * Shows title and user's taste signature
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, Sparkles } from 'lucide-react-native';

interface WatchlistHeaderProps {
  tasteSignature?: string;
  onSearchPress: () => void;
}

export const WatchlistHeader: React.FC<WatchlistHeaderProps> = ({
  tasteSignature,
  onSearchPress,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Watchlist</Text>
        <TouchableOpacity style={styles.searchButton} onPress={onSearchPress}>
          <Search size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {tasteSignature && (
        <View style={styles.tasteSignatureContainer}>
          <Sparkles size={14} color="#a78bfa" />
          <Text style={styles.tasteSignature}>{tasteSignature}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#0f0f0f',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tasteSignatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tasteSignature: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
});
