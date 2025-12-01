/**
 * Subscription List Item Component
 * Displays individual subscription in the list
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { UserSubscription } from '@/types';
import { COLORS } from '@/components';
import type { SubscriptionValueMetrics } from '@/services/subscriptionValue';

interface SubscriptionListItemProps {
  subscription: UserSubscription;
  valueMetrics?: SubscriptionValueMetrics;
  onPress?: () => void;
  onLogTime?: () => void;
}

export const SubscriptionListItem: React.FC<SubscriptionListItemProps> = ({
  subscription,
  valueMetrics,
  onPress,
  onLogTime,
}) => {
  const formatPrice = (price: number, cycle: string) => {
    const cycleAbbrev = {
      weekly: '/wk',
      monthly: '/mo',
      quarterly: '/qtr',
      yearly: '/yr',
    }[cycle] || '/mo';

    return `$${price.toFixed(2)}${cycleAbbrev}`;
  };

  const formatNextBilling = (date: string | null) => {
    if (!date) return 'No billing date';

    const billingDate = new Date(date);
    const today = new Date();
    const diffTime = billingDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Past due';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `in ${diffDays} days`;

    return billingDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = () => {
    switch (subscription.status) {
      case 'active':
        return COLORS.success;
      case 'cancelled':
        return COLORS.error;
      case 'paused':
        return COLORS.warning;
      case 'expired':
        return COLORS.gray;
      default:
        return COLORS.gray;
    }
  };

  const getServiceIcon = () => {
    // Map of common services to icons
    const iconMap: Record<string, string> = {
      Netflix: 'netflix',
      Spotify: 'spotify',
      'Apple Music': 'apple',
      'YouTube Premium': 'youtube',
      Hulu: 'hulu',
      'Disney+': 'disney',
      'Amazon Prime': 'amazon',
      'HBO Max': 'television-box',
      Paramount: 'plus-box',
      Peacock: 'television-classic',
    };

    return iconMap[subscription.service_name] || 'play-box-outline';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.iconContainer}>
        <Avatar.Icon
          size={48}
          icon={getServiceIcon()}
          style={[styles.avatar, { backgroundColor: COLORS.primary + '20' }]}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.serviceName}>{subscription.service_name}</Text>
          <Text style={styles.price}>
            {formatPrice(subscription.price, subscription.billing_cycle)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </Text>
          </View>

          {subscription.next_billing_date && subscription.status === 'active' && (
            <View style={styles.billingContainer}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={14}
                color={COLORS.gray}
                style={styles.billingIcon}
              />
              <Text style={styles.billingText}>
                {formatNextBilling(subscription.next_billing_date)}
              </Text>
            </View>
          )}
        </View>

        {/* Value Score Badge */}
        {valueMetrics && valueMetrics.contentWatched > 0 && (
          <View
            style={[
              styles.valueBadge,
              { backgroundColor: valueMetrics.valueColor + '20' },
            ]}
          >
            <Text
              style={[
                styles.valueBadgeText,
                { color: valueMetrics.valueColor },
              ]}
            >
              {valueMetrics.contentWatched} watched • ${valueMetrics.costPerItem.toFixed(2)}/item • {valueMetrics.valueLabel}
            </Text>
          </View>
        )}
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={24}
        color={COLORS.lightGray}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    marginRight: 12,
  },
  avatar: {
    backgroundColor: COLORS.lightGray,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  billingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billingIcon: {
    marginRight: 4,
  },
  billingText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  chevron: {
    marginLeft: 8,
  },
  valueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  valueBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
});
