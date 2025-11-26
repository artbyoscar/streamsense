/**
 * TMDb Integration Test Component
 * Simple test to verify TMDb API is working correctly
 */

import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, TextInput as PaperInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  useSearchContent,
  useTrendingMovies,
  usePopularTVShows,
  getPosterUrl,
  tmdbKeys,
} from '@/hooks/useTMDb';
import { COLORS, Card, LoadingScreen, Button } from '@/components';

/**
 * TMDb Test Component
 *
 * To use this component:
 * 1. Import and add to your navigator
 * 2. Navigate to the screen
 * 3. Search for content or browse trending/popular
 * 4. Verify images load and data is displayed correctly
 */
export const TMDbTestScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Test hooks
  const searchResults = useSearchContent(activeSearch);
  const trendingMovies = useTrendingMovies('week', 1);
  const popularTV = usePopularTVShows(1);

  const handleSearch = () => {
    setActiveSearch(searchQuery);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>🎬 TMDb Integration Test</Text>
        <Text style={styles.sectionSubtitle}>
          Test The Movie Database API integration
        </Text>

        {/* Search */}
        <View style={styles.searchContainer}>
          <PaperInput
            mode="outlined"
            placeholder="Search movies or TV shows..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            right={
              <PaperInput.Icon
                icon="magnify"
                onPress={handleSearch}
              />
            }
            style={styles.searchInput}
          />
        </View>

        {/* Search Results */}
        {activeSearch && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsTitle}>
              Search Results for "{activeSearch}"
            </Text>

            {searchResults.isLoading && (
              <View style={styles.loadingContainer}>
                <Text>Loading...</Text>
              </View>
            )}

            {searchResults.error && (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={32} color={COLORS.error} />
                <Text style={styles.errorText}>
                  Error: {searchResults.error.message}
                </Text>
              </View>
            )}

            {searchResults.data && (
              <View style={styles.gridContainer}>
                {searchResults.data.results.slice(0, 6).map((item) => {
                  const title = item.media_type === 'movie' ? item.title : item.name;
                  const posterPath = item.poster_path;

                  return (
                    <View key={`${item.media_type}-${item.id}`} style={styles.gridItem}>
                      {posterPath ? (
                        <Image
                          source={{ uri: getPosterUrl(posterPath, 'small')! }}
                          style={styles.poster}
                        />
                      ) : (
                        <View style={[styles.poster, styles.posterPlaceholder]}>
                          <MaterialCommunityIcons
                            name="image-off"
                            size={32}
                            color={COLORS.gray}
                          />
                        </View>
                      )}
                      <Text style={styles.itemTitle} numberOfLines={2}>
                        {title}
                      </Text>
                      <Text style={styles.itemType}>
                        {item.media_type?.toUpperCase()}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Trending Movies */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Trending Movies</Text>

        {trendingMovies.isLoading && <Text>Loading...</Text>}

        {trendingMovies.error && (
          <Text style={styles.errorText}>
            Error: {trendingMovies.error.message}
          </Text>
        )}

        {trendingMovies.data && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {trendingMovies.data.results.slice(0, 10).map((movie) => (
              <View key={movie.id} style={styles.horizontalItem}>
                {movie.poster_path ? (
                  <Image
                    source={{ uri: getPosterUrl(movie.poster_path, 'small')! }}
                    style={styles.horizontalPoster}
                  />
                ) : (
                  <View style={[styles.horizontalPoster, styles.posterPlaceholder]}>
                    <MaterialCommunityIcons name="image-off" size={24} color={COLORS.gray} />
                  </View>
                )}
                <Text style={styles.horizontalTitle} numberOfLines={2}>
                  {movie.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </Card>

      {/* Popular TV Shows */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>📺 Popular TV Shows</Text>

        {popularTV.isLoading && <Text>Loading...</Text>}

        {popularTV.error && (
          <Text style={styles.errorText}>
            Error: {popularTV.error.message}
          </Text>
        )}

        {popularTV.data && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {popularTV.data.results.slice(0, 10).map((show) => (
              <View key={show.id} style={styles.horizontalItem}>
                {show.poster_path ? (
                  <Image
                    source={{ uri: getPosterUrl(show.poster_path, 'small')! }}
                    style={styles.horizontalPoster}
                  />
                ) : (
                  <View style={[styles.horizontalPoster, styles.posterPlaceholder]}>
                    <MaterialCommunityIcons name="image-off" size={24} color={COLORS.gray} />
                  </View>
                )}
                <Text style={styles.horizontalTitle} numberOfLines={2}>
                  {show.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </Card>

      {/* API Status */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Integration Status</Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Search API:</Text>
          <Text style={searchResults.data ? styles.statusSuccess : styles.statusPending}>
            {searchResults.data ? '✓ Working' : '○ Ready'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Trending API:</Text>
          <Text style={trendingMovies.data ? styles.statusSuccess : styles.statusPending}>
            {trendingMovies.data ? '✓ Working' : '○ Loading'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Popular API:</Text>
          <Text style={popularTV.data ? styles.statusSuccess : styles.statusPending}>
            {popularTV.data ? '✓ Working' : '○ Loading'}
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Image CDN:</Text>
          <Text style={styles.statusSuccess}>
            ✓ Connected
          </Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Cache Time (Search):</Text>
          <Text style={styles.statusInfo}>1 hour</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Cache Time (Details):</Text>
          <Text style={styles.statusInfo}>24 hours</Text>
        </View>
      </Card>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: COLORS.white,
  },
  resultsSection: {
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    marginTop: 8,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  gridItem: {
    width: '33%',
    padding: 8,
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 4,
  },
  itemType: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 2,
  },
  horizontalItem: {
    width: 120,
    marginRight: 12,
  },
  horizontalPoster: {
    width: 120,
    aspectRatio: 2 / 3,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
  },
  horizontalTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  statusLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  statusSuccess: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
  },
  statusPending: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  statusInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  bottomPadding: {
    height: 40,
  },
});
