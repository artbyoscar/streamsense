/**
 * Break-Even Service
 * Calculate subscription value based on watch time vs cost
 * Target: $1.50/hour is "break even" (industry average value)
 */

import { supabase } from '@/config/supabase';

// Industry average value benchmark
const BREAK_EVEN_RATE = 1.50; // dollars per hour

export type BreakEvenStatus = 'red' | 'orange' | 'yellow' | 'lightGreen' | 'green' | 'diamond';

export interface BreakEvenData {
  subscriptionId: string;
  subscriptionName: string;
  monthlyCost: number;
  hoursWatched: number;
  breakEvenHours: number;
  percentComplete: number;
  currentRate: number;
  hoursRemaining: number;
  status: BreakEvenStatus;
  message: string;
  color: string;
}

/**
 * Get color for break-even status
 */
export const getBreakEvenColor = (status: BreakEvenStatus): string => {
  switch (status) {
    case 'red': return '#EF4444';
    case 'orange': return '#F97316';
    case 'yellow': return '#EAB308';
    case 'lightGreen': return '#84CC16';
    case 'green': return '#22C55E';
    case 'diamond': return '#3B82F6';
    default: return '#9CA3AF';
  }
};

/**
 * Calculate break-even data for a subscription
 */
export const calculateBreakEven = (
  subscriptionId: string,
  subscriptionName: string,
  monthlyCost: number,
  hoursWatched: number
): BreakEvenData => {
  const breakEvenHours = monthlyCost / BREAK_EVEN_RATE;
  const percentComplete = Math.min((hoursWatched / breakEvenHours) * 100, 200);
  const currentRate = hoursWatched > 0 ? monthlyCost / hoursWatched : monthlyCost;
  const hoursRemaining = Math.max(breakEvenHours - hoursWatched, 0);

  let status: BreakEvenStatus;
  let message: string;

  if (percentComplete >= 200) {
    status = 'diamond';
    message = `Incredible value! You're getting ${(hoursWatched / breakEvenHours * 100).toFixed(0)}% of your money's worth!`;
  } else if (percentComplete >= 100) {
    status = 'green';
    message = `You've broken even! Everything from here is bonus value.`;
  } else if (percentComplete >= 75) {
    status = 'lightGreen';
    message = `So close! Just ${hoursRemaining.toFixed(1)} more hours to break even.`;
  } else if (percentComplete >= 50) {
    status = 'yellow';
    message = `Halfway there! Watch ${hoursRemaining.toFixed(1)} more hours this month.`;
  } else if (percentComplete >= 25) {
    status = 'orange';
    message = `Getting started. ${hoursRemaining.toFixed(1)} hours to break even.`;
  } else {
    status = 'red';
    message = `In the red! Log some watch time to see your value improve.`;
  }

  const color = getBreakEvenColor(status);

  return {
    subscriptionId,
    subscriptionName,
    monthlyCost,
    hoursWatched,
    breakEvenHours,
    percentComplete,
    currentRate,
    hoursRemaining,
    status,
    message,
    color,
  };
};

/**
 * Get break-even data for all user subscriptions
 */
export const getAllBreakEvenData = async (userId: string): Promise<BreakEvenData[]> => {
  try {
    // Get user's active subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (subsError) {
      console.error('[BreakEven] Error loading subscriptions:', subsError);
      return [];
    }

    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }

    // Get current month's watch time for each subscription
    const breakEvenData: BreakEvenData[] = [];

    for (const sub of subscriptions) {
      const serviceName = sub.service_name || 'Unknown Service';
      const monthlyCost = sub.monthly_cost || sub.cost || sub.price || 0;

      // Get watchlist items for this service from current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: watchlistItems } = await supabase
        .from('watchlist_items')
        .select('*')
        .eq('user_id', userId)
        .eq('streaming_service', serviceName.toLowerCase())
        .gte('watched_at', startOfMonth.toISOString())
        .in('status', ['watching', 'watched']);

      // Calculate total watch hours
      // For simplicity, estimate: movies = 2 hours, TV episodes = 1 hour
      let totalHours = 0;
      if (watchlistItems) {
        for (const item of watchlistItems) {
          if (item.content_type === 'movie') {
            totalHours += 2; // Average movie length
          } else {
            totalHours += 1; // Average TV episode length
          }
        }
      }

      const data = calculateBreakEven(
        sub.id,
        serviceName,
        monthlyCost,
        totalHours
      );

      breakEvenData.push(data);
    }

    // Sort by percentage complete (lowest first to show what needs attention)
    breakEvenData.sort((a, b) => a.percentComplete - b.percentComplete);

    return breakEvenData;
  } catch (error) {
    console.error('[BreakEven] Error calculating break-even data:', error);
    return [];
  }
};

/**
 * Get summary statistics
 */
export const getBreakEvenSummary = (data: BreakEvenData[]): {
  totalSubscriptions: number;
  totalCost: number;
  totalHoursWatched: number;
  overallRate: number;
  subscriptionsBrokenEven: number;
  subscriptionsInRed: number;
} => {
  const totalSubscriptions = data.length;
  const totalCost = data.reduce((sum, d) => sum + d.monthlyCost, 0);
  const totalHoursWatched = data.reduce((sum, d) => sum + d.hoursWatched, 0);
  const overallRate = totalHoursWatched > 0 ? totalCost / totalHoursWatched : totalCost;
  const subscriptionsBrokenEven = data.filter(d => d.percentComplete >= 100).length;
  const subscriptionsInRed = data.filter(d => d.percentComplete < 25).length;

  return {
    totalSubscriptions,
    totalCost,
    totalHoursWatched,
    overallRate,
    subscriptionsBrokenEven,
    subscriptionsInRed,
  };
};
