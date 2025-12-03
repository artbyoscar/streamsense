/**
 * Genre Filter Chips Component
 * Horizontal scrolling genre pills (like Netflix's category row)
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

interface GenreFilterChipsProps {
  activeGenre: string;
  onGenreChange: (genre: string) => void;
}

const GENRES = [
  'All',
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'Anime',
];

export const GenreFilterChips: React.FC<GenreFilterChipsProps> = ({
  activeGenre,
  onGenreChange,
}) => {
  return (
    <View style={styles.genreChipsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreChips}
      >
        {GENRES.map((genre) => {
          const isActive = activeGenre === genre;

          return (
            <TouchableOpacity
              key={genre}
              style={[styles.genreChip, isActive && styles.genreChipActive]}
              onPress={() => onGenreChange(genre)}
            >
              <Text style={[styles.genreChipText, isActive && styles.genreChipTextActive]}>
                {genre}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  genreChipsContainer: {
    backgroundColor: '#0f0f0f',
    paddingVertical: 12,
    zIndex: 10,
  },
  genreChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genreChipActive: {
    backgroundColor: '#a78bfa',
    borderColor: '#a78bfa',
  },
  genreChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#ccc',
  },
  genreChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
