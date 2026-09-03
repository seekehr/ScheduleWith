/**
 * Local reminder scheduling. Nothing here touches the network — these are
 * on-device notifications only.
 */

import * as Notifications from 'expo-notifications';

import { parseDayEnd } from '@/store/day';
import type { Settings } from '@/store/types';

/** Notifications that arrive while the app is open still show as banners. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const HOURLY_SECONDS = 60 * 60;

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;

    const requested = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    });
    return requested.granted;
  } catch {
    return false;
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing actionable — the OS will simply keep whatever is queued.
  }
}

/**
 * Rebuilds the whole reminder set from scratch.
 *
 * Called whenever a toggle flips, the day-end time changes, the day rolls over,
 * or the app foregrounds — so the "N tasks left" copy never goes stale.
 */
export async function syncReminders(
  settings: Settings,
  remainingTasks: number
): Promise<void> {
  await cancelAllReminders();
  if (!settings.notifications) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  const dayEndMinutes = parseDayEnd(settings.dayEndsAt);
  // One hour before the day expires — the last useful moment to act.
  const warningMinutes = (dayEndMinutes - 60 + 1440) % 1440;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'One hour left today',
        body:
          remainingTasks > 0
            ? `${remainingTasks} ${remainingTasks === 1 ? 'task' : 'tasks'} still unchecked. Don't break the streak.`
            : 'Your day wraps up soon. Nice work staying on top of it.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(warningMinutes / 60),
        minute: warningMinutes % 60,
      },
    });
  } catch {
    // A failed schedule shouldn't take the hourly reminder down with it.
  }

  if (!settings.hourlyReminders) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Still on your list',
        body: 'You have unfinished tasks waiting for you.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: HOURLY_SECONDS,
        repeats: true,
      },
    });
  } catch {
    // Same as above: best-effort.
  }
}
