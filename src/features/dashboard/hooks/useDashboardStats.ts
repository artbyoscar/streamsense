/**
 * Dashboard Statistics Hooks
 * Provides data for the Rocket Money-inspired dashboard
 */

import { useMemo, useState, useEffect } from 'react';
import { useSubscriptionsData, calculateMonthlySpend } from '@/features/subscriptions';
import { useWatchlistStore } from '@/features/watchlist';
import { supabase } from '@/config/supabase';
import { useAuthStore } from '@/stores/authStore';

// ============================================================================
// SUBSCRIPTION STATS
// ============================================================================

export interface SubscriptionStats {
  totalMonthly: number;
  totalAnnual: number;
  serviceCount: number;
  valueStatus: 'good' | 'warning' | 'poor';
  trend: number[]; // Last 6 months spending
  comparisonText: string;
  lastMonthSpend: number;
  difference: number;
}

export function useSubscriptionStats(): SubscriptionStats {
  const { subscriptions, monthlySpend, activeSubscriptions } = useSubscriptionsData();

  return useMemo(() => {
    const totalMonthly = monthlySpend;
    const totalAnnual = totalMonthly * 12;
    const serviceCount = activeSubscriptions.length;

    // Mock trend data - in production, this would come from historical data
    const trend = [totalMonthly * 0.95, totalMonthly * 1.02, totalMonthly * 0.98,
                   totalMonthly, totalMonthly * 1.05, totalMonthly];

    // Calculate last month comparison
    const lastMonthSpend = totalMonthly * 1.08; // Mock - would be from DB
    const difference = totalMonthly - lastMonthSpend;

    // Determine value status based on usage
    // In production, this would factor in watch time data
    let valueStatus: 'good' | 'warning' | 'poor' = 'good';
    if (serviceCount > 5) {
      valueStatus = 'warning';
    }
    if (totalMonthly > 100) {
      valueStatus = 'warning';
    }

    const comparisonText = difference < 0
      ? `$${Math.abs(difference).toFixed(2)} more than last month`
      : difference > 0
      ? `$${difference.toFixed(2)} less than last month`
      : 'Same as last month';

    return {
      totalMonthly,
      totalAnnual,
      serviceCount,
      valueStatus,
      trend,
      comparisonText,
      lastMonthSpend,
      difference,
    };
  }, [subscriptions, monthlySpend, activeSubscriptions]);
}

// ============================================================================
// WATCHING STATS
// ============================================================================

export interface WatchingStats {
  watchedThisMonth: number;
  hoursWatched: number;
  avgCostPerHour: number;
  isLoading: boolean;
}

export function useWatchingStats(): WatchingStats {
  const { monthlySpend } = useSubscriptionsData();
  const [userId, setUserId] = useState<string | null>(null);

  const [stats, setStats] = useState<WatchingStats>({
    watchedThisMonth: 0,
    hoursWatched: 0,
    avgCostPerHour: 0,
    isLoading: true,
  });

  // Listen to Supabase auth DIRECTLY - bypass Zustand
  useEffect(() => {
    // Check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[DashboardStats] Got session:', session?.user?.id);
      setUserId(session?.user?.id ?? null);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[DashboardStats] Auth state change:', event, session?.user?.id);
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch stats when userId becomes available
  useEffect(() => {
    console.log('[DashboardStats] Effect triggered, userId:', userId);

    if (!userId) {
      console.log('[DashboardStats] ⏳ Waiting for auth...');
      return;
    }

    let isMounted = true;

    const fetchStats = async () => {
      console.log('[DashboardStats] 📊 Fetching stats for user:', userId);

      try {
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

        // Parallel queries for speed
        const [totalResult, monthResult] = await Promise.all([
          supabase
            .from('watchlist_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'watched'),
          supabase
            .from('watchlist_items')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'watched')
            .gte('updated_at', firstDayOfMonth),
        ]);

        if (!isMounted) return;

        const totalWatched = totalResult.count ?? 0;
        const hoursWatched = Math.round(totalWatched * 1.5);
        const avgCostPerHour = hoursWatched > 0
          ? parseFloat((monthlySpend / hoursWatched).toFixed(2))
          : 0;

        console.log('[DashboardStats] ✅ Stats:', { totalWatched, hoursWatched, avgCostPerHour });

        setStats({
          watchedThisMonth: totalWatched,
          hoursWatched,
          avgCostPerHour,
          isLoading: false,
        });
      } catch (error) {
        console.error('[DashboardStats] ❌ Error:', error);
        if (isMounted) setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();

    return () => { isMounted = false; };
  }, [userId, monthlySpend]);

  return stats;
}

// ============================================================================
// UPCOMING
// ============================================================================

export interface UpcomingBill {
  type: 'bill';
  id: string;
  name: string;
  price: number;
  date: Date;
  color: string;
}

export interface UpcomingRelease {
  type: 'release';
  id: number;
  title: string;
  posterUrl: string;
  date: Date;
  service?: string;
}

export interface UpcomingData {
  upcomingBills: UpcomingBill[];
  upcomingReleases: UpcomingRelease[];
}

export function useUpcoming(): UpcomingData {
  const { subscriptions, upcomingRenewals } = useSubscriptionsData();

  return useMemo(() => {
    // Convert renewals to upcoming bills
    const upcomingBills: UpcomingBill[] = upcomingRenewals
      .map((renewal: any) => ({
        type: 'bill' as const,
        id: renewal.id,
        name: renewal.service_name,
        price: renewal.price,
        date: new Date(renewal.next_billing_date),
        color: getServiceColor(renewal.service_name),
      }))
      .slice(0, 10);

    // Mock upcoming releases - in production, this would come from TMDb or similar
    const upcomingReleases: UpcomingRelease[] = [];

    return {
      upcomingBills,
      upcomingReleases,
    };
  }, [subscriptions, upcomingRenewals]);
}

// ============================================================================
// VALUE SCORES
// ============================================================================

export interface ValueScore {
  rating: 'good' | 'fair' | 'poor';
  score: number;
  watchHours: number;
  costPerHour: number;
}

export function useValueScores(): Map<string, ValueScore> {
  const { activeSubscriptions } = useSubscriptionsData();

  return useMemo(() => {
    const scores = new Map<string, ValueScore>();

    activeSubscriptions.forEach((sub: any) => {
      const watchHours = sub.total_watch_hours || 0;
      const monthlyPrice = sub.price; // Simplified
      const costPerHour = watchHours > 0 ? monthlyPrice / watchHours : 999;

      let rating: 'good' | 'fair' | 'poor';
      let score: number;

      if (costPerHour < 1) {
        rating = 'good';
        score = 9;
      } else if (costPerHour < 3) {
        rating = 'fair';
        score = 5;
      } else {
        rating = 'poor';
        score = 2;
      }

      scores.set(sub.id, {
        rating,
        score,
        watchHours,
        costPerHour,
      });
    });

    return scores;
  }, [activeSubscriptions]);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const SERVICE_COLORS: Record<string, string> = {
  'Netflix': '#E50914',
  'Hulu': '#1CE783',
  'Disney+': '#113CCF',
  'HBO Max': '#7B2CBF',
  'Prime Video': '#00A8E1',
  'Apple TV+': '#000000',
  'Paramount+': '#0064FF',
  'Peacock': '#000000',
  'Discovery+': '#0373DB',
};

function getServiceColor(serviceName: string): string {
  return SERVICE_COLORS[serviceName] || '#666666';
}
