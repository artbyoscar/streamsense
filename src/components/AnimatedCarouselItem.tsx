/**
 * Animated Carousel Item Component
 * Provides smooth animations when items are added to watchlist or status changes
 */

import React, { useState } from 'react';
import { ViewProps } from 'react-native';
import Animated, {
  FadeOut,
  SlideOutDown,
  Layout,
  ZoomOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface AnimatedCarouselItemProps extends ViewProps {
  children: React.ReactNode;
  onRemovalComplete?: () => void;
  animationType?: 'slide' | 'fade' | 'zoom' | 'combined';
  duration?: number;
}

export const AnimatedCarouselItem: React.FC<AnimatedCarouselItemProps> = ({
  children,
  onRemovalComplete,
  animationType = 'combined',
  duration = 300,
  style,
  ...props
}) => {
  // Get the appropriate exit animation based on type
  const getExitAnimation = () => {
    switch (animationType) {
      case 'slide':
        return SlideOutDown.duration(duration);
      case 'fade':
        return FadeOut.duration(duration);
      case 'zoom':
        return ZoomOut.duration(duration);
      case 'combined':
      default:
        // Combine slide and fade for smooth removal
        return SlideOutDown.duration(duration).withCallback(() => {
          if (onRemovalComplete) {
            onRemovalComplete();
          }
        });
    }
  };

  return (
    <Animated.View
      layout={Layout.duration(300)}
      exiting={getExitAnimation()}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Hook to manage animated carousel items
 * Provides state and handlers for removing items with animation
 */
export const useAnimatedCarousel = <T extends { id: number | string }>(
  initialItems: T[]
) => {
  const [items, setItems] = useState<T[]>(initialItems);
  const [removedIds, setRemovedIds] = useState<Set<number | string>>(new Set());

  // Update items when initial items change
  React.useEffect(() => {
    setItems(initialItems.filter(item => !removedIds.has(item.id)));
  }, [initialItems]);

  // Mark an item for removal (will trigger animation)
  const removeItem = (itemId: number | string, hapticType: 'success' | 'warning' | 'light' = 'light') => {
    // Trigger appropriate haptic feedback
    switch (hapticType) {
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'light':
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
    }

    // Mark as removed
    setRemovedIds(prev => new Set([...prev, itemId]));

    // Filter out after animation duration
    setTimeout(() => {
      setItems(prev => prev.filter(item => item.id !== itemId));
    }, 350); // Slightly longer than animation duration
  };

  // Get visible items (not removed)
  const visibleItems = items.filter(item => !removedIds.has(item.id));

  // Reset removed items
  const reset = () => {
    setRemovedIds(new Set());
    setItems(initialItems);
  };

  return {
    items: visibleItems,
    removedIds,
    removeItem,
    reset,
  };
};
