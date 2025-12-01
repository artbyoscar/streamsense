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
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/config/supabase';
import { getUserValueScores } from '@/services/valueScore';
import { getChurnRecommendations, type ChurnRecommendation } from '@/services/churnCalendar';
import { getUserTopGenres } from '@/services/genreAffinity';
import {
  getAchievementProgress,
  checkAchievements,
  getTierColor,
  type UserAchievement,
  type Achievement
} from '@/services/achievements';
import { getPileOfShame, type ShameItem } from '@/services/pileOfShame';
import { ContentDetailModal } from '@/features/watchlist/components/ContentDetailModal';
import { WatchTimeLoggerModal } from '@/features/subscriptions/components/WatchTimeLoggerModal';
import { AnimatedCarouselItem, useAnimatedCarousel } from '@/components';
import * as Haptics from 'expo-haptics';

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
  const [valueScores, setValueScores] = useState<any[]>([]);
  const [churnRecs, setChurnRecs] = useState<ChurnRecommendation[]>([]);
  const [achievements, setAchievements] = useState<{
    unlocked: UserAchievement[];
    locked: Achievement[];
    totalPoints: number;
    progress: number;
  }>({ unlocked: [], locked: [], totalPoints: 0, progress: 0 });
  const [pileOfShameData, setPileOfShameData] = useState<ShameItem[]>([]);
  const { items: pileOfShame, removeItem: removePileItem } = useAnimatedCarousel(pileOfShameData);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [showWatchTimeModal, setShowWatchTimeModal] = useState(false);

  // Handle pile item press - transform to content format and show modal
  const handlePileItemPress = useCallback((item: ShameItem) => {
    console.log('[Tips] Pile item pressed:', item.title);

    // Transform ShameItem to format expected by ContentDetailModal
    const contentItem = {
      id: item.id,
      title: item.title,
      name: item.type === 'tv' ? item.title : undefined,
      poster_path: item.posterPath,
      overview: item.overview,
      vote_average: item.rating,
      vote_count: item.voteCount,
      media_type: item.type,
      release_date: item.type === 'movie' ? `${item.releaseYear}-01-01` : undefined,
      first_air_date: item.type === 'tv' ? `${item.releaseYear}-01-01` : undefined,
    };

    setSelectedContent(contentItem);
    setShowContentModal(true);
  }, []);

  // Handle log watch time button press
  const handleLogWatchTime = useCallback((subscription: any) => {
    // Normalize the subscription object - handle multiple possible ID property names
    const normalizedSubscription = {
      ...subscription,
      id: subscription.id || subscription.subscriptionId || subscription.serviceId, // Try all possible ID properties
      service_name: subscription.service_name || subscription.serviceName || subscription.service,
      price: subscription.price || subscription.monthlyCost || 0,
    };

    console.log('[Tips] handleLogWatchTime called with:', {
      subscriptionId: normalizedSubscription.id,
      serviceName: normalizedSubscription.service_name,
      hasId: !!normalizedSubscription.id,
    });

    if (!normalizedSubscription.id || normalizedSubscription.id === 'undefined') {
      console.error('[Tips] Cannot log watch time - missing subscription ID:', subscription);
      Alert.alert('Error', 'Could not identify subscription');
      return;
    }

    console.log('[Tips] Log watch time for:', normalizedSubscription.service_name, 'ID:', normalizedSubscription.id);
    setSelectedSubscription(normalizedSubscription);
    setShowWatchTimeModal(true);
  }, []);

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

      // Load genre affinity with temporal decay
      // Recent viewing patterns are prioritized over older ones
      const topGenres = await getUserTopGenres(user.id, 10, true); // useDecay=true
      const genres = topGenres.map(g => g.genreName);
      setUserGenres(genres);

      console.log('[Tips] User genres (with temporal decay):',
        topGenres.map(g => `${g.genreName} (${g.score.toFixed(1)})`).join(', ')
      );
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

      // Load value scores
      const scores = await getUserValueScores(user.id);
      console.log('[Tips] Value scores:', scores);
      setValueScores(scores);

      // Load churn recommendations
      const churn = await getChurnRecommendations(user.id);
      console.log('[Tips] Churn recommendations:', churn);
      setChurnRecs(churn);

      // Check and award new achievements
      const newAchievements = await checkAchievements(user.id);
      if (newAchievements.length > 0) {
        console.log('[Tips] New achievements unlocked:', newAchievements);
      }

      // Load achievement progress
      const achievementData = await getAchievementProgress(user.id);
      console.log('[Tips] Achievement progress:', achievementData);
      setAchievements(achievementData);

      // Load pile of shame
      const shame = await getPileOfShame(user.id);
      console.log('[Tips] Pile of shame:', shame);
      setPileOfShameData(shame);
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

        {/* Achievements Section */}
        {achievements.unlocked.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🏆 Achievements
            </Text>

            <View style={[styles.achievementCard, { backgroundColor: colors.card }]}>
              {/* Progress Header */}
              <View style={styles.achievementHeader}>
                <View style={styles.achievementHeaderLeft}>
                  <Text style={[styles.achievementPoints, { color: colors.primary }]}>
                    {achievements.totalPoints} points
                  </Text>
                  <Text style={[styles.achievementCount, { color: colors.textSecondary }]}>
                    {achievements.unlocked.length} of {achievements.unlocked.length + achievements.locked.length} unlocked
                  </Text>
                </View>
                <Text style={[styles.achievementProgress, { color: colors.text }]}>
                  {achievements.progress}%
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressBarBg, { backgroundColor: colors.background }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${achievements.progress}%`,
                    },
                  ]}
                />
              </View>

              {/* Recent Achievements */}
              <Text style={[styles.achievementSubtitle, { color: colors.textSecondary }]}>
                Recent Unlocks
              </Text>

              {achievements.unlocked
                .sort((a, b) => b.unlockedAt.getTime() - a.unlockedAt.getTime())
                .slice(0, 3)
                .map((ua) => {
                  const tierColor = getTierColor(ua.achievement.tier);
                  return (
                    <View key={ua.achievementId} style={styles.achievementItem}>
                      <View style={styles.achievementLeft}>
                        <Text style={styles.achievementIcon}>{ua.achievement.icon}</Text>
                        <View style={styles.achievementInfo}>
                          <Text style={[styles.achievementName, { color: colors.text }]}>
                            {ua.achievement.name}
                          </Text>
                          <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>
                            {ua.achievement.description}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.tierBadge,
                          { backgroundColor: `${tierColor}20` },
                        ]}
                      >
                        <Text style={[styles.tierText, { color: tierColor }]}>
                          {ua.achievement.tier.charAt(0).toUpperCase() + ua.achievement.tier.slice(1)}
                        </Text>
                      </View>
                    </View>
                  );
                })}

              {/* Locked Achievements Preview (Next 2) */}
              {achievements.locked.length > 0 && (
                <>
                  <Text style={[styles.achievementSubtitle, { color: colors.textSecondary, marginTop: 16 }]}>
                    Next Up
                  </Text>

                  {achievements.locked.slice(0, 2).map((achievement) => (
                    <View key={achievement.id} style={[styles.achievementItem, { opacity: 0.5 }]}>
                      <View style={styles.achievementLeft}>
                        <Text style={styles.achievementIcon}>🔒</Text>
                        <View style={styles.achievementInfo}>
                          <Text style={[styles.achievementName, { color: colors.text }]}>
                            {achievement.name}
                          </Text>
                          <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>
                            {achievement.description}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          </>
        )}

        {/* Worth Discovering Section */}
        {pileOfShame.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              💎 Worth Discovering
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Expand your horizons - you might be sleeping on these highly-rated titles
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shameScrollContainer}
            >
              {pileOfShame.slice(0, 6).map((item) => (
                <AnimatedCarouselItem
                  key={`${item.type}-${item.id}`}
                  animationType="combined"
                  duration={300}
                >
                  <TouchableOpacity
                    style={[styles.shameCard, { backgroundColor: colors.card }]}
                    onPress={() => handlePileItemPress(item)}
                    activeOpacity={0.7}
                  >
                  {/* Blindspot Badge */}
                  <View style={[styles.blindspotBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.blindspotIcon}>{item.blindspotIcon}</Text>
                    <Text style={styles.blindspotLabel}>{item.blindspotLabel}</Text>
                  </View>

                  {/* Poster */}
                  {item.posterPath ? (
                    <Image
                      source={{ uri: `https://image.tmdb.org/t/p/w342${item.posterPath}` }}
                      style={styles.shamePoster}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.shamePoster, { backgroundColor: colors.background }]}>
                      <Ionicons name="film-outline" size={40} color={colors.textSecondary} />
                    </View>
                  )}

                  {/* Rating Badge */}
                  <View style={[styles.shameRatingBadge, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.shameRatingText}>
                      {item.rating.toFixed(1)}
                    </Text>
                  </View>

                  {/* Info */}
                  <View style={styles.shameInfo}>
                    <Text
                      style={[styles.shameTitle, { color: colors.text }]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text style={[styles.shameYear, { color: colors.textSecondary }]}>
                      {item.releaseYear} • {item.type === 'movie' ? '🎬' : '📺'}
                    </Text>
                    {item.genres.length > 0 && (
                      <Text
                        style={[styles.shameGenres, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {item.genres.join(', ')}
                      </Text>
                    )}
                    <View style={[styles.shameMessage, { backgroundColor: colors.background }]}>
                      <Ionicons name="information-circle" size={14} color={colors.primary} />
                      <Text
                        style={[styles.shameMessageText, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.message}
                      </Text>
                    </View>
                  </View>
                  </TouchableOpacity>
                </AnimatedCarouselItem>
              ))}
            </ScrollView>

            {pileOfShame.length > 6 && (
              <Text style={[styles.shameFooter, { color: colors.textSecondary }]}>
                +{pileOfShame.length - 6} more hidden gems worth discovering
              </Text>
            )}
          </>
        )}

        {/* Value Analysis Section */}
        {valueScores.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              💎 Subscription Value Analysis
            </Text>

            {valueScores.map((score) => {
              // Determine color based on rating
              let ratingColor: string;
              let ratingIcon: string;

              if (score.rating === 'excellent') {
                ratingColor = '#22C55E';
                ratingIcon = 'checkmark-circle';
              } else if (score.rating === 'good') {
                ratingColor = '#84CC16';
                ratingIcon = 'thumbs-up';
              } else if (score.rating === 'fair') {
                ratingColor = '#EAB308';
                ratingIcon = 'warning';
              } else if (score.rating === 'poor') {
                ratingColor = '#EF4444';
                ratingIcon = 'close-circle';
              } else {
                ratingColor = '#9CA3AF';
                ratingIcon = 'help-circle';
              }

              return (
                <View
                  key={score.subscriptionId}
                  style={[styles.valueCard, { backgroundColor: colors.card }]}
                >
                  {/* Header */}
                  <View style={styles.valueCardHeader}>
                    <Text style={[styles.valueServiceName, { color: colors.text }]}>
                      {score.serviceName}
                    </Text>
                    <View
                      style={[
                        styles.ratingBadge,
                        { backgroundColor: `${ratingColor}20` }
                      ]}
                    >
                      <Ionicons name={ratingIcon as any} size={16} color={ratingColor} />
                      <Text style={[styles.ratingText, { color: ratingColor }]}>
                        {score.rating === 'unknown' ? 'No Data' : score.rating.charAt(0).toUpperCase() + score.rating.slice(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Value Metrics */}
                  <View style={styles.valueMetricsRow}>
                    <View style={styles.valueMetric}>
                      <Text style={[styles.valueMetricAmount, { color: ratingColor }]}>
                        ${score.costPerHour.toFixed(2)}
                      </Text>
                      <Text style={[styles.valueMetricLabel, { color: colors.textSecondary }]}>
                        per hour
                      </Text>
                    </View>
                    <View style={[styles.valueMetricDivider, { backgroundColor: colors.textSecondary }]} />
                    <View style={styles.valueMetric}>
                      <Text style={[styles.valueMetricAmount, { color: colors.text }]}>
                        ${score.monthlyCost.toFixed(2)}
                      </Text>
                      <Text style={[styles.valueMetricLabel, { color: colors.textSecondary }]}>
                        monthly
                      </Text>
                    </View>
                    <View style={[styles.valueMetricDivider, { backgroundColor: colors.textSecondary }]} />
                    <View style={styles.valueMetric}>
                      <Text style={[styles.valueMetricAmount, { color: colors.text }]}>
                        {score.totalWatchHours.toFixed(1)}h
                      </Text>
                      <Text style={[styles.valueMetricLabel, { color: colors.textSecondary }]}>
                        watched
                      </Text>
                    </View>
                  </View>

                  {/* Recommendation */}
                  <View style={[styles.recommendationBox, { backgroundColor: colors.background }]}>
                    <Ionicons
                      name="bulb-outline"
                      size={16}
                      color={colors.textSecondary}
                    />
                    <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                      {score.recommendation}
                    </Text>
                  </View>

                  {/* Log Watch Time Button */}
                  <TouchableOpacity
                    style={[styles.logWatchTimeButton, { backgroundColor: colors.background }]}
                    onPress={() => handleLogWatchTime(score)}
                  >
                    <Ionicons name="time" size={20} color={colors.primary} />
                    <Text style={[styles.logWatchTimeText, { color: colors.primary }]}>
                      Log Watch Time
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        {/* Churn Recommendations */}
        {churnRecs.length > 0 && churnRecs.some(r => r.action !== 'keep') && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              🔄 Smart Cancellation Suggestions
            </Text>

            {churnRecs
              .filter(r => r.action !== 'keep')
              .map((rec) => {
                // Handle track_usage action differently
                if (rec.action === 'track_usage') {
                  return (
                    <View
                      key={rec.serviceId}
                      style={[styles.churnCard, { backgroundColor: colors.card }]}
                    >
                      <View style={styles.churnHeader}>
                        <View style={styles.churnTitleRow}>
                          <Ionicons
                            name="analytics"
                            size={24}
                            color={colors.primary}
                          />
                          <Text style={[styles.churnServiceName, { color: colors.text }]}>
                            {rec.service}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.churnActionBadge,
                            { backgroundColor: `${colors.primary}20` },
                          ]}
                        >
                          <Text style={[styles.churnActionText, { color: colors.primary }]}>
                            Track Usage
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.churnReason, { color: colors.textSecondary }]}>
                        {rec.reason}
                      </Text>

                      {/* Log Watch Time Button */}
                      <TouchableOpacity
                        style={[styles.trackUsageButton, { backgroundColor: colors.primary }]}
                        onPress={() => handleLogWatchTime(rec)}
                      >
                        <Ionicons name="time" size={20} color="#FFFFFF" />
                        <Text style={styles.trackUsageButtonText}>Log Watch Time</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                const actionColor =
                  rec.action === 'cancel_now' ? '#EF4444' : '#F59E0B';
                const actionIcon =
                  rec.action === 'cancel_now' ? 'close-circle' : 'time';

                return (
                  <View
                    key={rec.serviceId}
                    style={[styles.churnCard, { backgroundColor: colors.card }]}
                  >
                    {/* Header */}
                    <View style={styles.churnHeader}>
                      <View style={styles.churnTitleRow}>
                        <Ionicons
                          name={actionIcon as any}
                          size={24}
                          color={actionColor}
                        />
                        <Text style={[styles.churnServiceName, { color: colors.text }]}>
                          {rec.service}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.churnActionBadge,
                          { backgroundColor: `${actionColor}20` },
                        ]}
                      >
                        <Text style={[styles.churnActionText, { color: actionColor }]}>
                          {rec.action === 'cancel_now' ? 'Cancel Now' : 'Cancel Soon'}
                        </Text>
                      </View>
                    </View>

                    {/* Reason */}
                    <Text style={[styles.churnReason, { color: colors.textSecondary }]}>
                      {rec.reason}
                    </Text>

                    {/* Potential Savings */}
                    {rec.potentialSavings > 0 && (
                      <View
                        style={[
                          styles.savingsBox,
                          { backgroundColor: colors.background },
                        ]}
                      >
                        <Ionicons
                          name="cash-outline"
                          size={20}
                          color="#22C55E"
                        />
                        <Text style={[styles.savingsText, { color: '#22C55E' }]}>
                          Save ${rec.potentialSavings.toFixed(2)} over 2 months
                        </Text>
                      </View>
                    )}

                    {/* Upcoming Content */}
                    {rec.upcomingContent.length > 0 && (
                      <View style={styles.upcomingContent}>
                        <Text
                          style={[
                            styles.upcomingLabel,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Upcoming on {rec.service}:
                        </Text>
                        {rec.upcomingContent.slice(0, 2).map((content, idx) => (
                          <View key={idx} style={styles.upcomingItem}>
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color={colors.textSecondary}
                            />
                            <Text
                              style={[
                                styles.upcomingText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {content.title} -{' '}
                              {content.daysUntil
                                ? `in ${content.daysUntil} days`
                                : 'TBA'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
          </>
        )}

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

      {/* Content Detail Modal */}
      <ContentDetailModal
        visible={showContentModal}
        content={selectedContent}
        onClose={() => {
          setShowContentModal(false);
          setSelectedContent(null);
        }}
        onAddedToWatchlist={() => {
          // Remove item with animation and haptic feedback
          console.log('[Tips] Content added to watchlist, removing from pile with animation');
          if (selectedContent) {
            // Use 'success' haptic for adding to watchlist
            removePileItem(selectedContent.id, 'success');
          }
          // Refresh pile data in background
          setTimeout(() => loadData(), 400);
        }}
      />

      {/* Watch Time Logger Modal */}
      <WatchTimeLoggerModal
        visible={showWatchTimeModal}
        subscription={selectedSubscription}
        onClose={() => {
          setShowWatchTimeModal(false);
          setSelectedSubscription(null);
        }}
        onSave={() => {
          // Refresh value scores after logging watch time
          console.log('[Tips] Watch time logged, refreshing data');
          loadData();
        }}
      />
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
  // Value Analysis Styles
  valueCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  valueCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  valueServiceName: { fontSize: 18, fontWeight: '700' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  ratingText: { fontSize: 13, fontWeight: '600' },
  valueMetricsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  valueMetric: { alignItems: 'center', flex: 1 },
  valueMetricAmount: { fontSize: 22, fontWeight: '700' },
  valueMetricLabel: { fontSize: 11, marginTop: 4 },
  valueMetricDivider: { width: 1, height: 32, opacity: 0.2 },
  recommendationBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 8 },
  recommendationText: { fontSize: 13, flex: 1, lineHeight: 18 },
  logWatchTimeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8, marginTop: 12 },
  logWatchTimeText: { fontSize: 15, fontWeight: '600' },
  // Churn Recommendation Styles
  churnCard: { borderRadius: 16, padding: 16, marginBottom: 16 },
  churnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  churnTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  churnServiceName: { fontSize: 18, fontWeight: '700' },
  churnActionBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  churnActionText: { fontSize: 12, fontWeight: '600' },
  churnReason: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  savingsBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 8, marginBottom: 12 },
  savingsText: { fontSize: 14, fontWeight: '600' },
  upcomingContent: { paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(128, 128, 128, 0.1)' },
  upcomingLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  upcomingItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  upcomingText: { fontSize: 13, flex: 1 },
  trackUsageButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 12, gap: 8 },
  trackUsageButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  // Achievement Styles
  achievementCard: { borderRadius: 16, padding: 20, marginBottom: 24 },
  achievementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  achievementHeaderLeft: { flex: 1 },
  achievementPoints: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  achievementCount: { fontSize: 13 },
  achievementProgress: { fontSize: 28, fontWeight: '700' },
  progressBarBg: { height: 8, borderRadius: 4, marginBottom: 20, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  achievementSubtitle: { fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  achievementItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  achievementLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  achievementIcon: { fontSize: 32, marginRight: 12 },
  achievementInfo: { flex: 1 },
  achievementName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  achievementDesc: { fontSize: 13, lineHeight: 18 },
  tierBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  tierText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Pile of Shame Styles
  sectionSubtitle: { fontSize: 14, marginBottom: 16, marginTop: -8 },
  shameScrollContainer: { paddingRight: 20, gap: 12 },
  shameCard: { width: 160, borderRadius: 12, overflow: 'hidden', marginRight: 0 },
  shamePoster: { width: '100%', height: 200, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
  shameRatingBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  shameRatingText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  shameInfo: { padding: 12 },
  shameTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4, lineHeight: 18 },
  shameYear: { fontSize: 12, marginBottom: 4 },
  shameGenres: { fontSize: 11, marginBottom: 8 },
  shameMessage: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 8, borderRadius: 8, marginTop: 4 },
  shameMessageText: { fontSize: 11, flex: 1, lineHeight: 14 },
  shameFooter: { fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 8 },
  // Blindspot Badge Styles
  blindspotBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
    zIndex: 10,
  },
  blindspotIcon: {
    fontSize: 14,
  },
  blindspotLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default RecommendationsScreen;
