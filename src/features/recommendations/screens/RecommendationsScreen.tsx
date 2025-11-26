/**
 * Recommendations Screen
 * Display AI-powered subscription optimization recommendations
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSubscriptionsStore } from '@/features/subscriptions';
import {
  generateRecommendations,
  calculateTotalSavings,
  type Recommendation,
  type RecommendationType,
} from '@/services/recommendations';
import { COLORS, Card, LoadingScreen, EmptyState, Button } from '@/components';

// ============================================================================
// CONSTANTS
// ============================================================================

const RECOMMENDATION_ICONS: Record<RecommendationType, string> = {
  BUNDLE_OPPORTUNITY: 'package-variant',
  UNUSED_SERVICE: 'sleep',
  PRICE_INCREASE: 'trending-up',
  ROTATION_SUGGESTION: 'sync',
};

const RECOMMENDATION_COLORS: Record<RecommendationType, string> = {
  BUNDLE_OPPORTUNITY: COLORS.success,
  UNUSED_SERVICE: COLORS.warning,
  PRICE_INCREASE: COLORS.error,
  ROTATION_SUGGESTION: COLORS.primary,
};

const RECOMMENDATION_LABELS: Record<RecommendationType, string> = {
  BUNDLE_OPPORTUNITY: 'Bundle Opportunity',
  UNUSED_SERVICE: 'Unused Service',
  PRICE_INCREASE: 'Price Increase',
  ROTATION_SUGGESTION: 'Rotation Tip',
};

// ============================================================================
// RECOMMENDATION CARD COMPONENT
// ============================================================================

interface RecommendationCardProps {
  recommendation: Recommendation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAccept: () => void;
  onDismiss: () => void;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  isExpanded,
  onToggleExpand,
  onAccept,
  onDismiss,
}) => {
  const icon = RECOMMENDATION_ICONS[recommendation.type];
  const color = RECOMMENDATION_COLORS[recommendation.type];
  const label = RECOMMENDATION_LABELS[recommendation.type];

  // Get action steps based on type
  const getActionSteps = (): string[] => {
    switch (recommendation.type) {
      case 'BUNDLE_OPPORTUNITY':
        return [
          `Visit ${recommendation.metadata.bundleName} official website`,
          'Compare bundle features with your current subscriptions',
          'Sign up for the bundle plan',
          'Cancel individual subscriptions after bundle is active',
          `Start saving $${recommendation.potentialSavings.toFixed(2)}/month!`,
        ];

      case 'UNUSED_SERVICE':
        return [
          `Review your ${recommendation.metadata.serviceName} account`,
          'Check if you have any content you want to watch',
          'Cancel or pause the subscription if not needed',
          'Mark calendar to resubscribe when new content releases',
          `Save $${recommendation.potentialSavings.toFixed(2)}/month!`,
        ];

      case 'PRICE_INCREASE':
        return [
          'Review if the price increase is justified',
          'Check if there are cheaper alternatives',
          'Consider downgrading to a lower tier',
          'Contact customer service to negotiate',
          'Cancel if value no longer matches cost',
        ];

      case 'ROTATION_SUGGESTION':
        return [
          `Pause ${recommendation.metadata.pauseServiceName} subscription`,
          `Focus on watching ${recommendation.metadata.unwatchedContentCount} items on ${recommendation.metadata.watchServiceName}`,
          'Reactivate when you finish your watchlist',
          'Rotate back when new content releases',
          `Save $${recommendation.potentialSavings.toFixed(2)}/month during rotation!`,
        ];

      default:
        return [];
    }
  };

  const actionSteps = getActionSteps();

  return (
    <Card style={styles.recommendationCard}>
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
          <MaterialCommunityIcons name={icon as any} size={24} color={color} />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardTopRow}>
            <View style={[styles.typeBadge, { backgroundColor: color + '20' }]}>
              <Text style={[styles.typeBadgeText, { color }]}>{label}</Text>
            </View>
            {recommendation.potentialSavings > 0 && (
              <View style={styles.savingsBadge}>
                <MaterialCommunityIcons name="arrow-down" size={14} color={COLORS.success} />
                <Text style={styles.savingsText}>
                  ${recommendation.potentialSavings.toFixed(2)}/mo
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.cardTitle}>{recommendation.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={isExpanded ? undefined : 2}>
            {recommendation.description}
          </Text>

          {/* Impact Score */}
          <View style={styles.impactRow}>
            <View style={styles.impactBar}>
              <View
                style={[
                  styles.impactFill,
                  {
                    width: `${recommendation.impactScore}%`,
                    backgroundColor:
                      recommendation.impactScore >= 70
                        ? COLORS.error
                        : recommendation.impactScore >= 50
                        ? COLORS.warning
                        : COLORS.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.impactText}>
              {recommendation.impactScore >= 70
                ? 'High Impact'
                : recommendation.impactScore >= 50
                ? 'Medium Impact'
                : 'Low Impact'}
            </Text>
          </View>
        </View>

        {/* Expand Icon */}
        <MaterialCommunityIcons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={COLORS.gray}
        />
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />

          {/* Action Steps */}
          <View style={styles.stepsSection}>
            <Text style={styles.stepsTitle}>Action Steps:</Text>
            {actionSteps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {/* Metadata */}
          {recommendation.metadata.annualSavings && (
            <View style={styles.metadataSection}>
              <MaterialCommunityIcons
                name="information"
                size={16}
                color={COLORS.primary}
              />
              <Text style={styles.metadataText}>
                Annual savings: ${recommendation.metadata.annualSavings.toFixed(2)}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.cardActions}>
            <Button
              variant="outline"
              onPress={onDismiss}
              style={styles.actionButton}
            >
              Dismiss
            </Button>
            <Button
              variant="primary"
              onPress={onAccept}
              style={styles.actionButton}
            >
              <MaterialCommunityIcons name="check" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Got It</Text>
            </Button>
          </View>
        </View>
      )}
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RecommendationsScreen: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const subscriptions = useSubscriptionsStore((state) => state.subscriptions);

  // Load recommendations
  useEffect(() => {
    loadRecommendations();
  }, [subscriptions]);

  const loadRecommendations = async () => {
    try {
      setIsLoading(true);
      const recs = await generateRecommendations(subscriptions);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out dismissed recommendations
  const visibleRecommendations = recommendations.filter(
    (rec) => !dismissedIds.has(rec.id)
  );

  const totalSavings = calculateTotalSavings(visibleRecommendations);

  // Handlers
  const handleToggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleAccept = (recommendation: Recommendation) => {
    Alert.alert(
      'Recommendation Accepted',
      `Great! Follow the action steps to optimize your subscriptions.`,
      [
        {
          text: 'OK',
          onPress: () => {
            setDismissedIds((prev) => new Set(prev).add(recommendation.id));
            setExpandedId(null);
          },
        },
      ]
    );
  };

  const handleDismiss = (recommendation: Recommendation) => {
    Alert.alert(
      'Dismiss Recommendation',
      'Are you sure you want to dismiss this recommendation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: () => {
            setDismissedIds((prev) => new Set(prev).add(recommendation.id));
            setExpandedId(null);
          },
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return <LoadingScreen message="Analyzing your subscriptions..." />;
  }

  // Celebration state (no recommendations)
  if (visibleRecommendations.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.celebrationContainer}>
          <View style={styles.celebrationIcon}>
            <MaterialCommunityIcons
              name="trophy"
              size={80}
              color={COLORS.warning}
            />
          </View>
          <Text style={styles.celebrationTitle}>All Optimized! 🎉</Text>
          <Text style={styles.celebrationMessage}>
            Your subscriptions are fully optimized. We couldn't find any ways to
            save money or improve your setup.
          </Text>
          <Text style={styles.celebrationSubtext}>
            Keep it up! We'll let you know if we find new optimization
            opportunities.
          </Text>

          <Card style={styles.celebrationStats}>
            <View style={styles.statRow}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={COLORS.success}
              />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Active Subscriptions</Text>
                <Text style={styles.statValue}>
                  {subscriptions.filter((s) => s.status === 'active').length}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <MaterialCommunityIcons
                name="cash-multiple"
                size={24}
                color={COLORS.primary}
              />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Monthly Spending</Text>
                <Text style={styles.statValue}>
                  $
                  {subscriptions
                    .filter((s) => s.status === 'active')
                    .reduce((sum, s) => sum + s.price, 0)
                    .toFixed(2)}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <MaterialCommunityIcons
            name="lightbulb-on"
            size={32}
            color={COLORS.warning}
          />
          <Text style={styles.headerTitle}>Smart Recommendations</Text>
        </View>

        {totalSavings > 0 && (
          <Card style={styles.savingsCard}>
            <View style={styles.savingsContent}>
              <View style={styles.savingsLeft}>
                <Text style={styles.savingsLabel}>Potential Monthly Savings</Text>
                <Text style={styles.savingsAmount}>${totalSavings.toFixed(2)}</Text>
                <Text style={styles.savingsAnnual}>
                  ${(totalSavings * 12).toFixed(2)}/year
                </Text>
              </View>
              <View style={styles.savingsIcon}>
                <MaterialCommunityIcons
                  name="piggy-bank"
                  size={48}
                  color={COLORS.success}
                  style={{ opacity: 0.8 }}
                />
              </View>
            </View>
          </Card>
        )}

        <Text style={styles.headerSubtitle}>
          We found {visibleRecommendations.length} way
          {visibleRecommendations.length !== 1 ? 's' : ''} to optimize your
          subscriptions
        </Text>
      </View>

      {/* Recommendations List */}
      <View style={styles.recommendationsList}>
        {visibleRecommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            isExpanded={expandedId === recommendation.id}
            onToggleExpand={() => handleToggleExpand(recommendation.id)}
            onAccept={() => handleAccept(recommendation)}
            onDismiss={() => handleDismiss(recommendation)}
          />
        ))}
      </View>

      {/* Bottom Padding */}
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  savingsCard: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: COLORS.success + '10',
    borderWidth: 1,
    borderColor: COLORS.success + '40',
  },
  savingsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  savingsLeft: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
  },
  savingsAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.success,
    marginBottom: 2,
  },
  savingsAnnual: {
    fontSize: 14,
    color: COLORS.gray,
  },
  savingsIcon: {
    marginLeft: 16,
  },
  recommendationsList: {
    padding: 16,
    gap: 12,
  },
  recommendationCard: {
    padding: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    marginRight: 12,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.success + '20',
    gap: 2,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
    marginBottom: 12,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  impactBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  impactFill: {
    height: '100%',
    borderRadius: 3,
  },
  impactText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 16,
  },
  stepsSection: {
    marginBottom: 16,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  metadataSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  metadataText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  celebrationIcon: {
    marginBottom: 24,
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 12,
    textAlign: 'center',
  },
  celebrationMessage: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  celebrationSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 32,
  },
  celebrationStats: {
    width: '100%',
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkGray,
  },
  bottomPadding: {
    height: 40,
  },
});
