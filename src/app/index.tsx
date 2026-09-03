import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { BottomSheet, SheetAction } from '@/components/bottom-sheet';
import { Fab } from '@/components/fab';
import { GlassPanel } from '@/components/glass-panel';
import { ProfileHeader } from '@/components/profile-header';
import { SwipeUpHandle } from '@/components/swipe-up-handle';
import { TaskRow } from '@/components/task-row';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useActiveSchedule,
  useAppState,
  useDayProgress,
  useDispatch,
  useSchedules,
  useTimeLeft,
  useToday,
  useToggleTask,
} from '@/store/app-store';
import { formatTimeLeft } from '@/store/day';
import { exportSchedule, importSchedule } from '@/store/transfer';
import type { DayTask } from '@/store/types';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const dispatch = useDispatch();

  const state = useAppState();
  const schedules = useSchedules();
  const activeSchedule = useActiveSchedule();
  const today = useToday();
  const toggleTask = useToggleTask();
  const progress = useDayProgress();
  const timeLeft = useTimeLeft();

  const [navOpen, setNavOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  // Descriptions live on the schedule, not on the day snapshot, so they're
  // looked up rather than copied — a snapshot only carries what scoring needs.
  const descriptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of activeSchedule?.tasks ?? []) {
      if (task.description) map.set(task.id, task.description);
    }
    return map;
  }, [activeSchedule]);

  const { todo, done } = useMemo(() => {
    const completed = new Set(today?.completedIds ?? []);
    const tasks = today?.tasks ?? [];
    return {
      todo: tasks.filter((task) => !completed.has(task.id)),
      done: tasks.filter((task) => completed.has(task.id)),
    };
  }, [today]);

  // The object form keeps this valid under expo-router's typed routes, where a
  // built string like `/schedule/abc` is not a known href but the pattern is.
  const openEditor = useCallback(
    (id: string) => {
      setActionsOpen(false);
      router.push({ pathname: '/schedule/[id]', params: { id } });
    },
    [router]
  );

  const handleImport = useCallback(async () => {
    setActionsOpen(false);
    const imported = await importSchedule(schedules.map((schedule) => schedule.name));
    if (imported) {
      dispatch({ type: 'addSchedule', schedule: imported, makeActive: true });
      openEditor(imported.id);
    }
  }, [schedules, dispatch, openEditor]);

  const handleExport = useCallback(async () => {
    setActionsOpen(false);
    if (activeSchedule) await exportSchedule(activeSchedule);
  }, [activeSchedule]);

  const allDone = progress.total > 0 && progress.remaining === 0;
  const celebrationDismissed = state.celebratedDate === today?.date;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerArea}>
          <ProfileHeader onPress={() => router.push('/settings')} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {activeSchedule ? (
            <DayMeta
              scheduleName={activeSchedule.name}
              emoji={activeSchedule.emoji}
              timeLeft={timeLeft}
              done={progress.done}
              total={progress.total}
            />
          ) : null}

          {!activeSchedule ? (
            <EmptyState
              title="No schedule yet"
              body="Create one to start earning XP. Tap the + button below."
              actionLabel="Create a schedule"
              onAction={() => openEditor('new')}
            />
          ) : progress.total === 0 ? (
            <EmptyState
              title={`"${activeSchedule.name}" is empty`}
              body="Add a few tasks and they'll show up here tomorrow morning — and right now."
              actionLabel="Add tasks"
              onAction={() => openEditor(activeSchedule.id)}
            />
          ) : (
            <>
              <Section
                title="To-Do"
                count={todo.length}
                emptyLabel="Everything's ticked. Nice."
                tasks={todo}
                completed={false}
                descriptions={descriptions}
                onToggle={toggleTask}
                onLongPress={() => openEditor(activeSchedule.id)}
              />

              {allDone && celebrationDismissed ? (
                <AppButton
                  label="Wrap up the day 🎉"
                  size="lg"
                  fullWidth
                  haptic="success"
                  onPress={() => dispatch({ type: 'showCelebration' })}
                />
              ) : null}

              <Section
                title="Completed!"
                count={done.length}
                emptyLabel="Nothing yet — tap a task above."
                tasks={done}
                completed
                descriptions={descriptions}
                onToggle={toggleTask}
                onLongPress={() => openEditor(activeSchedule.id)}
              />
            </>
          )}
        </ScrollView>

        <SwipeUpHandle onOpen={() => setNavOpen(true)} />
      </SafeAreaView>

      <View style={styles.fabSlot} pointerEvents="box-none">
        <Fab open={actionsOpen} onPress={() => setActionsOpen((open) => !open)} />
      </View>

      <BottomSheet visible={navOpen} onClose={() => setNavOpen(false)} title="Menu">
        <SheetAction
          icon="🗂"
          label="Other schedules"
          hint={`${schedules.length} saved`}
          onPress={() => {
            setNavOpen(false);
            router.push('/schedules');
          }}
        />
        <SheetAction
          icon="⚙️"
          label="Settings"
          hint="Profile, theme, notifications"
          onPress={() => {
            setNavOpen(false);
            router.push('/settings');
          }}
        />
      </BottomSheet>

      <BottomSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="Schedules">
        <SheetAction
          icon="✨"
          label="Create New Schedule"
          hint="Start a fresh checklist"
          onPress={() => openEditor('new')}
        />
        <SheetAction
          icon="📥"
          label="Load Schedule"
          hint="Import a .json file"
          onPress={() => void handleImport()}
        />
        <SheetAction
          icon="📤"
          label="Export Schedule as JSON"
          hint={activeSchedule ? `Share "${activeSchedule.name}"` : 'No active schedule'}
          onPress={() => void handleExport()}
        />
      </BottomSheet>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function DayMeta({
  scheduleName,
  emoji,
  timeLeft,
  done,
  total,
}: {
  scheduleName: string;
  emoji?: string;
  timeLeft: number;
  done: number;
  total: number;
}) {
  return (
    <GlassPanel radius={Radius.lg} glassStyle="clear" style={styles.dayMeta}>
      <View style={styles.dayMetaCopy}>
        <ThemedText variant="overline" themeColor="textMuted">
          Active schedule
        </ThemedText>
        <ThemedText variant="heading" numberOfLines={1}>
          {emoji ? `${emoji} ` : ''}
          {scheduleName}
        </ThemedText>
      </View>
      <View style={styles.dayMetaStats}>
        <ThemedText variant="number" themeColor="accent">
          {done}/{total}
        </ThemedText>
        <ThemedText variant="caption" themeColor={timeLeft > 0 ? 'textMuted' : 'danger'}>
          {formatTimeLeft(timeLeft)}
        </ThemedText>
      </View>
    </GlassPanel>
  );
}

function Section({
  title,
  count,
  emptyLabel,
  tasks,
  completed,
  descriptions,
  onToggle,
  onLongPress,
}: {
  title: string;
  count: number;
  emptyLabel: string;
  tasks: DayTask[];
  completed: boolean;
  descriptions: Map<string, string>;
  onToggle: (taskId: string) => void;
  onLongPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Animated.View layout={LinearTransition.springify().damping(22)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText variant="overline" themeColor="textSecondary">
          {title}
        </ThemedText>
        <View style={[styles.countChip, { backgroundColor: theme.surface }]}>
          <ThemedText variant="caption" themeColor="textMuted">
            {count}
          </ThemedText>
        </View>
      </View>

      {tasks.length === 0 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <ThemedText variant="label" themeColor="textMuted" style={styles.sectionEmpty}>
            {emptyLabel}
          </ThemedText>
        </Animated.View>
      ) : (
        tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            description={descriptions.get(task.id)}
            completed={completed}
            onToggle={onToggle}
            onLongPress={onLongPress}
          />
        ))
      )}
    </Animated.View>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.empty}>
      <ThemedText variant="display" style={styles.emptyGlyph}>
        🌱
      </ThemedText>
      <ThemedText variant="heading" style={styles.centered}>
        {title}
      </ThemedText>
      <ThemedText variant="body" themeColor="textSecondary" style={styles.centered}>
        {body}
      </ThemedText>
      <AppButton label={actionLabel} onPress={onAction} style={styles.emptyAction} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { textAlign: 'center' },

  headerArea: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six + Spacing.four,
    gap: Spacing.four,
  },

  dayMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three,
  },
  dayMetaCopy: {
    flex: 1,
    gap: 2,
  },
  dayMetaStats: {
    alignItems: 'flex-end',
    gap: 2,
  },

  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  countChip: {
    minWidth: 22,
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 1,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  sectionEmpty: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },

  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.six,
    paddingHorizontal: Spacing.three,
  },
  emptyGlyph: {
    fontSize: 56,
    lineHeight: 66,
  },
  emptyAction: {
    marginTop: Spacing.three,
  },

  fabSlot: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.six,
  },
});
