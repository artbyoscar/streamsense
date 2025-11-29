/**
 * Recommendations/Tips Screen
 * Display personalized insights based on user's viewing preferences and subscriptions
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/features/auth';
import { useSubscriptionsData, formatCurrency } from '@/features/subscriptions';
import { getUserTopGenres } from '@/services/genreAffinity';
import { COLORS, Card } from '@/components';
import { supabase } from '@/config/supabase';

// TMDb Genre ID to Name mapping
const GENRE_NAMES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science Fiction', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action & Adventure', 10762: 'Kids', 10765: 'Sci-Fi & Fantasy',
  10768: 'War & Politics',
};

// Streaming service metadata for recommendations
const STREAMING_SERVICES = [
  {
    id: 'netflix',
    name: 'Netflix',
    icon: 'netflix',
    color: '#E50914',
    keywords: ['netflix'],
    genres: ['Drama', 'Comedy', 'Thriller', 'Documentary', 'Action', 'Science Fiction',
             'Horror', 'Romance', 'Crime', 'Mystery', 'Sci-Fi & Fantasy', 'Action & Adventure'],
  },
  {
    id: 'hulu',
    name: 'Hulu',
    icon: 'hulu',
    color: '#1CE783',
    keywords: ['hulu'],
    genres: ['Drama', 'Comedy', 'Animation', 'Documentary', 'Crime', 'Action & Adventure'],
  },
  {
    id: 'disney',
    name: 'Disney+',
    icon: 'castle',
    color: '#113CCF',
    keywords: ['disney', 'disney+'],
    genres: ['Family', 'Animation', 'Adventure', 'Action', 'Science Fiction', 'Fantasy',
             'Sci-Fi & Fantasy', 'Action & Adventure'],
  },
  {
    id: 'prime',
    name: 'Prime Video',
    icon: 'shopping',
    color: '#00A8E1',
    keywords: ['prime', 'amazon'],
    genres: ['Drama', 'Comedy', 'Thriller', 'Action', 'Science Fiction', 'Documentary',
             'Action & Adventure', 'Sci-Fi & Fantasy'],
  },
  {
    id: 'hbo',
    name: 'Max',
    icon: 'alpha-m-box',
    color: '#B535F6',
    keywords: ['hbo', 'max'],
    genres: ['Drama', 'Comedy', 'Documentary', 'Crime', 'Thriller', 'Horror', 'Sci-Fi & Fantasy'],
  },
  {
    id: 'apple',
    name: 'Apple TV+',
    icon: 'apple',
    color: '#555555',
    keywords: ['apple'],
    genres: ['Drama', 'Comedy', 'Thriller', 'Science Fiction', 'Documentary', 'Mystery'],
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    icon: 'mountain',
    color: '#0064FF',
    keywords: ['paramount', 'cbs'],
    genres: ['Drama', 'Comedy', 'Science Fiction', 'Action', 'Crime', 'Action & Adventure'],
  },
  {
    id: 'peacock',
    name: 'Peacock',
    icon: 'bird',
    color: '#333333',
    keywords: ['peacock', 'nbc'],
    genres: ['Drama', 'Comedy', 'Crime', 'Mystery'],
  },
];

interface ServiceRecommendation {
  service: typeof STREAMING_SERVICES[0];
  matchScore: number;
  matchingGenres: number;
  alreadyHave: boolean;
}

export const RecommendationsScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { activeSubscriptions, monthlySpend, annualSpend } = useSubscriptionsData();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userGenres, setUserGenres] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<ServiceRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [bestValue, setBestValue] = useState<typeof activeSubscriptions[0] | null>(null);
  const [worstValue, setWorstValue] = useState<typeof activeSubscriptions[0] | null>(null);
  const [potentialSavings, setPotentialSavings] = useState(0);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-run when user changes, not on every subscription update

  const loadData = async () => {
    if (!user?.id || loading) return;

    setLoading(true);
    try {
      console.log('[Tips] Loading data for user:', user.id);
      console.log('[Tips] Active subscriptions:', activeSubscriptions.length);
      activeSubscriptions.forEach(s => console.log('[Tips] - Sub:', s.service_name));

      // METHOD 1: Get genres from affinity table
      let userGenreNames: string[] = [];

      const { data: affinityData } = await supabase
        .from('user_genre_affinity')
        .select('genre_id, genre_name, affinity_score')
        .eq('user_id', user.id)
        .order('affinity_score', { ascending: false })
        .limit(10);

      if (affinityData && affinityData.length > 0) {
        userGenreNames = affinityData.map(g => g.genre_name || GENRE_NAMES[g.genre_id] || '').filter(Boolean);
        console.log('[Tips] Genres from affinity:', userGenreNames);
      }

      // METHOD 2: If no affinity data, get from watchlist genres
      if (userGenreNames.length === 0) {
        const { data: watchlistData } = await supabase
          .from('watchlist_items')
          .select('genres')
          .eq('user_id', user.id);

        if (watchlistData && watchlistData.length > 0) {
          const genreCounts: Record<number, number> = {};
          watchlistData.forEach(item => {
            if (Array.isArray(item.genres)) {
              item.genres.forEach((gid: number) => {
                genreCounts[gid] = (genreCounts[gid] || 0) + 1;
              });
            }
          });

          // Sort by count and map to names
          userGenreNames = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([gid]) => GENRE_NAMES[Number(gid)] || '')
            .filter(Boolean);

          console.log('[Tips] Genres from watchlist:', userGenreNames);
        }
      }

      // METHOD 3: Default genres if still empty
      if (userGenreNames.length === 0) {
        userGenreNames = ['Drama', 'Action', 'Comedy', 'Thriller', 'Science Fiction'];
        console.log('[Tips] Using default genres');
      }

      setUserGenres(userGenreNames);

      // Get current subscription names (normalized)
      const currentServiceKeywords: string[] = [];
      activeSubscriptions.forEach(sub => {
        const name = (sub.service_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (name) currentServiceKeywords.push(name);
      });
      console.log('[Tips] Current service keywords:', currentServiceKeywords);

      // Score streaming services
      const scored = STREAMING_SERVICES.map(service => {
        // Check if user already has this service
        const alreadyHave = service.keywords.some(keyword =>
          currentServiceKeywords.some(userKeyword =>
            userKeyword.includes(keyword) || keyword.includes(userKeyword)
          )
        );

        // Calculate genre match score
        let matchCount = 0;
        const serviceGenresLower = service.genres.map(g => g.toLowerCase());

        userGenreNames.forEach(userGenre => {
          const ug = userGenre.toLowerCase();
          if (serviceGenresLower.some(sg =>
            sg === ug ||
            sg.includes(ug) ||
            ug.includes(sg) ||
            (sg.includes('sci-fi') && ug.includes('science')) ||
            (ug.includes('sci-fi') && sg.includes('science'))
          )) {
            matchCount++;
          }
        });

        const matchScore = userGenreNames.length > 0
          ? Math.round((matchCount / Math.min(userGenreNames.length, 5)) * 100)
          : 50;

        console.log('[Tips] Service:', service.name,
          '| owned:', alreadyHave,
          '| matches:', matchCount,
          '| score:', matchScore);

        return {
          service,
          matchScore: Math.min(matchScore, 100),
          matchingGenres: matchCount,
          alreadyHave,
        };
      });

      // Sort: not owned first, then by match score
      scored.sort((a, b) => {
        if (a.alreadyHave !== b.alreadyHave) {
          return a.alreadyHave ? 1 : -1;
        }
        return b.matchScore - a.matchScore;
      });

      console.log('[Tips] Final recommendations:');
      scored.slice(0, 5).forEach(s => {
        console.log(`  ${s.service.name}: ${s.matchScore}% ${s.alreadyHave ? '(owned)' : ''}`);
      });

      setRecommendations(scored);

      // Calculate value scores
      const subsWithValue = activeSubscriptions.filter(s => s.value_score && s.value_score > 0);

      if (subsWithValue.length > 0) {
        // Best value = lowest cost per hour
        const best = subsWithValue.reduce((prev, current) =>
          (current.value_score! < prev.value_score!) ? current : prev
        );
        setBestValue(best);

        // Worst value = highest cost per hour (only if we have 2+ subscriptions)
        if (subsWithValue.length >= 2) {
          const worst = subsWithValue.reduce((prev, current) =>
            (current.value_score! > prev.value_score!) ? current : prev
          );
          // Only set worst if it's different from best
          if (worst.id !== best.id) {
            setWorstValue(worst);
          } else {
            setWorstValue(null);
          }
        } else {
          setWorstValue(null);
        }

        // Calculate potential savings if user cancels low-value services (>$3/hr)
        const lowValueSubs = subsWithValue.filter(s => s.value_score! > 3);
        const monthlySavings = lowValueSubs.reduce((sum, s) => sum + s.price, 0);
        setPotentialSavings(monthlySavings);
      } else {
        setBestValue(null);
        setWorstValue(null);
        setPotentialSavings(0);
      }
    } catch (error) {
      console.error('[Tips] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const potentialMonthlySavings = monthlySpend * 0.15; // Estimate 15% savings potential

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <Text style={[styles.title, { color: colors.text }]}>Tips & Insights</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Personalized recommendations based on your viewing preferences
      </Text>

      {/* Spending Overview */}
      <Card style={styles.overviewCard}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Your Spending</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatCurrency(monthlySpend)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              per month
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(annualSpend)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              per year
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {activeSubscriptions.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              services
            </Text>
          </View>
        </View>
      </Card>

      {/* Value Insights */}
      {(bestValue || worstValue || potentialSavings > 0) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            💰 Value Insights
          </Text>

          {bestValue && (
            <Card style={styles.valueCard}>
              <View style={styles.valueCardHeader}>
                <MaterialCommunityIcons name="trophy" size={24} color={COLORS.success} />
                <View style={styles.valueCardContent}>
                  <Text style={[styles.valueCardLabel, { color: colors.textSecondary }]}>
                    Best Value
                  </Text>
                  <Text style={[styles.valueCardTitle, { color: colors.text }]}>
                    {bestValue.service_name}
                  </Text>
                  <Text style={[styles.valueCardValue, { color: COLORS.success }]}>
                    ${bestValue.value_score?.toFixed(2)}/hr
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {worstValue && (
            <Card style={styles.valueCard}>
              <View style={styles.valueCardHeader}>
                <MaterialCommunityIcons name="alert-circle" size={24} color={COLORS.error} />
                <View style={styles.valueCardContent}>
                  <Text style={[styles.valueCardLabel, { color: colors.textSecondary }]}>
                    Low Value
                  </Text>
                  <Text style={[styles.valueCardTitle, { color: colors.text }]}>
                    {worstValue.service_name}
                  </Text>
                  <Text style={[styles.valueCardValue, { color: COLORS.error }]}>
                    ${worstValue.value_score?.toFixed(2)}/hr
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {potentialSavings > 0 && (
            <Card style={[styles.valueCard, { backgroundColor: COLORS.warning + '10' }]}>
              <View style={styles.valueCardHeader}>
                <MaterialCommunityIcons name="piggy-bank" size={24} color={COLORS.warning} />
                <View style={styles.valueCardContent}>
                  <Text style={[styles.valueCardLabel, { color: colors.textSecondary }]}>
                    Potential Monthly Savings
                  </Text>
                  <Text style={[styles.valueCardValue, { color: COLORS.warning }]}>
                    {formatCurrency(potentialSavings)}
                  </Text>
                  <Text style={[styles.valueCardHint, { color: colors.textSecondary }]}>
                    By canceling low-value services
                  </Text>
                </View>
              </View>
            </Card>
          )}
        </View>
      )}

      {/* Your Interests */}
      {userGenres.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            🎯 Your Interests
          </Text>
          <View style={styles.genreChips}>
            {userGenres.map((genre, index) => (
              <View
                key={genre}
                style={[
                  styles.genreChip,
                  { backgroundColor: index < 3 ? colors.primary + '25' : colors.card }
                ]}
              >
                <Text style={[
                  styles.genreChipText,
                  { color: index < 3 ? colors.primary : colors.text }
                ]}>
                  {genre}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Service Recommendations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📺 Service Recommendations
        </Text>

        {recommendations.length === 0 && !loading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="television" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add shows and movies to your watchlist to get personalized service recommendations
            </Text>
          </View>
        ) : (
          <View style={styles.servicesGrid}>
            {recommendations.slice(0, 6).map(({ service, matchScore, alreadyHave }) => (
              <View
                key={service.id}
                style={[
                  styles.serviceCard,
                  { backgroundColor: colors.card },
                  alreadyHave && styles.serviceCardOwned,
                ]}
              >
                <View style={[styles.serviceIcon, { backgroundColor: service.color }]}>
                  <MaterialCommunityIcons
                    name={service.icon as any}
                    size={24}
                    color="#FFFFFF"
                  />
                </View>
                <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                  {service.name}
                </Text>
                <Text style={[styles.matchScore, { color: colors.primary }]}>
                  {matchScore}% match
                </Text>
                {alreadyHave && (
                  <View style={styles.ownedBadge}>
                    <Text style={styles.ownedBadgeText}>✓ Subscribed</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Money Saving Tips */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          💡 Money-Saving Tips
        </Text>

        <Card style={styles.tipCard}>
          <MaterialCommunityIcons name="calendar-sync" size={28} color={colors.primary} />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>
              Rotate Services Monthly
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Subscribe to binge specific shows, then cancel. Most services have no cancellation fee.
            </Text>
          </View>
        </Card>

        <Card style={styles.tipCard}>
          <MaterialCommunityIcons name="account-group" size={28} color={colors.primary} />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>
              Consider Family Plans
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Family plans cost 30-50% more but support 4-6 users. Split costs with family.
            </Text>
          </View>
        </Card>

        <Card style={styles.tipCard}>
          <MaterialCommunityIcons name="sale" size={28} color={colors.primary} />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>
              Look for Annual Discounts
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Annual plans save 15-20% vs monthly. Good for services you use year-round.
            </Text>
          </View>
        </Card>

        <Card style={styles.tipCard}>
          <MaterialCommunityIcons name="link-variant" size={28} color={colors.primary} />
          <View style={styles.tipContent}>
            <Text style={[styles.tipTitle, { color: colors.text }]}>
              Check for Bundles
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Disney Bundle (Disney+, Hulu, ESPN+) saves ~$7/month. Check your phone carrier for free streaming perks.
            </Text>
          </View>
        </Card>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 20 },
  overviewCard: { marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E5E5' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  genreChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  genreChipText: { fontSize: 14, fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 24, borderRadius: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  serviceCardOwned: {
    opacity: 0.6,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  matchScore: {
    fontSize: 12,
    fontWeight: '500',
  },
  ownedBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  ownedBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tipCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  tipText: { fontSize: 13, lineHeight: 18 },
  valueCard: { marginBottom: 12 },
  valueCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valueCardContent: { flex: 1 },
  valueCardLabel: { fontSize: 12, marginBottom: 2 },
  valueCardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  valueCardValue: { fontSize: 20, fontWeight: '700' },
  valueCardHint: { fontSize: 12, marginTop: 2 },
});

export default RecommendationsScreen;
