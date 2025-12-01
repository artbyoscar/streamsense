/**
 * Subscription Detail Screen
 * Detailed view of a single subscription with billing info, usage, and actions
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { DashboardStackParamList } from '@/navigation/types';
import { useSubscription, useUpdateSubscription, useDeleteSubscription } from '../hooks/useSubscriptions';
import { formatCurrency } from '../store/subscriptionsStore';
import { COLORS, Card, LoadingScreen, Button } from '@/components';
import type { BillingCycle, SubscriptionStatus } from '@/types';
import { getServiceIconName } from '@/utils/serviceIcons';

type SubscriptionDetailNavigationProp = StackNavigationProp<DashboardStackParamList, 'SubscriptionDetail'>;

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: COLORS.success,
  cancelled: COLORS.gray,
  paused: COLORS.warning,
  expired: COLORS.error,
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  cancelled: 'Cancelled',
  paused: 'Paused',
  expired: 'Expired',
};

const DETECTION_SOURCE_LABELS = {
  manual: 'Added Manually',
  plaid: 'Auto-Detected from Bank',
  email: 'Detected from Email',
};

const DETECTION_SOURCE_ICONS = {
  manual: 'pencil',
  plaid: 'bank',
  email: 'email',
};

type RouteParams = {
  SubscriptionDetail: {
    subscriptionId: string;
  };
};

export const SubscriptionDetailScreen: React.FC = () => {
  const navigation = useNavigation<SubscriptionDetailNavigationProp>();
  const route = useRoute<RouteProp<RouteParams, 'SubscriptionDetail'>>();
  const { subscriptionId } = route.params;

  const { data: subscription, isLoading, error } = useSubscription(subscriptionId);
  const updateMutation = useUpdateSubscription();
  const deleteMutation = useDeleteSubscription();

  const [isPaused, setIsPaused] = useState(false);

  // Get service icon
  const getServiceIcon = (serviceName: string): string => {
    return getServiceIconName(serviceName);
  };

  // Format next billing date
  const formatBillingDate = (dateString: string | null): string => {
    if (!dateString) return 'No billing date set';

    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 0 && diffDays <= 30) return `in ${diffDays} days`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Handle edit
  const handleEdit = () => {
    // TODO: Implement subscription form as modal/dialog
    Alert.alert('Edit Subscription', 'Edit form coming soon!');
  };

  // Handle pause/resume tracking
  const handleTogglePause = async () => {
    if (!subscription) return;

    try {
      const newStatus: SubscriptionStatus = subscription.status === 'paused' ? 'active' : 'paused';

      await updateMutation.mutateAsync({
        id: subscriptionId,
        updates: { status: newStatus },
      });

      setIsPaused(!isPaused);
    } catch (error) {
      Alert.alert('Error', 'Failed to update subscription status');
    }
  };

  // Handle delete
  const handleDelete = () => {
    Alert.alert(
      'Delete Subscription',
      `Are you sure you want to delete ${subscription?.service_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync(subscriptionId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete subscription');
            }
          },
        },
      ]
    );
  };

  // Calculate monthly cost (convert from any billing cycle)
  const getMonthlyEquivalent = (price: number, cycle: BillingCycle): number => {
    switch (cycle) {
      case 'weekly':
        return price * 4.33;
      case 'monthly':
        return price;
      case 'quarterly':
        return price / 3;
      case 'yearly':
        return price / 12;
      default:
        return price;
    }
  };

  if (isLoading) {
    return <LoadingScreen message="Loading subscription..." />;
  }

  if (error || !subscription) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>Failed to load subscription</Text>
        <Button variant="primary" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const monthlyEquivalent = getMonthlyEquivalent(subscription.price, subscription.billing_cycle);
  const yearlyProjection = monthlyEquivalent * 12;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Service Header */}
      <Card style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.serviceIcon}>
            <MaterialCommunityIcons
              name={getServiceIcon(subscription.service_name) as any}
              size={48}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.serviceName}>{subscription.service_name}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[subscription.status] }]} />
              <Text style={styles.statusText}>{STATUS_LABELS[subscription.status]}</Text>
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Current Price</Text>
          <Text style={styles.priceAmount}>{formatCurrency(subscription.price)}</Text>
          <Text style={styles.priceCycle}>per {subscription.billing_cycle}</Text>
        </View>

        {/* Detection Source */}
        <View style={styles.detectionBadge}>
          <MaterialCommunityIcons
            name={DETECTION_SOURCE_ICONS[subscription.detected_from] as any}
            size={14}
            color={COLORS.gray}
          />
          <Text style={styles.detectionText}>
            {DETECTION_SOURCE_LABELS[subscription.detected_from]}
          </Text>
        </View>
      </Card>

      {/* Billing Information */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="calendar-clock" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Billing Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Billing Cycle</Text>
          <Text style={styles.infoValue}>{BILLING_CYCLE_LABELS[subscription.billing_cycle]}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Next Billing Date</Text>
          <Text style={styles.infoValue}>{formatBillingDate(subscription.next_billing_date)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Monthly Equivalent</Text>
          <Text style={styles.infoValue}>{formatCurrency(monthlyEquivalent)}/mo</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Yearly Projection</Text>
          <Text style={styles.infoValue}>{formatCurrency(yearlyProjection)}/yr</Text>
        </View>

        {subscription.cancelled_at && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cancelled On</Text>
            <Text style={[styles.infoValue, { color: COLORS.error }]}>
              {new Date(subscription.cancelled_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
      </Card>

      {/* Payment History */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="history" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Payment History</Text>
        </View>

        <View style={styles.placeholderBox}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={48} color={COLORS.lightGray} />
          <Text style={styles.placeholderText}>
            Payment history will appear here
          </Text>
          <Text style={styles.placeholderSubtext}>
            Transaction data syncs automatically from your bank
          </Text>
        </View>
      </Card>

      {/* Usage Section */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="chart-bar" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Usage Statistics</Text>
        </View>

        <View style={styles.placeholderBox}>
          <MaterialCommunityIcons name="chart-arc" size={48} color={COLORS.lightGray} />
          <Text style={styles.placeholderText}>
            Usage tracking coming soon
          </Text>
          <Text style={styles.placeholderSubtext}>
            Track hours used and cost per hour
          </Text>
        </View>
      </Card>

      {/* Price History Chart */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="chart-line" size={24} color={COLORS.primary} />
          <Text style={styles.sectionTitle}>Price History</Text>
        </View>

        <View style={styles.placeholderBox}>
          <MaterialCommunityIcons name="chart-line-variant" size={48} color={COLORS.lightGray} />
          <Text style={styles.placeholderText}>
            No price changes detected
          </Text>
          <Text style={styles.placeholderSubtext}>
            Price history will appear when changes are detected
          </Text>
        </View>
      </Card>

      {/* Notes */}
      {subscription.notes && (
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="note-text" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <Text style={styles.notesText}>{subscription.notes}</Text>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <Button
          variant="primary"
          onPress={handleEdit}
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="pencil" size={20} color={COLORS.white} />
          <Text style={styles.buttonText}>Edit Subscription</Text>
        </Button>

        {subscription.status !== 'cancelled' && (
          <Button
            variant="outline"
            onPress={handleTogglePause}
            loading={updateMutation.isPending}
            style={styles.actionButton}
          >
            <MaterialCommunityIcons
              name={subscription.status === 'paused' ? 'play' : 'pause'}
              size={20}
              color={COLORS.primary}
            />
            <Text style={[styles.buttonText, { color: COLORS.primary }]}>
              {subscription.status === 'paused' ? 'Resume Tracking' : 'Pause Tracking'}
            </Text>
          </Button>
        )}

        <Button
          variant="error"
          onPress={handleDelete}
          loading={deleteMutation.isPending}
          style={styles.actionButton}
        >
          <MaterialCommunityIcons name="delete" size={20} color={COLORS.white} />
          <Text style={styles.buttonText}>Delete Subscription</Text>
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
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginTop: 16,
    marginBottom: 24,
  },
  headerCard: {
    marginBottom: 16,
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  statusRow: {
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  divider: {
    marginVertical: 16,
  },
  priceSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  priceCycle: {
    fontSize: 16,
    color: COLORS.gray,
  },
  detectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    alignSelf: 'center',
  },
  detectionText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 6,
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  infoLabel: {
    fontSize: 15,
    color: COLORS.gray,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: COLORS.darkGray,
    fontWeight: '600',
  },
  placeholderBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
    marginTop: 12,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'center',
  },
  notesText: {
    fontSize: 15,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
  actionsSection: {
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: 8,
  },
  bottomPadding: {
    height: 40,
  },
});
