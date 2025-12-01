/**
 * useNotifications Hook
 * React hook for managing notifications in the app
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '@/stores/authStore';
import {
  initializeNotifications,
  handleNotificationResponse,
  scheduleMorningAfterNotification,
  cancelMorningAfterNotification,
} from '@/services/notifications';

export const useNotifications = () => {
  const user = useAuthStore((state) => state.user);
  const notificationListener = useRef<Notifications.Subscription | undefined>(undefined);
  const responseListener = useRef<Notifications.Subscription | undefined>(undefined);

  useEffect(() => {
    // Initialize notification system on mount
    initializeNotifications();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[useNotifications] Notification received:', notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        if (user?.id) {
          await handleNotificationResponse(response, user.id);
        }
      }
    );

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  return {
    scheduleMorningAfter: scheduleMorningAfterNotification,
    cancelMorningAfter: cancelMorningAfterNotification,
  };
};
