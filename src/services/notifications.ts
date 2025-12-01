/**
 * Morning After Notifications
 * Non-intrusive notifications sent the next morning to log watch time
 */

import * as Notifications from 'expo-notifications';
import { supabase } from '@/config/supabase';

// Schedule "morning after" notification
export const scheduleMorningAfterNotification = async (
  showTitle: string,
  showId: number,
  mediaType: 'movie' | 'tv'
) => {
  // Calculate tomorrow at 8 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const secondsUntilTomorrow = Math.floor((tomorrow.getTime() - Date.now()) / 1000);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Did you watch ${showTitle}?`,
      body: 'Tap to log your watch time and track your value!',
      data: {
        type: 'morning_after',
        showId,
        showTitle,
        mediaType,
      },
      categoryIdentifier: 'WATCH_LOG',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntilTomorrow,
      repeats: false,
    },
  });

  console.log(`[Notifications] Scheduled morning after notification for ${showTitle} at 8 AM tomorrow`);
};

// Set up notification categories with action buttons
export const setupNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync('WATCH_LOG', [
    {
      identifier: 'YES_1_EP',
      buttonTitle: 'Yes, 1 Ep',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'YES_BINGE',
      buttonTitle: 'Binged (3+)',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'NO',
      buttonTitle: 'Not yet',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);

  console.log('[Notifications] Notification categories set up');
};

// Handle notification response
export const handleNotificationResponse = async (
  response: Notifications.NotificationResponse,
  userId: string
) => {
  const { actionIdentifier } = response;
  const data = response.notification.request.content.data;

  if (data.type !== 'morning_after') return;

  console.log(`[Notifications] Handling response: ${actionIdentifier} for ${data.showTitle}`);

  if (actionIdentifier === 'YES_1_EP') {
    // Log 1 episode automatically
    await logQuickWatch(userId, Number(data.showId), String(data.mediaType), 1);
  } else if (actionIdentifier === 'YES_BINGE') {
    // Open app to binge slider
    // Navigation handled by app
    console.log('[Notifications] Opening app to binge slider');
  }
  // 'NO' does nothing
};

const logQuickWatch = async (
  userId: string,
  showId: number,
  mediaType: string,
  episodes: number
) => {
  try {
    // Get episode duration (default 45 min for TV, 120 for movies)
    const durationMinutes = mediaType === 'tv' ? 45 * episodes : 120;

    console.log(`[Notifications] Logging ${episodes} episodes (${durationMinutes} min) for show ${showId}`);

    // Update watchlist item with logged time
    const { error } = await supabase
      .from('watchlist_items')
      .update({
        watch_duration_minutes: durationMinutes,
        last_watched_at: new Date().toISOString(),
        status: 'watching',
      })
      .eq('user_id', userId)
      .eq('content_id', `${mediaType}-${showId}`);

    if (error) {
      console.error('[Notifications] Error logging watch time:', error);
    } else {
      console.log('[Notifications] Watch time logged successfully');
    }
  } catch (error) {
    console.error('[Notifications] Error in logQuickWatch:', error);
  }
};

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return false;
    }

    console.log('[Notifications] Permission granted');
    return true;
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return false;
  }
};

// Configure notification behavior
export const configureNotifications = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
};

// Cancel all scheduled notifications for a specific show
export const cancelMorningAfterNotification = async (showId: number) => {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of scheduledNotifications) {
    if (
      notification.content.data.type === 'morning_after' &&
      notification.content.data.showId === showId
    ) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      console.log(`[Notifications] Cancelled notification for show ${showId}`);
    }
  }
};

// Initialize notifications system
export const initializeNotifications = async () => {
  try {
    configureNotifications();
    await setupNotificationCategories();
    const hasPermission = await requestNotificationPermissions();

    if (!hasPermission) {
      console.log('[Notifications] User denied notification permissions');
      return false;
    }

    console.log('[Notifications] System initialized successfully');
    return true;
  } catch (error) {
    console.error('[Notifications] Error initializing:', error);
    return false;
  }
};
