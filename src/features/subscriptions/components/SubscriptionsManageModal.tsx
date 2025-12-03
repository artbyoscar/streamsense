/**
 * Subscriptions Manage Modal
 * Full list of subscriptions with add/edit/delete capabilities
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { Plus, Trash2, Edit3, X } from 'lucide-react-native';
import { useSubscriptionsData, useDeleteSubscription } from '@/features/subscriptions/hooks/useSubscriptions';
import { useTheme } from '@/theme';
import type { UserSubscription } from '@/types';

interface Props {
  onClose: () => void;
  onEditSubscription: (subscription: UserSubscription) => void;
  onAddSubscription: () => void;
}

export const SubscriptionsManageModal: React.FC<Props> = ({
  onClose,
  onEditSubscription,
  onAddSubscription,
}) => {
  const { colors } = useTheme();
  const { data: subscriptions = [], refetch } = useSubscriptionsData();
  const deleteSubscription = useDeleteSubscription();

  const handleDelete = (subscription: UserSubscription) => {
    Alert.alert(
      'Delete Subscription',
      `Are you sure you want to remove ${subscription.service_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSubscription.mutateAsync(subscription.id);
            refetch();
          },
        },
      ]
    );
  };

  const getTotalMonthly = () => {
    return subscriptions.reduce((total, sub) => {
      let monthly = sub.price;
      switch (sub.billing_cycle) {
        case 'weekly': monthly = sub.price * 4.33; break;
        case 'quarterly': monthly = sub.price / 3; break;
        case 'yearly': monthly = sub.price / 12; break;
      }
      return total + monthly;
    }, 0);
  };

  const renderSubscription = ({ item }: { item: UserSubscription }) => {
    let monthlyPrice = item.price;
    switch (item.billing_cycle) {
      case 'weekly': monthlyPrice = item.price * 4.33; break;
      case 'quarterly': monthlyPrice = item.price / 3; break;
      case 'yearly': monthlyPrice = item.price / 12; break;
    }

    return (
      <View style={[styles.subscriptionItem, { backgroundColor: colors.surface }]}>
        <View style={styles.subscriptionInfo}>
          <View style={[styles.serviceIcon, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.serviceIconText, { color: colors.primary }]}>
              {item.service_name.charAt(0)}
            </Text>
          </View>
          <View style={styles.subscriptionDetails}>
            <Text style={[styles.serviceName, { color: colors.text }]}>
              {item.service_name}
            </Text>
            <Text style={[styles.servicePrice, { color: colors.textSecondary }]}>
              \/mo
              {item.billing_cycle !== 'monthly' &&  (\)}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.primary + '20' }]}
            onPress={() => onEditSubscription(item)}
          >
            <Edit3 size={18} color={colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#ef444420' }]}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={18} color="#ef4444" />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Manage Subscriptions</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <X size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={[styles.summary, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
          Total Monthly Spend
        </Text>
        <Text style={[styles.summaryAmount, { color: colors.text }]}>
          \
        </Text>
        <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
          {subscriptions.length} service{subscriptions.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={subscriptions}
        renderItem={renderSubscription}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No subscriptions added yet
            </Text>
          </View>
        }
      />

      <Pressable
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={onAddSubscription}
      >
        <Plus size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Subscription</Text>
      </Pressable>
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  summary: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '700',
    marginVertical: 4,
  },
  summaryCount: {
    fontSize: 14,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  subscriptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  subscriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceIconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  subscriptionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
  },
  servicePrice: {
    fontSize: 14,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

