/**
 * SkeletonLoader Component
 * Animated loading placeholders with multiple variants
 */

import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { COLORS } from './theme';

// ============================================================================
// BASE SKELETON COMPONENT
// ============================================================================

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * Base Skeleton component with shimmer animation
 */
const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ============================================================================
// LIST ITEM SKELETON
// ============================================================================

interface SkeletonListItemProps {
  showAvatar?: boolean;
  showSubtitle?: boolean;
  avatarSize?: number;
}

/**
 * Skeleton for list items (subscriptions, content, etc.)
 *
 * @example
 * <SkeletonListItem showAvatar showSubtitle />
 */
export const SkeletonListItem: React.FC<SkeletonListItemProps> = ({
  showAvatar = true,
  showSubtitle = true,
  avatarSize = 48,
}) => {
  return (
    <View style={styles.listItem}>
      {showAvatar && (
        <Skeleton
          width={avatarSize}
          height={avatarSize}
          borderRadius={avatarSize / 2}
          style={styles.avatar}
        />
      )}

      <View style={styles.listItemContent}>
        <Skeleton width="60%" height={16} style={styles.title} />
        {showSubtitle && <Skeleton width="40%" height={14} style={styles.subtitle} />}
      </View>

      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
  );
};

// ============================================================================
// CARD SKELETON
// ============================================================================

interface SkeletonCardProps {
  showImage?: boolean;
  imageHeight?: number;
  lines?: number;
}

/**
 * Skeleton for card components (recommendations, insights, etc.)
 *
 * @example
 * <SkeletonCard showImage imageHeight={200} lines={3} />
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  imageHeight = 150,
  lines = 2,
}) => {
  return (
    <View style={styles.card}>
      {showImage && <Skeleton width="100%" height={imageHeight} borderRadius={12} />}

      <View style={styles.cardContent}>
        <Skeleton width="80%" height={18} style={styles.cardTitle} />

        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            width={index === lines - 1 ? '60%' : '100%'}
            height={14}
            style={styles.cardLine}
          />
        ))}
      </View>
    </View>
  );
};

// ============================================================================
// SUBSCRIPTION CARD SKELETON
// ============================================================================

/**
 * Skeleton for subscription cards on dashboard
 *
 * @example
 * <SkeletonSubscriptionCard />
 */
export const SkeletonSubscriptionCard: React.FC = () => {
  return (
    <View style={styles.subscriptionCard}>
      <View style={styles.subscriptionHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.subscriptionInfo}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
        </View>
      </View>

      <View style={styles.subscriptionStats}>
        <View style={styles.stat}>
          <Skeleton width={60} height={12} />
          <Skeleton width={80} height={20} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.stat}>
          <Skeleton width={60} height={12} />
          <Skeleton width={80} height={20} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// DASHBOARD SKELETON
// ============================================================================

/**
 * Complete skeleton for dashboard screen
 *
 * @example
 * <SkeletonDashboard />
 */
export const SkeletonDashboard: React.FC = () => {
  return (
    <View style={styles.dashboardContainer}>
      {/* Header Stats */}
      <View style={styles.dashboardHeader}>
        <Skeleton width="100%" height={120} borderRadius={16} />
      </View>

      {/* Subscription Cards */}
      <View style={styles.section}>
        <Skeleton width={150} height={20} style={styles.sectionTitle} />
        <SkeletonSubscriptionCard />
        <SkeletonSubscriptionCard />
        <SkeletonSubscriptionCard />
      </View>

      {/* Insights Section */}
      <View style={styles.section}>
        <Skeleton width={120} height={20} style={styles.sectionTitle} />
        <SkeletonCard showImage={false} lines={1} />
      </View>
    </View>
  );
};

// ============================================================================
// LIST SKELETON
// ============================================================================

interface SkeletonListProps {
  count?: number;
  showAvatar?: boolean;
  showSubtitle?: boolean;
}

/**
 * Skeleton for lists (watchlist, recommendations, etc.)
 *
 * @example
 * <SkeletonList count={5} showAvatar showSubtitle />
 */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 3,
  showAvatar = true,
  showSubtitle = true,
}) => {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonListItem
          key={index}
          showAvatar={showAvatar}
          showSubtitle={showSubtitle}
        />
      ))}
    </View>
  );
};

// ============================================================================
// FULL SCREEN SKELETON
// ============================================================================

/**
 * Full screen loading skeleton
 *
 * @example
 * <SkeletonFullScreen />
 */
export const SkeletonFullScreen: React.FC = () => {
  return (
    <View style={styles.fullScreen}>
      <View style={styles.fullScreenHeader}>
        <Skeleton width={200} height={28} style={{ marginBottom: 8 }} />
        <Skeleton width={150} height={16} />
      </View>

      <View style={styles.fullScreenContent}>
        <SkeletonCard showImage lines={2} />
        <SkeletonCard showImage lines={2} />
      </View>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.lightGray,
  },

  // List Item
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatar: {
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 0,
  },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    marginBottom: 12,
  },
  cardLine: {
    marginBottom: 8,
  },

  // Subscription Card
  subscriptionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subscriptionStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flex: 1,
  },

  // Dashboard
  dashboardContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  dashboardHeader: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },

  // List
  list: {
    padding: 16,
  },

  // Full Screen
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  fullScreenHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  fullScreenContent: {
    flex: 1,
  },
});
