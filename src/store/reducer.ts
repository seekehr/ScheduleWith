/**
 * All state transitions for ScheduleWith.
 *
 * Kept as a pure reducer so the day-rollover rules (the fiddliest part of the
 * app) can be reasoned about without any React or native involvement.
 */

import { dayCompletionBonus } from '@/store/leveling';
import { isConsecutive, logicalDateKey, nextBoundaryAfter, nextDateKey } from '@/store/day';
import { makeId } from '@/store/storage';
import {
  createInitialState,
  HISTORY_LIMIT,
  type AppState,
  type DayRecord,
  type Schedule,
  type Settings,
  type Task,
} from '@/store/types';

export const GRACE_MS = 60 * 60 * 1000;

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'finishOnboarding'; displayName: string; avatarUri?: string }
  | { type: 'setDisplayName'; displayName: string }
  | { type: 'setAvatar'; avatarUri?: string }
  | { type: 'patchSettings'; patch: Partial<Settings> }
  | { type: 'addSchedule'; schedule: Schedule; makeActive?: boolean }
  | { type: 'renameSchedule'; id: string; name: string }
  | { type: 'setScheduleTasks'; id: string; tasks: Task[] }
  | { type: 'deleteSchedule'; id: string }
  | { type: 'moveSchedule'; id: string; direction: -1 | 1 }
  | { type: 'setActiveSchedule'; id: string }
  | { type: 'toggleTask'; taskId: string }
  | { type: 'syncDay'; now: number }
  | { type: 'startNewDay'; now: number }
  | { type: 'grantGrace'; now: number }
  | { type: 'dismissCelebration' }
  | { type: 'showCelebration' }
  | { type: 'resetEverything' };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state;

    case 'finishOnboarding':
      return {
        ...state,
        profile: {
          ...state.profile,
          displayName: action.displayName.trim() || 'Friend',
          avatarUri: action.avatarUri,
          onboarded: true,
        },
      };

    case 'setDisplayName':
      return {
        ...state,
        profile: { ...state.profile, displayName: action.displayName.trim() || 'Friend' },
      };

    case 'setAvatar':
      return { ...state, profile: { ...state.profile, avatarUri: action.avatarUri } };

    case 'patchSettings': {
      const settings = { ...state.settings, ...action.patch };
      // The hourly reminder is a sub-setting: it cannot outlive its parent.
      if (!settings.notifications) settings.hourlyReminders = false;

      // Moving the day-end boundary re-anchors the running day, but must never
      // change which day it *is*. Re-dating it here would make the change look
      // like a day had elapsed, handing out a free streak increment.
      // Measured from when the day began, so moving the boundary to a time
      // that has already passed ends the running day now, while moving it
      // later simply gives that day more room.
      const today =
        state.today && settings.dayEndsAt !== state.settings.dayEndsAt
          ? {
              ...state.today,
              expiresAt: nextBoundaryAfter(state.today.startedAt, settings.dayEndsAt),
            }
          : state.today;

      return { ...state, settings, today };
    }

    case 'addSchedule': {
      const schedules = [...state.schedules, action.schedule];
      const shouldActivate = action.makeActive || state.activeScheduleId === null;
      return {
        ...state,
        schedules,
        activeScheduleId: shouldActivate ? action.schedule.id : state.activeScheduleId,
      };
    }

    case 'renameSchedule':
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.id === action.id
            ? { ...schedule, name: action.name.trim() || schedule.name, updatedAt: Date.now() }
            : schedule
        ),
      };

    case 'setScheduleTasks':
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.id === action.id
            ? { ...schedule, tasks: action.tasks, updatedAt: Date.now() }
            : schedule
        ),
      };

    case 'deleteSchedule': {
      const schedules = state.schedules.filter((schedule) => schedule.id !== action.id);
      if (schedules.length === state.schedules.length) return state;
      const wasActive = state.activeScheduleId === action.id;
      return {
        ...state,
        schedules,
        activeScheduleId: wasActive ? (schedules[0]?.id ?? null) : state.activeScheduleId,
        // Dropping the active schedule invalidates today's snapshot.
        today: wasActive ? null : state.today,
      };
    }

    case 'moveSchedule': {
      const index = state.schedules.findIndex((schedule) => schedule.id === action.id);
      const target = index + action.direction;
      if (index === -1 || target < 0 || target >= state.schedules.length) return state;
      const schedules = [...state.schedules];
      [schedules[index], schedules[target]] = [schedules[target], schedules[index]];
      return { ...state, schedules };
    }

    case 'setActiveSchedule': {
      if (!state.schedules.some((schedule) => schedule.id === action.id)) return state;
      if (state.activeScheduleId === action.id) return state;
      return { ...state, activeScheduleId: action.id };
    }

    case 'toggleTask': {
      const today = state.today;
      if (!today) return state;
      const task = today.tasks.find((candidate) => candidate.id === action.taskId);
      if (!task) return state;

      const wasComplete = today.completedIds.includes(task.id);
      const completedIds = wasComplete
        ? today.completedIds.filter((id) => id !== task.id)
        : [...today.completedIds, task.id];
      const delta = wasComplete ? -task.xp : task.xp;

      return {
        ...state,
        today: {
          ...today,
          completedIds,
          xpEarned: Math.max(0, today.xpEarned + delta),
        },
        profile: {
          ...state.profile,
          totalXp: Math.max(0, state.profile.totalXp + delta),
        },
        // Un-ticking after a celebration should let it fire again on re-completion.
        celebratedDate: wasComplete ? undefined : state.celebratedDate,
      };
    }

    case 'syncDay':
      return syncDay(state, action.now);

    case 'startNewDay':
      return startNewDay(state, action.now);

    case 'grantGrace':
      return { ...state, graceUntil: action.now + GRACE_MS };

    case 'dismissCelebration': {
      const date = state.today?.date;
      if (!date || state.celebratedDate === date) return state;
      return { ...state, celebratedDate: date };
    }

    case 'showCelebration':
      return state.celebratedDate === undefined ? state : { ...state, celebratedDate: undefined };

    case 'resetEverything':
      return createInitialState(state.settings.darkMode);
  }
}

/* -------------------------------------------------------------------------- */
/* Day lifecycle                                                              */
/* -------------------------------------------------------------------------- */

export function snapshotDay(
  schedule: Schedule,
  date: string,
  now: number,
  dayEndsAt: string
): DayRecord {
  return {
    date,
    scheduleId: schedule.id,
    scheduleName: schedule.name,
    tasks: schedule.tasks.map((task) => ({ id: task.id, title: task.title, xp: task.xp })),
    completedIds: [],
    xpEarned: 0,
    outcome: 'pending',
    startedAt: now,
    expiresAt: nextBoundaryAfter(now, dayEndsAt),
  };
}

/**
 * Where the day after `previous` lands, and how many whole days were skipped
 * getting there.
 *
 * Walks real day-windows forward rather than deriving a key from the clock, so
 * the calendar can only advance when time actually passes. A day closed before
 * it expired — the manual "Just Woke Up" reset — stays on the same date, which
 * is what stops repeated resets from inflating the streak.
 */
function advanceDay(
  previous: DayRecord,
  now: number,
  dayEndsAt: string
): { key: string; skipped: number } {
  if (now < previous.expiresAt) return { key: previous.date, skipped: 0 };

  // Count the boundaries that came and went after this day's own, each one a
  // whole day nobody was here for.
  let boundary = previous.expiresAt;
  let skipped = 0;

  // Bounded so a wildly wrong device clock can't spin here.
  while (skipped < HISTORY_LIMIT) {
    const next = nextBoundaryAfter(boundary, dayEndsAt);
    if (now < next) break;
    boundary = next;
    skipped += 1;
  }

  return { key: nextDateKey(previous.date, skipped + 1), skipped };
}

/**
 * Brings `today` in line with the clock and the active schedule.
 *
 * Deliberately does *not* roll the day over when it expires — that is the job
 * of `startNewDay`, triggered by the user pressing "Just Woke Up". Leaving the
 * stale record in place is what lets the punishment screen appear at all.
 */
function syncDay(state: AppState, now: number): AppState {
  const active = state.schedules.find((schedule) => schedule.id === state.activeScheduleId);
  if (!active) {
    return state.today === null ? state : { ...state, today: null };
  }

  const dayEndsAt = state.settings.dayEndsAt;
  const today = state.today;

  if (!today) {
    const key = logicalDateKey(now, dayEndsAt);
    return {
      ...state,
      today: snapshotDay(active, key, now, dayEndsAt),
      graceUntil: undefined,
    };
  }

  // Expired days are left alone so the overlay can react to them. This is
  // checked before the schedule swap below: otherwise switching schedules would
  // quietly discard an unfinished day, dodging the punishment screen and
  // keeping a streak that should have been broken.
  if (now >= today.expiresAt) return state;

  // The active schedule changed underneath us: restart the day on the new one,
  // keeping any XP already banked (it lives in profile.totalXp regardless).
  if (today.scheduleId !== active.id) {
    return {
      ...state,
      today: { ...snapshotDay(active, today.date, now, dayEndsAt), xpEarned: today.xpEarned },
      celebratedDate: undefined,
    };
  }

  return { ...state, today: mergeScheduleEdits(today, active) };
}

/**
 * Folds schedule edits into the running day.
 *
 * Additive on purpose: newly created tasks show up in today's To-Do, but tasks
 * deleted from the schedule stay in today's snapshot. That keeps the day
 * winnable mid-edit and, more importantly, keeps every record self-contained so
 * past days can never be rewritten by an edit.
 */
function mergeScheduleEdits(today: DayRecord, schedule: Schedule): DayRecord {
  const known = new Set(today.tasks.map((task) => task.id));
  const additions = schedule.tasks
    .filter((task) => !known.has(task.id))
    .map((task) => ({ id: task.id, title: task.title, xp: task.xp }));

  // Titles are refreshed from the live schedule so a typo fix shows up today,
  // while XP stays frozen so already-awarded XP can be exactly reversed.
  const live = new Map(schedule.tasks.map((task) => [task.id, task]));
  const renamed = today.tasks.map((task) => {
    const current = live.get(task.id);
    return current && current.title !== task.title ? { ...task, title: current.title } : task;
  });

  const titlesChanged = renamed.some((task, index) => task !== today.tasks[index]);
  if (additions.length === 0 && !titlesChanged && today.scheduleName === schedule.name) {
    return today;
  }

  return {
    ...today,
    scheduleName: schedule.name,
    tasks: [...renamed, ...additions],
  };
}

/**
 * Closes out the current day and opens a fresh one.
 *
 * Backing this is the streak rule: a day counts only if every task in its
 * snapshot was ticked, and the streak survives only across *consecutive*
 * logical days. Days the app was never opened on are backfilled as misses so
 * the history stays honest.
 */
function startNewDay(state: AppState, now: number): AppState {
  const dayEndsAt = state.settings.dayEndsAt;
  const previous = state.today;
  const active = state.schedules.find((schedule) => schedule.id === state.activeScheduleId);

  const { key, skipped } = previous
    ? advanceDay(previous, now, dayEndsAt)
    : { key: logicalDateKey(now, dayEndsAt), skipped: 0 };

  let profile = state.profile;
  const closedRecords: DayRecord[] = [];

  if (previous) {
    const allDone =
      previous.tasks.length > 0 && previous.completedIds.length >= previous.tasks.length;

    if (allDone) {
      const continues =
        profile.lastSuccessDate !== undefined &&
        isConsecutive(profile.lastSuccessDate, previous.date);
      const streak = continues ? profile.streak + 1 : 1;
      const bonus = dayCompletionBonus(streak);

      closedRecords.push({
        ...previous,
        outcome: 'success',
        xpEarned: previous.xpEarned + bonus,
        closedAt: now,
      });
      profile = {
        ...profile,
        streak,
        bestStreak: Math.max(profile.bestStreak, streak),
        lastSuccessDate: previous.date,
        totalXp: profile.totalXp + bonus,
      };
    } else {
      closedRecords.push({ ...previous, outcome: 'missed', closedAt: now });
      profile = { ...profile, streak: 0 };
    }

    // Days that elapsed while the app was closed.
    for (let offset = 1; offset <= skipped; offset += 1) {
      const date = nextDateKey(previous.date, offset);
      closedRecords.push({
        ...previous,
        date,
        completedIds: [],
        xpEarned: 0,
        outcome: 'missed',
        startedAt: now,
        expiresAt: nextBoundaryAfter(now, dayEndsAt),
        closedAt: now,
      });
    }
    if (skipped > 0) profile = { ...profile, streak: 0 };
  }

  return {
    ...state,
    profile,
    // `closedRecords` is oldest-first; history is newest-first.
    history: [...closedRecords.reverse(), ...state.history].slice(0, HISTORY_LIMIT),
    today: active ? snapshotDay(active, key, now, dayEndsAt) : null,
    graceUntil: undefined,
    celebratedDate: undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Derived state                                                              */
/* -------------------------------------------------------------------------- */

export type DayStatus = 'none' | 'active' | 'complete' | 'expired' | 'grace';

/** What the day-end overlay should be showing, if anything. */
export function dayStatus(state: AppState, now: number): DayStatus {
  const today = state.today;
  if (!today || today.tasks.length === 0) return 'none';

  if (today.completedIds.length >= today.tasks.length) return 'complete';

  if (now < today.expiresAt) return 'active';

  return state.graceUntil !== undefined && now < state.graceUntil ? 'grace' : 'expired';
}

export function makeSchedule(name: string, tasks: Task[] = []): Schedule {
  const now = Date.now();
  return { id: makeId(), name: name.trim(), tasks, createdAt: now, updatedAt: now };
}
