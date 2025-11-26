/**
 * Quick Actions Card Component
 * Displays quick action buttons on dashboard
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, COLORS } from '@/components';

interface QuickAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface QuickActionsCardProps {
  onAddSubscription: () => void;
  onConnectBank: () => void;
  onViewRecommendations: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onAddSubscription,
  onConnectBank,
  onViewRecommendations,
}) => {
  const actions: QuickAction[] = [
    {
      id: 'add',
      title: 'Add Subscription',
      icon: 'plus-circle',
      color: COLORS.primary,
      onPress: onAddSubscription,
    },
    {
      id: 'bank',
      title: 'Connect Bank',
      icon: 'bank',
      color: COLORS.success,
      onPress: onConnectBank,
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      icon: 'lightbulb-on',
      color: COLORS.warning,
      onPress: onViewRecommendations,
    },
  ];

  return (
    <Card title="Quick Actions" style={styles.card}>
      <View style={styles.actionsContainer}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={action.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
              <MaterialCommunityIcons
                name={action.icon as any}
                size={28}
                color={action.color}
              />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkGray,
    textAlign: 'center',
  },
});
