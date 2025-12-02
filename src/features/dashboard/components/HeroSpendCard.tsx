/**
 * Hero Spend Card
 * Large card showing monthly streaming spend with value status
 * Inspired by Rocket Money's hero metric
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, AlertCircle, AlertTriangle, Calendar } from 'lucide-react-native';
import { useSubscriptionStats } from '../hooks/useDashboardStats';

export const HeroSpendCard: React.FC = () => {
  const {
    totalMonthly,
    totalAnnual,
    serviceCount,
    valueStatus,
    comparisonText,
  } = useSubscriptionStats();

  const getStatusConfig = () => {
    switch (valueStatus) {
      case 'good':
        return {
          icon: <CheckCircle size={14} color="#22c55e" />,
          text: 'Great Value',
          color: '#22c55e',
          bgColor: 'rgba(34, 197, 94, 0.15)',
        };
      case 'warning':
        return {
          icon: <AlertCircle size={14} color="#f59e0b" />,
          text: 'Review Needed',
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.15)',
        };
      case 'poor':
        return {
          icon: <AlertTriangle size={14} color="#ef4444" />,
          text: 'Low Usage',
          color: '#ef4444',
          bgColor: 'rgba(239, 68, 68, 0.15)',
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <View style={styles.heroCard}>
      {/* Top row: Label + Status Badge */}
      <View style={styles.heroHeader}>
        <Text style={styles.heroLabel}>Monthly Streaming</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
          {statusConfig.icon}
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.text}
          </Text>
        </View>
      </View>

      {/* Giant spending number */}
      <Text style={styles.heroAmount}>
        ${totalMonthly.toFixed(2)}
      </Text>

      {/* Comparison insight */}
      <Text style={[
        styles.heroInsight,
        { color: comparisonText.includes('less') ? '#22c55e' : '#888' }
      ]}>
        {comparisonText}
      </Text>

      {/* Mini sparkline placeholder - would show 6-month trend */}
      <View style={styles.sparklineContainer}>
        <View style={styles.sparklinePlaceholder} />
      </View>

      {/* Annual projection */}
      <View style={styles.annualRow}>
        <Calendar size={16} color="#888" />
        <Text style={styles.annualText}>
          ${totalAnnual.toFixed(0)}/year across {serviceCount} {serviceCount === 1 ? 'service' : 'services'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroAmount: {
    fontSize: 56,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -2,
    marginVertical: 4,
  },
  heroInsight: {
    fontSize: 14,
    marginBottom: 16,
  },
  sparklineContainer: {
    height: 40,
    marginBottom: 16,
  },
  sparklinePlaceholder: {
    height: '100%',
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderRadius: 8,
  },
  annualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  annualText: {
    fontSize: 13,
    color: '#888',
  },
});
