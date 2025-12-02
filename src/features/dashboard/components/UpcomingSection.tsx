/**
 * Upcoming Section
 * Shows upcoming bills and releases in next 7 days
 * Inspired by Rocket Money's upcoming awareness
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Calendar, CreditCard, Sparkles } from 'lucide-react-native';
import { useUpcoming } from '../hooks/useDashboardStats';
import { format, parseISO } from 'date-fns';

interface UpcomingBillItemProps {
  serviceName: string;
  amount: number;
  renewalDate: string;
}

const UpcomingBillItem: React.FC<UpcomingBillItemProps> = ({ serviceName, amount, renewalDate }) => {
  const date = parseISO(renewalDate);
  const formattedDate = format(date, 'MMM d');

  return (
    <Pressable style={styles.upcomingItem}>
      <View style={styles.upcomingItemLeft}>
        <View style={[styles.upcomingIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
          <CreditCard size={16} color="#ef4444" />
        </View>
        <View>
          <Text style={styles.upcomingItemTitle}>{serviceName}</Text>
          <Text style={styles.upcomingItemSubtitle}>{formattedDate}</Text>
        </View>
      </View>
      <Text style={styles.upcomingItemAmount}>${amount.toFixed(2)}</Text>
    </Pressable>
  );
};

interface UpcomingReleaseItemProps {
  title: string;
  service: string;
  releaseDate: string;
}

const UpcomingReleaseItem: React.FC<UpcomingReleaseItemProps> = ({ title, service, releaseDate }) => {
  const date = parseISO(releaseDate);
  const formattedDate = format(date, 'MMM d');

  return (
    <Pressable style={styles.upcomingItem}>
      <View style={styles.upcomingItemLeft}>
        <View style={[styles.upcomingIcon, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
          <Sparkles size={16} color="#a78bfa" />
        </View>
        <View>
          <Text style={styles.upcomingItemTitle}>{title}</Text>
          <Text style={styles.upcomingItemSubtitle}>{service} • {formattedDate}</Text>
        </View>
      </View>
    </Pressable>
  );
};

export const UpcomingSection: React.FC = () => {
  const { upcomingBills, upcomingReleases } = useUpcoming();

  // Combine and sort by date
  const allUpcoming = [
    ...upcomingBills.map(bill => ({ type: 'bill' as const, date: bill.renewal_date, data: bill })),
    ...upcomingReleases.map(release => ({ type: 'release' as const, date: release.release_date, data: release })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (allUpcoming.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Calendar size={18} color="#a78bfa" />
          <Text style={styles.sectionTitle}>Upcoming (Next 7 Days)</Text>
        </View>
        <Pressable>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      </View>

      {/* Upcoming Items */}
      <View style={styles.upcomingList}>
        {allUpcoming.slice(0, 5).map((item, index) => (
          <View key={index}>
            {item.type === 'bill' ? (
              <UpcomingBillItem
                serviceName={item.data.service_name}
                amount={item.data.price}
                renewalDate={item.data.renewal_date}
              />
            ) : (
              <UpcomingReleaseItem
                title={item.data.title}
                service={item.data.service}
                releaseDate={item.data.release_date}
              />
            )}
          </View>
        ))}
      </View>

      {/* Summary Footer */}
      {upcomingBills.length > 0 && (
        <View style={styles.upcomingSummary}>
          <Text style={styles.upcomingSummaryText}>
            ${upcomingBills.reduce((sum, bill) => sum + bill.price, 0).toFixed(2)} in bills this week
          </Text>
        </View>
      )}
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  upcomingList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  upcomingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  upcomingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  upcomingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  upcomingItemSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  upcomingItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  upcomingSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  upcomingSummaryText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
});
