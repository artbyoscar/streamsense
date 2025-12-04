/**
 * Quick Insights Row
 * Three glanceable metrics showing watching activity
 * Inspired by Rocket Money's dashboard widgets
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Film, Clock, DollarSign } from 'lucide-react-native';
import { useWatchingStats } from '../hooks/useDashboardStats';

interface InsightCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ icon, value, label }) => {
  return (
    <View style={styles.insightCard}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <Text style={styles.insightValue}>{value}</Text>
      <Text style={styles.insightLabel}>{label}</Text>
    </View>
  );
};

export const QuickInsights: React.FC = () => {
  const { watchedThisMonth, hoursWatched, avgCostPerHour, isLoading } = useWatchingStats();

  return (
    <View style={styles.insightsRow}>
      <InsightCard
        icon={<Film size={20} color="#a78bfa" />}
        value={isLoading ? '...' : watchedThisMonth}
        label="Watched"
      />
      <InsightCard
        icon={<Clock size={20} color="#60a5fa" />}
        value={isLoading ? '...' : `${hoursWatched}h`}
        label="Watch Time"
      />
      <InsightCard
        icon={<DollarSign size={20} color="#34d399" />}
        value={isLoading ? '...' : `$${avgCostPerHour.toFixed(2)}`}
        label="Cost/Hour"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  insightsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 8,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  insightLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
});
