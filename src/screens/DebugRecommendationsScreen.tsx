/**
 * Debug Recommendations Screen
 * Comprehensive testing and validation screen for the recommendation intelligence system
 * Only visible in development mode
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../providers/ThemeProvider';
import { recommendationOrchestrator } from '../services/recommendationOrchestrator';
import { dnaComputationQueue } from '../services/dnaComputationQueue';
import { llmRecommendationService } from '../services/llmRecommendations';
import { supabase } from '../config/supabase';
import type { UserTasteProfile, ContentDNA } from '../services/contentDNA';
import type { RecommendationLane } from '../services/recommendationLanes';

export const DebugRecommendationsScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();

  // State
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserTasteProfile | null>(null);
  const [lanes, setLanes] = useState<RecommendationLane[]>([]);
  const [selectedLane, setSelectedLane] = useState<RecommendationLane | null>(null);
  const [dnaSearchId, setDnaSearchId] = useState('');
  const [dnaResult, setDnaResult] = useState<ContentDNA | null>(null);
  const [dnaSearchType, setDnaSearchType] = useState<'movie' | 'tv'>('movie');
  const [queueStatus, setQueueStatus] = useState({ queueSize: 0, processing: 0, isProcessing: false });
  const [llmRateLimit, setLlmRateLimit] = useState({ remaining: 0, limit: 5, resetAt: new Date() });

  // Load initial data
  useEffect(() => {
    if (user?.id) {
      loadProfileData();
      loadLanesData();
      loadQueueStatus();
      loadLlmRateLimit();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const profileData = await recommendationOrchestrator.getUserProfile(user.id);
      setProfile(profileData);
    } catch (error) {
      console.error('[Debug] Error loading profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const loadLanesData = async () => {
    if (!user?.id) return;

    try {
      const lanesData = await recommendationOrchestrator.generateLanes(user.id);
      setLanes(lanesData);
    } catch (error) {
      console.error('[Debug] Error loading lanes:', error);
      Alert.alert('Error', 'Failed to load recommendation lanes');
    }
  };

  const loadQueueStatus = () => {
    const status = dnaComputationQueue.getStatus();
    setQueueStatus(status);
  };

  const loadLlmRateLimit = async () => {
    try {
      const rateLimit = await llmRecommendationService.getRemainingCalls();
      setLlmRateLimit(rateLimit);
    } catch (error) {
      console.error('[Debug] Error loading LLM rate limit:', error);
    }
  };

  // Actions
  const handleRebuildProfile = async () => {
    if (!user?.id) return;

    Alert.alert(
      'Rebuild Profile',
      'This will recompute your taste profile from your watchlist. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rebuild',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await recommendationOrchestrator.updateUserProfile(user.id);
              await loadProfileData();
              Alert.alert('Success', 'Profile rebuilt successfully');
            } catch (error) {
              console.error('[Debug] Error rebuilding profile:', error);
              Alert.alert('Error', 'Failed to rebuild profile');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearDNACache = async () => {
    Alert.alert(
      'Clear DNA Cache',
      'This will delete all computed Content DNA. It will be regenerated as needed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase.from('content_dna').delete().neq('id', '00000000-0000-0000-0000-000000000000');

              if (error) throw error;

              Alert.alert('Success', 'DNA cache cleared');
            } catch (error) {
              console.error('[Debug] Error clearing DNA cache:', error);
              Alert.alert('Error', 'Failed to clear DNA cache');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRegenerateLanes = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await loadLanesData();
      Alert.alert('Success', 'Lanes regenerated successfully');
    } catch (error) {
      console.error('[Debug] Error regenerating lanes:', error);
      Alert.alert('Error', 'Failed to regenerate lanes');
    } finally {
      setLoading(false);
    }
  };

  const handleTestLLM = async () => {
    if (!user?.id || !profile) return;

    const canCall = await llmRecommendationService.hasAvailableCalls();
    if (!canCall) {
      Alert.alert('Rate Limit', `No LLM calls remaining. Resets at ${llmRateLimit.resetAt.toLocaleString()}`);
      return;
    }

    Alert.alert(
      'Test LLM Recommendation',
      'This will use one of your daily LLM calls. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await llmRecommendationService.getPersonalizedRecommendations(
                'Give me something surprising but still aligned with my taste',
                profile
              );

              await loadLlmRateLimit();

              const message = `Cached: ${response.cached}\n\nExplanation: ${response.explanation}\n\nRecommendations:\n${response.recommendations.map(r => `- ${r.title} (${r.mediaType}): ${r.reason}`).join('\n\n')}`;

              Alert.alert('LLM Response', message);
            } catch (error) {
              console.error('[Debug] Error testing LLM:', error);
              Alert.alert('Error', 'Failed to test LLM');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSearchDNA = async () => {
    if (!dnaSearchId.trim()) {
      Alert.alert('Error', 'Please enter a TMDb ID');
      return;
    }

    try {
      setLoading(true);
      const tmdbId = parseInt(dnaSearchId.trim());
      const dna = await recommendationOrchestrator.computeContentDNA(tmdbId, dnaSearchType);

      if (dna) {
        setDnaResult(dna);
      } else {
        Alert.alert('Not Found', 'No DNA found for this content');
      }
    } catch (error) {
      console.error('[Debug] Error searching DNA:', error);
      Alert.alert('Error', 'Failed to search for DNA');
    } finally {
      setLoading(false);
    }
  };

  // Render sections
  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>{title}</Text>
      {content}
    </View>
  );

  const renderProfileSection = () => {
    if (!profile) {
      return <Text style={{ color: colors.text }}>No profile data available</Text>;
    }

    return (
      <View>
        <Text style={[styles.label, { color: colors.text }]}>Taste Signature</Text>
        <Text style={[styles.value, { color: colors.text }]}>{profile.tasteSignature}</Text>

        <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Top Tones</Text>
        {Object.entries(profile.preferredTone)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([tone, value]) => (
            <View key={tone} style={styles.row}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>{tone}</Text>
              <Text style={[styles.itemValue, { color: colors.primary }]}>{Math.round(value * 100)}%</Text>
            </View>
          ))}

        <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Top Themes</Text>
        {Object.entries(profile.preferredThemes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([theme, value]) => (
            <View key={theme} style={styles.row}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>{theme}</Text>
              <Text style={[styles.itemValue, { color: colors.primary }]}>{Math.round(value * 100)}%</Text>
            </View>
          ))}

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Exploration Score</Text>
          <Text style={[styles.value, { color: colors.primary }]}>{profile.explorationScore.toFixed(2)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>Violence Tolerance</Text>
          <Text style={[styles.value, { color: colors.primary }]}>{profile.violenceTolerance.toFixed(2)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: colors.text }]}>Complexity Preference</Text>
          <Text style={[styles.value, { color: colors.primary }]}>{profile.complexityPreference.toFixed(2)}</Text>
        </View>

        <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Favorite Directors</Text>
        {profile.favoriteDirectors.slice(0, 5).map((director, idx) => (
          <Text key={idx} style={[styles.itemValue, { color: colors.text }]}>• {director.name}</Text>
        ))}

        <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Favorite Actors</Text>
        {profile.favoriteActors.slice(0, 5).map((actor, idx) => (
          <Text key={idx} style={[styles.itemValue, { color: colors.text }]}>• {actor.name}</Text>
        ))}

        <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Total Watched</Text>
        <Text style={[styles.value, { color: colors.text }]}>{profile.totalWatched}</Text>
      </View>
    );
  };

  const renderClustersSection = () => {
    if (!profile?.interestClusters || profile.interestClusters.length === 0) {
      return <Text style={{ color: colors.text }}>No clusters identified</Text>;
    }

    return (
      <View>
        {profile.interestClusters.map((cluster, idx) => (
          <View key={idx} style={styles.clusterItem}>
            <View style={styles.row}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>{cluster.name}</Text>
              <Text style={[styles.itemValue, { color: colors.primary }]}>{Math.round(cluster.strength * 100)}%</Text>
            </View>
            <Text style={[styles.itemValue, { color: colors.text, fontSize: 12, marginTop: 4 }]}>
              Seeds: {cluster.seedContent.join(', ')}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDNASection = () => (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="TMDb ID (e.g., 550)"
          placeholderTextColor={colors.text + '80'}
          value={dnaSearchId}
          onChangeText={setDnaSearchId}
          keyboardType="numeric"
        />
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeButton, dnaSearchType === 'movie' && { backgroundColor: colors.primary }]}
            onPress={() => setDnaSearchType('movie')}
          >
            <Text style={[styles.typeButtonText, { color: dnaSearchType === 'movie' ? '#fff' : colors.text }]}>Movie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, dnaSearchType === 'tv' && { backgroundColor: colors.primary }]}
            onPress={() => setDnaSearchType('tv')}
          >
            <Text style={[styles.typeButtonText, { color: dnaSearchType === 'tv' ? '#fff' : colors.text }]}>TV</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.searchButton, { backgroundColor: colors.primary }]}
        onPress={handleSearchDNA}
        disabled={loading}
      >
        <Text style={styles.searchButtonText}>Search DNA</Text>
      </TouchableOpacity>

      {dnaResult && (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.label, { color: colors.text }]}>Tone</Text>
          {Object.entries(dnaResult.tone)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tone, value]) => (
              <View key={tone} style={styles.row}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{tone}</Text>
                <Text style={[styles.itemValue, { color: colors.primary }]}>{Math.round(value * 100)}%</Text>
              </View>
            ))}

          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Themes</Text>
          {Object.entries(dnaResult.themes)
            .filter(([_, value]) => value > 0.2)
            .sort((a, b) => b[1] - a[1])
            .map(([theme, value]) => (
              <View key={theme} style={styles.row}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{theme}</Text>
                <Text style={[styles.itemValue, { color: colors.primary }]}>{Math.round(value * 100)}%</Text>
              </View>
            ))}

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Pacing</Text>
            <Text style={[styles.value, { color: colors.primary }]}>{dnaResult.pacing.slow.toFixed(2)} / {dnaResult.pacing.moderate.toFixed(2)} / {dnaResult.pacing.fast.toFixed(2)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>Complexity</Text>
            <Text style={[styles.value, { color: colors.primary }]}>{dnaResult.complexity.toFixed(2)}</Text>
          </View>

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>Violence Level</Text>
            <Text style={[styles.value, { color: colors.primary }]}>{dnaResult.violence_level.toFixed(2)}</Text>
          </View>

          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Setting</Text>
          {Object.entries(dnaResult.setting)
            .filter(([_, value]) => value > 0)
            .map(([setting, value]) => (
              <View key={setting} style={styles.row}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{setting}</Text>
                <Text style={[styles.itemValue, { color: colors.primary }]}>{Math.round(value * 100)}%</Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );

  const renderLanesSection = () => {
    if (lanes.length === 0) {
      return <Text style={{ color: colors.text }}>No lanes generated</Text>;
    }

    if (selectedLane) {
      return (
        <View>
          <TouchableOpacity onPress={() => setSelectedLane(null)} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.primary }}>← Back to lanes</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { color: colors.text }]}>Lane: {selectedLane.title}</Text>
          <Text style={[styles.value, { color: colors.text, fontSize: 12 }]}>{selectedLane.subtitle}</Text>

          <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Items ({selectedLane.items.length})</Text>
          {selectedLane.items.map((item, idx) => (
            <Text key={idx} style={[styles.itemValue, { color: colors.text }]}>
              {idx + 1}. {item.title || item.name} ({item.vote_average?.toFixed(1)}/10)
            </Text>
          ))}
        </View>
      );
    }

    return (
      <View>
        {lanes.map((lane, idx) => (
          <TouchableOpacity
            key={lane.id}
            style={[styles.laneItem, { borderColor: colors.border }]}
            onPress={() => setSelectedLane(lane)}
          >
            <View>
              <Text style={[styles.laneTitle, { color: colors.text }]}>{lane.title}</Text>
              <Text style={[styles.laneSubtitle, { color: colors.text }]}>{lane.subtitle}</Text>
            </View>
            <View style={styles.laneStats}>
              <Text style={[styles.laneCount, { color: colors.primary }]}>{lane.items.length} items</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderInterestGraphSection = () => {
    if (!profile) {
      return <Text style={{ color: colors.text }}>No profile data available</Text>;
    }

    return (
      <View>
        <Text style={[styles.label, { color: colors.text }]}>Discovery Opportunities</Text>
        {profile.discoveryOpportunities.slice(0, 10).map((opportunity, idx) => (
          <Text key={idx} style={[styles.itemValue, { color: colors.text }]}>• {opportunity}</Text>
        ))}
      </View>
    );
  };

  const renderActionsSection = () => (
    <View>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.primary }]}
        onPress={handleRebuildProfile}
        disabled={loading}
      >
        <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Rebuild Profile</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.primary }]}
        onPress={handleClearDNACache}
        disabled={loading}
      >
        <MaterialCommunityIcons name="delete" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Clear DNA Cache</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.primary }]}
        onPress={handleRegenerateLanes}
        disabled={loading}
      >
        <MaterialCommunityIcons name="refresh" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Regenerate Lanes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: colors.primary }]}
        onPress={handleTestLLM}
        disabled={loading}
      >
        <MaterialCommunityIcons name="robot" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Test LLM ({llmRateLimit.remaining}/{llmRateLimit.limit})</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text }]}>DNA Queue</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{queueStatus.queueSize}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text }]}>Processing</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>{queueStatus.processing}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: colors.text }]}>Status</Text>
          <Text style={[styles.statValue, { color: queueStatus.isProcessing ? '#4ade80' : colors.text }]}>
            {queueStatus.isProcessing ? 'Active' : 'Idle'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 20 }}>
          Please log in to view debug data
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Debug Recommendations</Text>
        <TouchableOpacity onPress={loadQueueStatus}>
          <MaterialCommunityIcons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderSection('User Profile', renderProfileSection())}
        {renderSection('Interest Clusters', renderClustersSection())}
        {renderSection('Content DNA Lookup', renderDNASection())}
        {renderSection('Recommendation Lanes', renderLanesSection())}
        {renderSection('Interest Graph', renderInterestGraphSection())}
        {renderSection('Actions', renderActionsSection())}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  value: {
    fontSize: 14,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemLabel: {
    fontSize: 14,
    flex: 1,
  },
  itemValue: {
    fontSize: 14,
  },
  clusterItem: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  typeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#333',
  },
  typeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  laneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  laneTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  laneSubtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  laneStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  laneCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
});
