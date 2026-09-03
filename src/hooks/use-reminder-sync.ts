import { useEffect } from 'react';

import { useDayProgress, useHydrated, useSettings } from '@/store/app-store';
import { syncReminders } from '@/store/notifications';

/** Ticking a task shouldn't fire off a reschedule on every single tap. */
const DEBOUNCE_MS = 2000;

/**
 * Keeps scheduled reminders in step with the settings and with how much of
 * today is still outstanding. Mounted once, at the app shell.
 */
export function useReminderSync(): void {
  const hydrated = useHydrated();
  const settings = useSettings();
  const { remaining } = useDayProgress();

  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => void syncReminders(settings, remaining), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    settings,
    settings.notifications,
    settings.hourlyReminders,
    settings.dayEndsAt,
    remaining,
  ]);
}
