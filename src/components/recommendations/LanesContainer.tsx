/**
 * LanesContainer Component
 * Container that manages multiple recommendation lanes with loading states
 */

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { recommendationOrchestrator } from '@/services/recommendationOrchestrator';
import type { RecommendationLane as LaneType } from '@/services/recommendationLanes';
import { RecommendationLane } from './RecommendationLane';
import { LaneSkeleton } from './LaneSkeleton';
import { TasteSignatureBanner } from './TasteSignatureBanner';

export const LanesContainer: React.FC = () => {
  const { user } = useAuth();
  const [lanes, setLanes] = useState<LaneType[]>([]);
  const [tasteSignature, setTasteSignature] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0.5);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendations = async (isRefresh = false) => {
    if (!user?.id) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('[LanesContainer] Loading recommendations for user:', user.id);

      // Generate lanes using orchestrator
      const generatedLanes = await recommendationOrchestrator.generateLanes(user.id);

      // Get taste profile for signature
      const profile = await recommendationOrchestrator['getUserProfile'](user.id);

      if (profile) {
        setTasteSignature(profile.tasteSignature);
        setConfidence(profile.confidence);
      }

      setLanes(generatedLanes);
      console.log('[LanesContainer] Loaded', generatedLanes.length, 'lanes');
    } catch (err) {
      console.error('[LanesContainer] Error loading recommendations:', err);
      setError('Failed to load recommendations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [user?.id]);

  const handleRefresh = () => {
    loadRecommendations(true);
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.skeletonHeader}>
          <ActivityIndicator size="small" color="#8b5cf6" />
          <Text style={styles.skeletonHeaderText}>
            Building your personalized recommendations...
          </Text>
        </View>
        <LaneSkeleton />
        <LaneSkeleton />
        <LaneSkeleton />
      </ScrollView>
    );
  }

  if (error) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8b5cf6"
          />
        }
      >
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>Pull down to try again</Text>
        </View>
      </ScrollView>
    );
  }

  if (lanes.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#8b5cf6"
          />
        }
      >
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>No recommendations yet</Text>
          <Text style={styles.emptyMessage}>
            Add some movies or shows to your watchlist to get personalized recommendations
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#8b5cf6"
        />
      }
    >
      {/* Taste Signature Banner */}
      {tasteSignature && (
        <TasteSignatureBanner
          signature={tasteSignature}
          confidence={confidence}
        />
      )}

      {/* Recommendation Lanes */}
      {lanes.map((lane) => (
        <RecommendationLane
          key={lane.id}
          id={lane.id}
          title={lane.title}
          subtitle={lane.subtitle}
          items={lane.items}
          onCardPress={(item) => {
            console.log('[LanesContainer] Card pressed:', item.title || item.name);
          }}
          onSeeAll={() => {
            console.log('[LanesContainer] See all pressed for:', lane.title);
          }}
        />
      ))}

      {/* Footer spacing */}
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  skeletonHeaderText: {
    color: '#888',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    height: 32,
  },
});
