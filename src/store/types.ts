/** Persisted shapes for ScheduleWith. Everything here lives on-device only. */

export const MIN_TASK_XP = 10;
export const MAX_TASK_XP = 100;
export const TASK_XP_STEP = 5;

export type Task = {
  id: string;
  title: string;
  description?: string;
  /** 10-100, in steps of 5. */
  xp: number;
};

export type Schedule = {
  id: string;
  name: string;
  tasks: Task[];
  createdAt: number;
  updatedAt: number;
};

/**
 * A task as it existed when the day began. Deliberately a *copy* rather than a
 * reference: editing or deleting the task on the live schedule afterwards must
 * not rewrite what happened on a past day.
 */
export type DayTask = {
  id: string;
  title: string;
  xp: number;
};

export type DayOutcome = 'pending' | 'success' | 'missed';

export type DayRecord = {
  /** Logical-day key, `YYYY-MM-DD`. See `@/store/day`. */
  date: string;
  scheduleId: string;
  /** Snapshotted so renaming the schedule later doesn't relabel history. */
  scheduleName: string;
  tasks: DayTask[];
  completedIds: string[];
  xpEarned: number;
  outcome: DayOutcome;
  startedAt: number;
  /**
   * The real instant this day stops being "today", fixed when the day is
   * created. Stored rather than re-derived: if expiry were recomputed from the
   * current `dayEndsAt` setting, changing that setting would silently look like
   * time had passed, and a day could be "completed" twice over in one sitting.
   */
  expiresAt: number;
  closedAt?: number;
};

export type Profile = {
  displayName: string;
  /** `file://` path inside the app's document directory. */
  avatarUri?: string;
  totalXp: number;
  streak: number;
  bestStreak: number;
  /** Logical-day key of the most recent fully-completed day. */
  lastSuccessDate?: string;
  onboarded: boolean;
};

export type Settings = {
  darkMode: boolean;
  /** `HH:mm` — the moment a logical day rolls over. */
  dayEndsAt: string;
  notifications: boolean;
  /** Sub-setting of `notifications`. */
  hourlyReminders: boolean;
};

export type AppState = {
  version: 1;
  schedules: Schedule[];
  activeScheduleId: string | null;
  today: DayRecord | null;
  /** Newest first, capped at `HISTORY_LIMIT`. */
  history: DayRecord[];
  profile: Profile;
  settings: Settings;
  /** Epoch ms until which an expired day is held open by "give me an hour". */
  graceUntil?: number;
  /** Logical-day key whose celebration screen has already been auto-shown. */
  celebratedDate?: string;
};

export const HISTORY_LIMIT = 365;

export const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  dayEndsAt: '02:00',
  notifications: false,
  hourlyReminders: false,
};

export const DEFAULT_PROFILE: Profile = {
  displayName: '',
  totalXp: 0,
  streak: 0,
  bestStreak: 0,
  onboarded: false,
};

export function createInitialState(darkMode = false): AppState {
  return {
    version: 1,
    schedules: [],
    activeScheduleId: null,
    today: null,
    history: [],
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS, darkMode },
  };
}
