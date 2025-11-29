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

// Streaming service metadata for recommendations
const STREAMING_SERVICES = [
  {
    id: 'netflix',
    name: 'Netflix',
    price: 15.49,
    genres: ['Drama', 'Comedy', 'Documentary', 'Sci-Fi & Fantasy', 'Mystery'],
    strengths: 'Original series, International content, K-dramas',
    icon: 'netflix',
  },
  {
    id: 'hulu',
    name: 'Hulu',
    price: 7.99,
    genres: ['Comedy', 'Drama', 'Reality', 'Animation'],
    strengths: 'Next-day TV episodes, FX originals',
    icon: 'hulu',
  },
  {
    id: 'disney',
    name: 'Disney+',
    price: 7.99,
    genres: ['Animation', 'Family', 'Adventure', 'Sci-Fi & Fantasy'],
    strengths: 'Marvel, Star Wars, Pixar, Disney classics',
    icon: 'castle',
  },
  {
    id: 'max',
    name: 'Max',
    price: 15.99,
    genres: ['Drama', 'Documentary', 'Comedy', 'Crime'],
    strengths: 'HBO prestige TV, Warner Bros films',
    icon: 'television-classic',
  },
  {
    id: 'prime',
    name: 'Prime Video',
    price: 8.99,
    genres: ['Action', 'Comedy', 'Drama', 'Thriller'],
    strengths: 'Thursday Night Football, wide rental catalog',
    icon: 'shopping',
  },
  {
    id: 'apple',
    name: 'Apple TV+',
    price: 9.99,
    genres: ['Drama', 'Comedy', 'Sci-Fi & Fantasy', 'Documentary'],
    strengths: 'Award-winning originals, high production value',
    icon: 'apple',
  },
  {
    id: 'peacock',
    name: 'Peacock',
    price: 5.99,
    genres: ['Comedy', 'Drama', 'Reality', 'Sports'],
    strengths: 'The Office, NBC content, sports',
    icon: 'bird',
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    price: 5.99,
    genres: ['Drama', 'Reality', 'Comedy', 'Action'],
    strengths: 'Star Trek, CBS shows, NFL games',
    icon: 'star-circle',
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    price: 7.99,
    genres: ['Animation', 'Action & Adventure', 'Comedy', 'Drama'],
    strengths: 'Largest anime library, simulcast new episodes',
    icon: 'animation',
  },
];

interface ServiceRecommendation {
  service: typeof STREAMING_SERVICES[0];
  matchScore: number;
  matchingGenres: string[];
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
  }, [user?.id, activeSubscriptions]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const topGenres = await getUserTopGenres(user.id, 6);
      const genreNames = topGenres.map(g => g.genreName);
      setUserGenres(genreNames);

      // Get user's current service names (lowercase for matching)
      const currentServices = activeSubscriptions.map(s =>
        s.service_name?.toLowerCase().trim()
      ).filter(Boolean);

      // Score each streaming service
      const scored: ServiceRecommendation[] = STREAMING_SERVICES.map(service => {
        const matchingGenres = service.genres.filter(serviceGenre =>
          genreNames.some(userGenre => {
            const sg = serviceGenre.toLowerCase();
            const ug = userGenre.toLowerCase();
            return sg.includes(ug) || ug.includes(sg) ||
                   sg.split(' ').some(w => ug.includes(w)) ||
                   ug.split(' ').some(w => sg.includes(w));
          })
        );

        const alreadyHave = currentServices.some(cs =>
          cs?.includes(service.id) ||
          cs?.includes(service.name.toLowerCase()) ||
          service.name.toLowerCase().includes(cs || '')
        );

        return {
          service,
          matchScore: matchingGenres.length / service.genres.length,
          matchingGenres,
          alreadyHave,
        };
      });

      // Sort: services user doesn't have first, then by match score
      scored.sort((a, b) => {
        if (a.alreadyHave !== b.alreadyHave) {
          return a.alreadyHave ? 1 : -1;
        }
        return b.matchScore - a.matchScore;
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

        // Worst value = highest cost per hour
        const worst = subsWithValue.reduce((prev, current) =>
          (current.value_score! > prev.value_score!) ? current : prev
        );
        setWorstValue(worst);

        // Calculate potential savings if user cancels low-value services (>$3/hr)
        const lowValueSubs = subsWithValue.filter(s => s.value_score! > 3);
        const monthlySavings = lowValueSubs.reduce((sum, s) => sum + s.price, 0);
        setPotentialSavings(monthlySavings);
      }
    } catch (error) {
      console.error('Error loading tips data:', error);
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

        {userGenres.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialCommunityIcons name="playlist-plus" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add shows and movies to your watchlist to get personalized service recommendations
            </Text>
          </Card>
        ) : (
          recommendations.slice(0, 5).map(rec => (
            <Card
              key={rec.service.id}
              style={[
                styles.recCard,
                rec.alreadyHave && { opacity: 0.7 }
              ]}
            >
              <View style={styles.recHeader}>
                <View style={styles.recLeft}>
                  <MaterialCommunityIcons
                    name={rec.service.icon as any}
                    size={28}
                    color={colors.primary}
                  />
                  <View style={styles.recInfo}>
                    <View style={styles.recNameRow}>
                      <Text style={[styles.recName, { color: colors.text }]}>
                        {rec.service.name}
                      </Text>
                      {rec.alreadyHave && (
                        <View style={[styles.haveBadge, { backgroundColor: COLORS.success + '20' }]}>
                          <Text style={[styles.haveBadgeText, { color: COLORS.success }]}>
                            ✓ You have this
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.recPrice, { color: colors.textSecondary }]}>
                      {formatCurrency(rec.service.price)}/month
                    </Text>
                  </View>
                </View>
                <View style={[
                  styles.matchBadge,
                  { backgroundColor: rec.matchScore >= 0.5 ? COLORS.success + '20' : colors.card }
                ]}>
                  <Text style={[
                    styles.matchText,
                    { color: rec.matchScore >= 0.5 ? COLORS.success : colors.textSecondary }
                  ]}>
                    {Math.round(rec.matchScore * 100)}%
                  </Text>
                </View>
              </View>

              {rec.matchingGenres.length > 0 && (
                <Text style={[styles.recMatch, { color: colors.primary }]}>
                  Matches: {rec.matchingGenres.join(', ')}
                </Text>
              )}
              <Text style={[styles.recStrengths, { color: colors.textSecondary }]}>
                {rec.service.strengths}
              </Text>
            </Card>
          ))
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
  emptyCard: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  recCard: { marginBottom: 12 },
  recHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  recInfo: { flex: 1 },
  recNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  recName: { fontSize: 17, fontWeight: '700' },
  recPrice: { fontSize: 14, marginTop: 2 },
  haveBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  haveBadgeText: { fontSize: 11, fontWeight: '600' },
  matchBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  matchText: { fontSize: 14, fontWeight: '700' },
  recMatch: { fontSize: 13, fontWeight: '600', marginTop: 10 },
  recStrengths: { fontSize: 13, marginTop: 4, lineHeight: 18 },
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
