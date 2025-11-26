/**
 * First Insights Screen - Step 4 of Onboarding
 * Show initial spending summary and preview recommendations
 */

import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, Button, Card } from '@/components';

interface FirstInsightsScreenProps {
  selectedSubscriptions: Array<{
    id: string;
    service_name: string;
    price: number;
  }>;
  onFinish: () => void;
}

interface InsightCardProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  value: string;
  subtitle: string;
}

const InsightCard: React.FC<InsightCardProps> = ({
  icon,
  iconColor,
  title,
  value,
  subtitle,
}) => {
  return (
    <Card style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: `${iconColor}15` }]}>
        <MaterialCommunityIcons name={icon} size={32} color={iconColor} />
      </View>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightValue}>{value}</Text>
      <Text style={styles.insightSubtitle}>{subtitle}</Text>
    </Card>
  );
};

interface RecommendationItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
}

const RecommendationItem: React.FC<RecommendationItemProps> = ({
  icon,
  iconColor,
  title,
  description,
}) => {
  return (
    <View style={styles.recommendationItem}>
      <View style={[styles.recommendationIcon, { backgroundColor: `${iconColor}15` }]}>
        <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.recommendationContent}>
        <Text style={styles.recommendationTitle}>{title}</Text>
        <Text style={styles.recommendationDescription}>{description}</Text>
      </View>
    </View>
  );
};

export const FirstInsightsScreen: React.FC<FirstInsightsScreenProps> = ({
  selectedSubscriptions,
  onFinish,
}) => {
  // Calculate insights
  const totalMonthly = selectedSubscriptions.reduce((sum, sub) => sum + sub.price, 0);
  const totalYearly = totalMonthly * 12;
  const subscriptionCount = selectedSubscriptions.length;
  const averagePrice = subscriptionCount > 0 ? totalMonthly / subscriptionCount : 0;

  // Generate simple recommendations based on the subscriptions
  const recommendations = [];

  // Recommendation 1: Bundle opportunity (if they have multiple services)
  if (subscriptionCount >= 2) {
    recommendations.push({
      icon: 'package-variant' as const,
      iconColor: '#10B981',
      title: 'Bundle Opportunity',
      description: `You have ${subscriptionCount} subscriptions. Consider bundling to save up to $${(totalMonthly * 0.15).toFixed(2)}/month.`,
    });
  }

  // Recommendation 2: Set renewal reminders
  if (subscriptionCount > 0) {
    recommendations.push({
      icon: 'bell-ring' as const,
      iconColor: '#F59E0B',
      title: 'Enable Renewal Reminders',
      description: 'Get notified 3 days before renewals to avoid unwanted charges.',
    });
  }

  // Recommendation 3: Track usage (always show)
  recommendations.push({
    icon: 'chart-bar' as const,
    iconColor: '#8B5CF6',
    title: 'Track Your Usage',
    description: 'Log what you watch to identify unused subscriptions and save money.',
  });

  // Recommendation 4: Explore watchlist (always show)
  recommendations.push({
    icon: 'bookmark-check' as const,
    iconColor: COLORS.primary,
    title: 'Build Your Watchlist',
    description: 'Add content to your watchlist to see which services you actually need.',
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.celebrationIcon}>
          <MaterialCommunityIcons name="party-popper" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Your StreamSense Overview</Text>
        <Text style={styles.subtitle}>
          {subscriptionCount > 0
            ? `Here's what we found from your ${subscriptionCount} ${subscriptionCount === 1 ? 'subscription' : 'subscriptions'}`
            : "You're all set to start tracking your subscriptions"}
        </Text>
      </View>

      {/* Insights Section */}
      {subscriptionCount > 0 && (
        <>
          <Text style={styles.sectionTitle}>Your Spending</Text>
          <View style={styles.insightsGrid}>
            <InsightCard
              icon="calendar-month"
              iconColor={COLORS.primary}
              title="Monthly"
              value={`$${totalMonthly.toFixed(2)}`}
              subtitle="Current spending"
            />
            <InsightCard
              icon="calendar-range"
              iconColor="#10B981"
              title="Yearly"
              value={`$${totalYearly.toFixed(2)}`}
              subtitle="Projected annually"
            />
          </View>
          <View style={styles.insightsGrid}>
            <InsightCard
              icon="wallet-outline"
              iconColor="#F59E0B"
              title="Subscriptions"
              value={subscriptionCount.toString()}
              subtitle="Active services"
            />
            <InsightCard
              icon="cash"
              iconColor="#8B5CF6"
              title="Average"
              value={`$${averagePrice.toFixed(2)}`}
              subtitle="Per subscription"
            />
          </View>
        </>
      )}

      {/* Recommendations Section */}
      <Text style={styles.sectionTitle}>Recommended Next Steps</Text>
      <Card style={styles.recommendationsCard}>
        {recommendations.map((recommendation, index) => (
          <React.Fragment key={index}>
            <RecommendationItem {...recommendation} />
            {index < recommendations.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </Card>

      {/* Call to Action */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaText}>
          You're all set! StreamSense will help you track, manage, and optimize your subscriptions.
        </Text>
        <Button
          mode="contained"
          onPress={onFinish}
          style={styles.finishButton}
          contentStyle={styles.buttonContent}
        >
          Start Using StreamSense
        </Button>
      </View>

      {/* Bottom Padding */}
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  celebrationIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: `${COLORS.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.darkGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  insightsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  insightCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  insightIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  insightSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  recommendationsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 0,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendationContent: {
    flex: 1,
    paddingTop: 2,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginLeft: 76,
  },
  ctaSection: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  finishButton: {
    borderRadius: 12,
    width: '100%',
  },
  buttonContent: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 20,
  },
});
