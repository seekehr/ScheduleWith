/**
 * The single source of truth for the app, wired to disk and to the clock.
 */

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState as RNAppState, Appearance } from 'react-native';

import { levelFromXp, streakTier, type LevelInfo, type StreakTier } from '@/store/leveling';
import { dayStatus, reducer, type Action, type DayStatus } from '@/store/reducer';
import { loadState, loadStateSync, saveState } from '@/store/storage';
import { createInitialState, type AppState, type DayRecord, type Schedule } from '@/store/types';

/** How often time-dependent UI (countdown, day rollover) is re-evaluated. */
const TICK_MS = 30_000;
const PERSIST_DEBOUNCE_MS = 200;

type StoreValue = {
  state: AppState;
  dispatch: (action: Action) => void;
  /** False only while an async fallback hydration is still in flight. */
  hydrated: boolean;
  /** Coarse clock, refreshed on tick and on foreground. */
  now: number;
};

const StoreContext = createContext<StoreValue | null>(null);

function systemPrefersDark(): boolean {
  try {
    return Appearance.getColorScheme() === 'dark';
  } catch {
    return false;
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  // Synchronous first read: a returning user never sees the welcome screen flash.
  const bootstrap = useRef<{ state: AppState; fromDisk: boolean } | null>(null);
  if (bootstrap.current === null) {
    const persisted = loadStateSync(systemPrefersDark());
    bootstrap.current = {
      state: persisted ?? createInitialState(systemPrefersDark()),
      fromDisk: persisted !== null,
    };
  }

  const [state, dispatch] = useReducer(reducer, bootstrap.current.state);
  const [hydrated, setHydrated] = useState(bootstrap.current.fromDisk);
  const [now, setNow] = useState(() => Date.now());

  // If the synchronous read came up empty it may simply have been unavailable
  // that early, so try once more asynchronously before trusting "new user".
  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    loadState(systemPrefersDark())
      .then((persisted) => {
        if (cancelled) return;
        if (persisted) dispatch({ type: 'hydrate', state: persisted });
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  // Debounced write-behind of the whole blob.
  const skipFirstWrite = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false;
      return;
    }
    const timer = setTimeout(() => void saveState(state), PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, hydrated]);

  // Keep `now` and the day snapshot current.
  useEffect(() => {
    if (!hydrated) return;

    const tick = () => {
      const timestamp = Date.now();
      setNow(timestamp);
      dispatch({ type: 'syncDay', now: timestamp });
    };

    tick();
    const interval = setInterval(tick, TICK_MS);
    const subscription = RNAppState.addEventListener('change', (status) => {
      if (status === 'active') tick();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [hydrated]);

  // A schedule edit can invalidate today's snapshot immediately.
  useEffect(() => {
    if (!hydrated) return;
    dispatch({ type: 'syncDay', now: Date.now() });
  }, [hydrated, state.schedules, state.activeScheduleId, state.settings.dayEndsAt]);

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, hydrated, now }),
    [state, hydrated, now]
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

function useStore(): StoreValue {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore must be used inside <AppStoreProvider>');
  return store;
}

export function useAppState(): AppState {
  return useStore().state;
}

export function useDispatch(): (action: Action) => void {
  return useStore().dispatch;
}

export function useHydrated(): boolean {
  return useStore().hydrated;
}

export function useNow(): number {
  return useStore().now;
}

export function useProfile() {
  return useStore().state.profile;
}

export function useSettings() {
  return useStore().state.settings;
}

export function useSchedules(): Schedule[] {
  return useStore().state.schedules;
}

export function useActiveSchedule(): Schedule | null {
  const { state } = useStore();
  return useMemo(
    () => state.schedules.find((schedule) => schedule.id === state.activeScheduleId) ?? null,
    [state.schedules, state.activeScheduleId]
  );
}

export function useToday(): DayRecord | null {
  return useStore().state.today;
}

export function useLevel(): LevelInfo {
  const totalXp = useStore().state.profile.totalXp;
  return useMemo(() => levelFromXp(totalXp), [totalXp]);
}

export function useStreakTier(): StreakTier {
  const streak = useStore().state.profile.streak;
  return useMemo(() => streakTier(streak), [streak]);
}

export function useDayStatus(): DayStatus {
  const { state, now } = useStore();
  return useMemo(() => dayStatus(state, now), [state, now]);
}

/** Milliseconds until the current logical day expires; 0 once it has. */
export function useTimeLeft(): number {
  const { state, now } = useStore();
  return useMemo(() => {
    if (!state.today) return 0;
    return Math.max(0, state.today.expiresAt - now);
  }, [state.today, now]);
}

/** Progress through today's checklist, as counts and a 0-1 ratio. */
export function useDayProgress() {
  const today = useToday();
  return useMemo(() => {
    const total = today?.tasks.length ?? 0;
    const done = today?.completedIds.length ?? 0;
    return { done, total, remaining: Math.max(0, total - done), ratio: total ? done / total : 0 };
  }, [today]);
}

/** Stable helper for the common "tick a task" call site. */
export function useToggleTask() {
  const dispatch = useDispatch();
  return useCallback((taskId: string) => dispatch({ type: 'toggleTask', taskId }), [dispatch]);
}
