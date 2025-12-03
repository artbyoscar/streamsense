/**
 * Services Section
 * List of subscriptions with value indicators
 * Inspired by Rocket Money's subscription management
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { CheckCircle, AlertCircle, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { useSubscriptionsData } from '@/features/subscriptions/hooks/useSubscriptions';
import { useValueScores } from '../hooks/useDashboardStats';
import type { UserSubscription } from '@/types';
import { useCustomNavigation } from '@/navigation/NavigationContext';

interface ServiceItemProps {
  subscription: UserSubscription;
  valueStatus: 'good' | 'warning' | 'poor';
  onPress: () => void;
}

const ServiceItem: React.FC<ServiceItemProps> = ({ subscription, valueStatus, onPress }) => {
  const getStatusIcon = () => {
    switch (valueStatus) {
      case 'good':
        return <CheckCircle size={16} color="#22c55e" />;
      case 'warning':
        return <AlertCircle size={16} color="#f59e0b" />;
      case 'poor':
        return <AlertTriangle size={16} color="#ef4444" />;
    }
  };

  const getStatusColor = () => {
    switch (valueStatus) {
      case 'good':
        return '#22c55e';
      case 'warning':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
    }
  };

  // Calculate monthly cost
  let monthlyAmount = subscription.price;
  switch (subscription.billing_cycle) {
    case 'weekly':
      monthlyAmount = subscription.price * 4.33;
      break;
    case 'quarterly':
      monthlyAmount = subscription.price / 3;
      break;
    case 'yearly':
      monthlyAmount = subscription.price / 12;
      break;
  }

  return (
    <Pressable style={styles.serviceItem} onPress={onPress}>
      {/* Left side: Icon + Name */}
      <View style={styles.serviceItemLeft}>
        <View style={styles.serviceIcon}>
          {subscription.logo_url ? (
            <Image source={{ uri: subscription.logo_url }} style={styles.serviceLogo} />
          ) : (
            <Text style={styles.serviceIconText}>{subscription.service_name.charAt(0)}</Text>
          )}
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName}>{subscription.service_name}</Text>
          <View style={styles.serviceMetaRow}>
            {getStatusIcon()}
            <Text style={[styles.serviceStatus, { color: getStatusColor() }]}>
              {valueStatus === 'good' ? 'Great Value' : valueStatus === 'warning' ? 'Review' : 'Low Usage'}
            </Text>
          </View>
        </View>
      </View>

      {/* Right side: Price + Arrow */}
      <View style={styles.serviceItemRight}>
        <Text style={styles.servicePrice}>${monthlyAmount.toFixed(2)}</Text>
        <Text style={styles.serviceCycle}>/mo</Text>
        <ChevronRight size={18} color="#666" style={styles.chevron} />
      </View>
    </Pressable>
  );
};

export const ServicesSection: React.FC = () => {
  const { activeSubscriptions } = useSubscriptionsData();
  const { setActiveTab, navigateToScreen, setShowSubscriptionsManage } = useCustomNavigation();

  const handleManageAll = () => {
    setShowSubscriptionsManage(true);
  };

  const handleAddSubscription = () => {
    navigateToScreen('SubscriptionForm');
  };
  const valueScores = useValueScores();

  const handleServicePress = (subscription: UserSubscription) => {
    // Open subscription form in edit mode
    navigateToScreen('SubscriptionForm', { subscriptionId: subscription.id, subscription: subscription });
  };

  if (activeSubscriptions.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Services</Text>
        <Pressable onPress={handleManageAll}>
          <Text style={styles.seeAll}>Manage All</Text>
        </Pressable>
      </View>

      {/* Services List */}
      <View style={styles.servicesList}>
        {activeSubscriptions.map((subscription) => {
          const valueScore = valueScores.get(subscription.id);
          const valueStatus = valueScore?.status || 'good';

          return (
            <ServiceItem
              key={subscription.id}
              subscription={subscription}
              valueStatus={valueStatus}
              onPress={() => handleServicePress(subscription)}
            />
          );
        })}
      </View>

      {/* Add Service Button */}
      <Pressable style={styles.addServiceButton} onPress={handleAddSubscription}>
        <Text style={styles.addServiceText}>+ Add Subscription</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  seeAll: {
    fontSize: 14,
    color: '#a78bfa',
    fontWeight: '600',
  },
  servicesList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  serviceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  serviceLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  serviceIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#a78bfa',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  servicePrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  serviceCycle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 4,
  },
  addServiceButton: {
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addServiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a78bfa',
  },
});








