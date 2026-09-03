/**
 * Persistence for the whole app state.
 *
 * Backed by `expo-sqlite/kv-store`, which is AsyncStorage-shaped but adds
 * synchronous reads — so the very first render already knows whether the user
 * has onboarded and we never flash the welcome screen at a returning user.
 */

import Storage from 'expo-sqlite/kv-store';

import { nextBoundaryAfter } from '@/store/day';

import {
  createInitialState,
  DEFAULT_PROFILE,
  DEFAULT_SETTINGS,
  HISTORY_LIMIT,
  type AppState,
  type DayRecord,
  type Schedule,
  type Task,
} from '@/store/types';

const STATE_KEY = 'schedulewith:v1:state';

export function loadStateSync(fallbackDarkMode = false): AppState | null {
  try {
    const raw = Storage.getItemSync(STATE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as unknown, fallbackDarkMode);
  } catch {
    // A corrupt or unreadable blob must never brick the app; start fresh.
    return null;
  }
}

export async function loadState(fallbackDarkMode = false): Promise<AppState | null> {
  try {
    const raw = await Storage.getItem(STATE_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as unknown, fallbackDarkMode);
  } catch {
    return null;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await Storage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Losing one debounced write is survivable — the next one will catch up.
  }
}

export async function clearState(): Promise<void> {
  try {
    await Storage.removeItem(STATE_KEY);
  } catch {
    // Nothing useful to do if the store itself is unavailable.
  }
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Coerces an unknown blob into a usable `AppState`, dropping anything
 * malformed. This runs against our own storage *and* against imported JSON
 * files, so it has to assume nothing about the input.
 */
function migrate(input: unknown, fallbackDarkMode: boolean): AppState {
  const base = createInitialState(fallbackDarkMode);
  if (!isRecord(input)) return base;

  const schedules = asArray(input.schedules).map(parseSchedule).filter(isPresent);
  const scheduleIds = new Set(schedules.map((schedule) => schedule.id));
  const activeScheduleId =
    typeof input.activeScheduleId === 'string' && scheduleIds.has(input.activeScheduleId)
      ? input.activeScheduleId
      : (schedules[0]?.id ?? null);

  const profileInput = isRecord(input.profile) ? input.profile : {};
  const settingsInput = isRecord(input.settings) ? input.settings : {};
  const dayEndsAt = asString(settingsInput.dayEndsAt, DEFAULT_SETTINGS.dayEndsAt);

  return {
    version: 1,
    schedules,
    activeScheduleId,
    today: parseDayRecord(input.today, dayEndsAt),
    history: asArray(input.history)
      .map((record) => parseDayRecord(record, dayEndsAt))
      .filter(isPresent)
      .slice(0, HISTORY_LIMIT),
    profile: {
      displayName: asString(profileInput.displayName, DEFAULT_PROFILE.displayName).slice(0, 40),
      avatarUri: optionalString(profileInput.avatarUri),
      totalXp: asCount(profileInput.totalXp),
      streak: asCount(profileInput.streak),
      bestStreak: asCount(profileInput.bestStreak),
      lastSuccessDate: optionalString(profileInput.lastSuccessDate),
      onboarded: profileInput.onboarded === true,
    },
    settings: {
      darkMode: typeof settingsInput.darkMode === 'boolean' ? settingsInput.darkMode : fallbackDarkMode,
      dayEndsAt,
      notifications: settingsInput.notifications === true,
      hourlyReminders: settingsInput.hourlyReminders === true,
    },
    graceUntil: typeof input.graceUntil === 'number' ? input.graceUntil : undefined,
    celebratedDate: optionalString(input.celebratedDate),
  };
}

export function parseSchedule(input: unknown): Schedule | null {
  if (!isRecord(input)) return null;
  const name = asString(input.name, '').trim();
  if (!name) return null;
  const now = Date.now();
  return {
    id: asString(input.id, '') || makeId(),
    name: name.slice(0, 60),
    tasks: asArray(input.tasks).map(parseTask).filter(isPresent),
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : now,
  };
}

function parseTask(input: unknown): Task | null {
  if (!isRecord(input)) return null;
  const title = asString(input.title, '').trim();
  if (!title) return null;
  return {
    id: asString(input.id, '') || makeId(),
    title: title.slice(0, 120),
    description: optionalString(input.description)?.slice(0, 500),
    xp: clampXp(input.xp),
  };
}

function parseDayRecord(input: unknown, dayEndsAt: string): DayRecord | null {
  if (!isRecord(input)) return null;
  const date = asString(input.date, '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const tasks = asArray(input.tasks)
    .map((task) => {
      if (!isRecord(task)) return null;
      const title = asString(task.title, '').trim();
      const id = asString(task.id, '');
      if (!title || !id) return null;
      return { id, title: title.slice(0, 120), xp: clampXp(task.xp) };
    })
    .filter(isPresent);

  const taskIds = new Set(tasks.map((task) => task.id));
  const outcome = input.outcome;

  return {
    date,
    scheduleId: asString(input.scheduleId, ''),
    scheduleName: asString(input.scheduleName, 'Schedule'),
    tasks,
    completedIds: asArray(input.completedIds).filter(
      (id): id is string => typeof id === 'string' && taskIds.has(id)
    ),
    xpEarned: asCount(input.xpEarned),
    outcome: outcome === 'success' || outcome === 'missed' ? outcome : 'pending',
    startedAt: typeof input.startedAt === 'number' ? input.startedAt : Date.now(),
    // Records written before days carried their own expiry fall back to the
    // boundary their date implies under the current setting.
    expiresAt:
      typeof input.expiresAt === 'number'
        ? input.expiresAt
        : nextBoundaryAfter(
            typeof input.startedAt === 'number' ? input.startedAt : Date.now(),
            dayEndsAt
          ),
    closedAt: typeof input.closedAt === 'number' ? input.closedAt : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clampXp(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 10;
  const stepped = Math.round(numeric / 5) * 5;
  return Math.min(100, Math.max(10, stepped));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
