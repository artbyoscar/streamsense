/**
 * Recommendations/Tips Screen
 * Display personalized insights based on user's viewing preferences and subscriptions
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/config/supabase';

// Streaming services with genres they're known for
const STREAMING_SERVICES = [
  {
    id: 'netflix',
    name: 'Netflix',
    price: 15.49,
    color: '#E50914',
    icon: 'play-circle',
    genres: ['Drama', 'Comedy', 'Thriller', 'Documentary', 'Action', 'Science Fiction'],
    keywords: ['netflix'],
  },
  {
    id: 'hulu',
    name: 'Hulu',
    price: 7.99,
    color: '#1CE783',
    icon: 'tv',
    genres: ['Drama', 'Comedy', 'Animation', 'Documentary', 'Crime'],
    keywords: ['hulu'],
  },
  {
    id: 'disney',
    name: 'Disney+',
    price: 7.99,
    color: '#113CCF',
    icon: 'star',
    genres: ['Family', 'Animation', 'Adventure', 'Action', 'Science Fiction'],
    keywords: ['disney', 'disney+'],
  },
  {
    id: 'prime',
    name: 'Prime Video',
    price: 8.99,
    color: '#00A8E1',
    icon: 'bag',
    genres: ['Drama', 'Comedy', 'Thriller', 'Action', 'Science Fiction'],
    keywords: ['prime', 'amazon'],
  },
  {
    id: 'max',
    name: 'Max',
    price: 15.99,
    color: '#002BE7',
    icon: 'videocam',
    genres: ['Drama', 'Comedy', 'Documentary', 'Crime', 'Thriller'],
    keywords: ['max', 'hbo'],
  },
  {
    id: 'apple',
    name: 'Apple TV+',
    price: 9.99,
    color: '#555555',
    icon: 'logo-apple',
    genres: ['Drama', 'Comedy', 'Thriller', 'Science Fiction'],
    keywords: ['apple'],
  },
];

export const RecommendationsScreen: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [serviceRecs, setServiceRecs] = useState<any[]>([]);
  const [spending, setSpending] = useState({ monthly: 0, yearly: 0, count: 0 });
  const [userGenres, setUserGenres] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load subscriptions for spending
      const { data: subs, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (subsError) {
        console.error('[Tips] Error loading subscriptions:', subsError);
      }

      console.log('[Tips] Loaded subscriptions:', subs);

      // The monthly_cost field might be named differently - try multiple field names
      const monthly = (subs || []).reduce((sum, s) => {
        const cost = s.monthly_cost || s.cost || s.price || 0;
        console.log('[Tips] Sub:', s.service_name || s.name, 'Cost:', cost);
        return sum + cost;
      }, 0);

      console.log('[Tips] Total monthly:', monthly);

      setSpending({
        monthly,
        yearly: monthly * 12,
        count: subs?.length || 0,
      });

      // Load genre affinity
      const { data: affinity } = await supabase
        .from('user_genre_affinity')
        .select('genre_name')
        .eq('user_id', user.id)
        .order('affinity_score', { ascending: false })
        .limit(10);

      const genres = (affinity || []).map(a => a.genre_name);
      setUserGenres(genres);

      console.log('[Tips] User genres:', genres);
      console.log('[Tips] User subscriptions:', subs?.length);

      // Score services
      const scored = STREAMING_SERVICES.map(service => {
        const matchCount = service.genres.filter(g =>
          genres.some(ug => ug.toLowerCase().includes(g.toLowerCase()))
        ).length;

        const matchScore = genres.length > 0
          ? Math.round((matchCount / Math.min(genres.length, 5)) * 100)
          : 0;

        const alreadyHave = (subs || []).some(sub =>
          service.keywords.some(kw =>
            (sub.service_name || sub.name || '').toLowerCase().includes(kw)
          )
        );

        return {
          ...service,
          matchScore: Math.min(matchScore, 100),
          matchCount,
          alreadyHave,
        };
      });

      // Sort: unsubscribed first, then by score
      scored.sort((a, b) => {
        if (a.alreadyHave !== b.alreadyHave) return a.alreadyHave ? 1 : -1;
        return b.matchScore - a.matchScore;
      });

      console.log('[Tips] Service recommendations:', scored.map(s => ({
        name: s.name,
        score: s.matchScore,
        have: s.alreadyHave,
      })));

      setServiceRecs(scored);
    } catch (error) {
      console.error('[Tips] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const savingTips = [
    {
      icon: 'swap-horizontal',
      title: 'Rotate Services Monthly',
      description: 'Subscribe to binge specific shows, then cancel. Most services have no cancellation fee.',
    },
    {
      icon: 'people',
      title: 'Consider Family Plans',
      description: 'Family plans cost 30-50% more but support 4-6 users. Split costs with family.',
    },
    {
      icon: 'pricetag',
      title: 'Look for Annual Discounts',
      description: 'Annual plans save 15-20% vs monthly. Good for services you use year-round.',
    },
    {
      icon: 'link',
      title: 'Check for Bundles',
      description: 'Disney Bundle (Disney+, Hulu, ESPN+) saves ~$7/month. Check your phone carrier for free perks.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
      >
        <Text style={[styles.title, { color: colors.text }]}>Tips & Insights</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Personalized recommendations based on your viewing preferences
        </Text>

        {/* Spending Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>
            Your Spending
          </Text>
          <View style={styles.spendingRow}>
            <View style={styles.spendingItem}>
              <Text style={[styles.spendingAmount, { color: '#22C55E' }]}>
                ${spending.monthly.toFixed(2)}
              </Text>
              <Text style={[styles.spendingLabel, { color: colors.textSecondary }]}>
                per month
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.textSecondary }]} />
            <View style={styles.spendingItem}>
              <Text style={[styles.spendingAmount, { color: colors.text }]}>
                ${spending.yearly.toFixed(2)}
              </Text>
              <Text style={[styles.spendingLabel, { color: colors.textSecondary }]}>
                per year
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.textSecondary }]} />
            <View style={styles.spendingItem}>
              <Text style={[styles.spendingAmount, { color: colors.primary }]}>
                {spending.count}
              </Text>
              <Text style={[styles.spendingLabel, { color: colors.textSecondary }]}>
                services
              </Text>
            </View>
          </View>
        </View>

        {/* Service Recommendations */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          📺 Service Recommendations
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : serviceRecs.length > 0 ? (
          <View style={styles.servicesGrid}>
            {serviceRecs.slice(0, 4).map((service) => (
              <View
                key={service.id}
                style={[styles.serviceCard, { backgroundColor: colors.card }]}
              >
                <View
                  style={[
                    styles.serviceIcon,
                    { backgroundColor: `${service.color}20` },
                  ]}
                >
                  <Ionicons
                    name={service.icon as any}
                    size={28}
                    color={service.color}
                  />
                </View>
                <Text style={[styles.serviceName, { color: colors.text }]}>
                  {service.name}
                </Text>
                <Text style={[styles.servicePrice, { color: colors.textSecondary }]}>
                  ${service.price.toFixed(2)}/mo
                </Text>
                {service.alreadyHave ? (
                  <View style={styles.subscribedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                    <Text style={styles.subscribedText}>Subscribed</Text>
                  </View>
                ) : service.matchScore > 0 ? (
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{service.matchScore}% match</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="tv-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add content to your watchlist to get personalized recommendations
            </Text>
          </View>
        )}

        {/* Money-Saving Tips */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          💡 Money-Saving Tips
        </Text>

        {savingTips.map((tip, index) => (
          <View key={index} style={[styles.tipCard, { backgroundColor: colors.card }]}>
            <View style={[styles.tipIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name={tip.icon as any} size={24} color={colors.primary} />
            </View>
            <View style={styles.tipContent}>
              <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title}</Text>
              <Text style={[styles.tipDescription, { color: colors.textSecondary }]}>
                {tip.description}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  card: { borderRadius: 16, padding: 20, marginBottom: 24 },
  cardLabel: { fontSize: 14, marginBottom: 12 },
  spendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spendingItem: { alignItems: 'center', flex: 1 },
  spendingAmount: { fontSize: 24, fontWeight: '700' },
  spendingLabel: { fontSize: 12, marginTop: 4 },
  divider: { width: 1, height: 40, opacity: 0.2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  serviceCard: { width: '47%', borderRadius: 16, padding: 16, alignItems: 'center' },
  serviceIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  serviceName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  servicePrice: { fontSize: 14, marginBottom: 8 },
  matchBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  matchText: { color: '#3B82F6', fontSize: 12, fontWeight: '600' },
  subscribedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subscribedText: { color: '#22C55E', fontSize: 12, fontWeight: '600' },
  emptyCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24 },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 12 },
  tipCard: { flexDirection: 'row', borderRadius: 16, padding: 16, marginBottom: 12 },
  tipIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  tipDescription: { fontSize: 14, lineHeight: 20 },
});

export default RecommendationsScreen;
