/**
 * Subscription Review Screen - Step 3 of Onboarding
 * Review and confirm detected subscriptions
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, Button, EmptyState } from '@/components';
import { useSuggestedSubscriptions } from '@/features/subscriptions';
import type { SuggestedSubscription } from '@/features/subscriptions';

interface SubscriptionReviewScreenProps {
  onContinue: (selectedSubscriptions: string[]) => void;
  onAddManual: () => void;
}

interface SubscriptionItemProps {
  subscription: SuggestedSubscription;
  isSelected: boolean;
  onToggle: () => void;
}

const SubscriptionItem: React.FC<SubscriptionItemProps> = ({
  subscription,
  isSelected,
  onToggle,
}) => {
  return (
    <TouchableOpacity
      style={[styles.subscriptionItem, isSelected && styles.subscriptionItemSelected]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <Checkbox
        status={isSelected ? 'checked' : 'unchecked'}
        color={COLORS.primary}
        onPress={onToggle}
      />

      <View style={styles.subscriptionContent}>
        <Text style={styles.subscriptionName}>{subscription.service_name}</Text>
        <Text style={styles.subscriptionDetails}>
          ${subscription.price?.toFixed(2)}/month • Detected from bank
        </Text>
      </View>

      <Text style={styles.subscriptionPrice}>
        ${subscription.price?.toFixed(2)}
      </Text>
    </TouchableOpacity>
  );
};

export const SubscriptionReviewScreen: React.FC<SubscriptionReviewScreenProps> = ({
  onContinue,
  onAddManual,
}) => {
  const { data: suggestions = [], isLoading } = useSuggestedSubscriptions();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Auto-select all suggestions on load
  useEffect(() => {
    if (suggestions.length > 0) {
      setSelectedIds(new Set(suggestions.map(s => s.id)));
    }
  }, [suggestions]);

  const handleToggle = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    const selectedArray = Array.from(selectedIds);
    if (selectedArray.length === 0 && suggestions.length > 0) {
      Alert.alert(
        'No Subscriptions Selected',
        'Are you sure you want to continue without adding any subscriptions?',
        [
          { text: 'Go Back', style: 'cancel' },
          { text: 'Continue', onPress: () => onContinue(selectedArray) },
        ]
      );
    } else {
      onContinue(selectedArray);
    }
  };

  const selectedCount = selectedIds.size;
  const totalPrice = suggestions
    .filter(s => selectedIds.has(s.id))
    .reduce((sum, s) => sum + (s.price || 0), 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Review Your Subscriptions</Text>
        <Text style={styles.subtitle}>
          {suggestions.length > 0
            ? 'We found these subscriptions from your bank. Select the ones you want to track.'
            : 'No subscriptions detected yet. Add them manually to get started.'}
        </Text>
      </View>

      {/* Subscriptions List */}
      <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
        {isLoading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading subscriptions...</Text>
          </View>
        ) : suggestions.length > 0 ? (
          <>
            {suggestions.map((subscription) => (
              <SubscriptionItem
                key={subscription.id}
                subscription={subscription}
                isSelected={selectedIds.has(subscription.id)}
                onToggle={() => handleToggle(subscription.id)}
              />
            ))}
          </>
        ) : (
          <EmptyState
            icon="wallet-outline"
            title="No Subscriptions Detected"
            message="Connect your bank or add subscriptions manually to get started."
            actionLabel="Add Manual Subscription"
            onActionPress={onAddManual}
          />
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Summary */}
        {selectedCount > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {selectedCount} subscription{selectedCount !== 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.summaryPrice}>
              ${totalPrice.toFixed(2)}/month total
            </Text>
          </View>
        )}

        {/* Add Manual Button */}
        {suggestions.length > 0 && (
          <TouchableOpacity style={styles.addManualButton} onPress={onAddManual}>
            <MaterialCommunityIcons name="plus-circle" size={20} color={COLORS.primary} />
            <Text style={styles.addManualText}>Add Manual Subscription</Text>
          </TouchableOpacity>
        )}

        {/* Continue Button */}
        <Button
          mode="contained"
          onPress={handleContinue}
          style={styles.continueButton}
          contentStyle={styles.buttonContent}
        >
          Continue
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.gray,
    lineHeight: 22,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  subscriptionItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}05`,
  },
  subscriptionContent: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.darkGray,
    marginBottom: 4,
  },
  subscriptionDetails: {
    fontSize: 13,
    color: COLORS.gray,
  },
  subscriptionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  footer: {
    backgroundColor: COLORS.white,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    gap: 12,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.darkGray,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addManualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  addManualText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  continueButton: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
