import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { TaskEditorSheet } from '@/components/task-editor-sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useDispatch } from '@/store/app-store';
import { makeSchedule } from '@/store/reducer';
import { exportSchedule } from '@/store/transfer';
import type { Schedule, Task } from '@/store/types';

const DEFAULT_NAME = 'New Schedule';

export default function ScheduleEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const dispatch = useDispatch();
  const state = useAppState();

  const isNew = id === 'new';
  const [createdId, setCreatedId] = useState<string | null>(null);

  // A brand-new schedule is created up front so there is exactly one editing
  // path. If it's abandoned untouched, the cleanup below removes it again.
  useEffect(() => {
    if (!isNew || createdId) return;
    const schedule = makeSchedule(DEFAULT_NAME);
    dispatch({ type: 'addSchedule', schedule, makeActive: state.schedules.length === 0 });
    setCreatedId(schedule.id);
  }, [isNew, createdId, dispatch, state.schedules.length]);

  const scheduleId = isNew ? createdId : id;
  const schedule = useMemo(
    () => state.schedules.find((entry) => entry.id === scheduleId) ?? null,
    [state.schedules, scheduleId]
  );

  const scheduleRef = useRef<Schedule | null>(schedule);
  scheduleRef.current = schedule;

  useEffect(() => {
    if (!isNew) return;
    return () => {
      // Backing out of a never-edited draft shouldn't leave clutter behind.
      const draft = scheduleRef.current;
      if (draft && draft.name === DEFAULT_NAME && draft.tasks.length === 0) {
        dispatch({ type: 'deleteSchedule', id: draft.id });
      }
    };
  }, [isNew, dispatch]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const setTasks = useCallback(
    (tasks: Task[]) => {
      if (!schedule) return;
      dispatch({ type: 'setScheduleTasks', id: schedule.id, tasks });
    },
    [dispatch, schedule]
  );

  const saveTask = useCallback(
    (task: Task) => {
      if (!schedule) return;
      const exists = schedule.tasks.some((entry) => entry.id === task.id);
      setTasks(
        exists
          ? schedule.tasks.map((entry) => (entry.id === task.id ? task : entry))
          : [...schedule.tasks, task]
      );
      setEditorOpen(false);
      setEditingTask(null);
    },
    [schedule, setTasks]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      if (!schedule) return;
      setTasks(schedule.tasks.filter((entry) => entry.id !== taskId));
      setEditorOpen(false);
      setEditingTask(null);
    },
    [schedule, setTasks]
  );

  const moveTask = useCallback(
    (index: number, direction: -1 | 1) => {
      if (!schedule) return;
      const target = index + direction;
      if (target < 0 || target >= schedule.tasks.length) return;
      const tasks = [...schedule.tasks];
      [tasks[index], tasks[target]] = [tasks[target], tasks[index]];
      setTasks(tasks);
    },
    [schedule, setTasks]
  );

  const confirmDeleteSchedule = useCallback(() => {
    if (!schedule) return;
    Alert.alert(
      `Delete "${schedule.name}"?`,
      'The schedule is removed. Days you already completed stay in your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch({ type: 'deleteSchedule', id: schedule.id });
            router.back();
          },
        },
      ]
    );
  }, [schedule, dispatch, router]);

  if (!schedule) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Schedule" />
        <View style={styles.missing}>
          <ThemedText variant="body" themeColor="textSecondary">
            That schedule no longer exists.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const totalXp = schedule.tasks.reduce((sum, task) => sum + task.xp, 0);
  const isActive = state.activeScheduleId === schedule.id;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.root} edges={['top']}>
          <ScreenHeader
            title={isNew ? 'New schedule' : 'Edit schedule'}
            subtitle={`${schedule.tasks.length} ${
              schedule.tasks.length === 1 ? 'task' : 'tasks'
            } · ${totalXp} XP a day`}
            trailing={
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Done"
                onPress={() => router.back()}
                haptic="light"
                style={styles.done}>
                <ThemedText variant="label" themeColor="accent">
                  Done
                </ThemedText>
              </PressableScale>
            }
          />

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.identityRow}>
              <TextInput
                value={schedule.name}
                onChangeText={(value) =>
                  dispatch({ type: 'renameSchedule', id: schedule.id, name: value })
                }
                placeholder="Schedule name"
                placeholderTextColor={theme.textMuted}
                maxLength={60}
                selectTextOnFocus={isNew}
                style={[
                  styles.nameInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              />
            </View>

            <View style={styles.tasks}>
              <ThemedText variant="overline" themeColor="textSecondary" style={styles.sectionLabel}>
                Tasks
              </ThemedText>

              {schedule.tasks.length === 0 ? (
                <ThemedText variant="body" themeColor="textMuted" style={styles.emptyTasks}>
                  No tasks yet. Add the first thing you want to do every day.
                </ThemedText>
              ) : (
                schedule.tasks.map((task, index) => (
                  <Animated.View
                    key={task.id}
                    layout={LinearTransition.springify().damping(20)}
                    entering={FadeIn.duration(200)}>
                    <EditableTaskRow
                      task={task}
                      isFirst={index === 0}
                      isLast={index === schedule.tasks.length - 1}
                      onEdit={() => {
                        setEditingTask(task);
                        setEditorOpen(true);
                      }}
                      onMove={(direction) => moveTask(index, direction)}
                    />
                  </Animated.View>
                ))
              )}

              <AppButton
                label="Add task"
                  variant="secondary"
                fullWidth
                onPress={() => {
                  setEditingTask(null);
                  setEditorOpen(true);
                }}
              />
            </View>

            <View style={styles.footerActions}>
              {isActive ? (
                <ThemedText variant="caption" themeColor="accent" style={styles.activeNote}>
                  This is your active schedule.
                </ThemedText>
              ) : (
                <AppButton
                  label="Make this active"
                  variant="secondary"
                  fullWidth
                  onPress={() => dispatch({ type: 'setActiveSchedule', id: schedule.id })}
                />
              )}
              <AppButton
                label="Export as JSON"
                variant="secondary"
                fullWidth
                onPress={() => void exportSchedule(schedule)}
              />
              <PressableScale
                onPress={confirmDeleteSchedule}
                haptic="heavy"
                style={styles.deleteSchedule}>
                <ThemedText variant="label" themeColor="danger">
                  Delete schedule
                </ThemedText>
              </PressableScale>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <TaskEditorSheet
        visible={editorOpen}
        task={editingTask}
        onClose={() => {
          setEditorOpen(false);
          setEditingTask(null);
        }}
        onSave={saveTask}
        onDelete={deleteTask}
      />
    </View>
  );
}

function EditableTaskRow({
  task,
  isFirst,
  isLast,
  onEdit,
  onMove,
}: {
  task: Task;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.taskRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <PressableScale onPress={onEdit} haptic="light" style={styles.taskCopy} scaleTo={0.99}>
        <ThemedText variant="bodyBold" numberOfLines={2}>
          {task.title}
        </ThemedText>
        {task.description ? (
          <ThemedText variant="caption" themeColor="textMuted" numberOfLines={2}>
            {task.description}
          </ThemedText>
        ) : null}
      </PressableScale>

      <View style={[styles.taskXp, { backgroundColor: theme.accentSoft }]}>
        <ThemedText variant="caption" themeColor="accent">
          +{task.xp}
        </ThemedText>
      </View>

      <View style={styles.reorder}>
        <ReorderButton label="▲" disabled={isFirst} onPress={() => onMove(-1)} />
        <ReorderButton label="▼" disabled={isLast} onPress={() => onMove(1)} />
      </View>
    </View>
  );
}

function ReorderButton({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label === '▲' ? 'Move up' : 'Move down'}
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      style={styles.reorderButton}>
      <ThemedText variant="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  done: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },

  identityRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - 2,
    fontSize: 18,
    fontWeight: '700',
  },

  tasks: {
    gap: Spacing.two,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.one,
  },
  emptyTasks: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  taskCopy: {
    flex: 1,
    gap: 2,
  },
  taskXp: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  reorder: {
    gap: 2,
  },
  reorderButton: {
    width: 30,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerActions: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  activeNote: {
    textAlign: 'center',
    paddingVertical: Spacing.two,
  },
  deleteSchedule: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
