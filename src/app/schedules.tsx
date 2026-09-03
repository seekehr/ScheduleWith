import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppState, useDispatch } from '@/store/app-store';
import { exportSchedule, importSchedule } from '@/store/transfer';
import type { Schedule } from '@/store/types';

export default function SchedulesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const dispatch = useDispatch();
  const { schedules, activeScheduleId } = useAppState();

  const handleImport = useCallback(async () => {
    const imported = await importSchedule(schedules.map((schedule) => schedule.name));
    if (imported) dispatch({ type: 'addSchedule', schedule: imported });
  }, [schedules, dispatch]);

  const confirmDelete = useCallback(
    (schedule: Schedule) => {
      Alert.alert(
        `Delete "${schedule.name}"?`,
        'The schedule is removed. Days you already completed stay in your history.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => dispatch({ type: 'deleteSchedule', id: schedule.id }),
          },
        ]
      );
    },
    [dispatch]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScreenHeader
          title="Your schedules"
          subtitle={`${schedules.length} saved · one active at a time`}
        />

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          {schedules.length === 0 ? (
            <ThemedText variant="body" themeColor="textMuted" style={styles.empty}>
              Nothing saved yet. Create one, or load a `.json` you exported before.
            </ThemedText>
          ) : (
            schedules.map((schedule, index) => (
              <Animated.View
                key={schedule.id}
                layout={LinearTransition.springify().damping(20)}
                entering={FadeIn.duration(220)}>
                <ScheduleCard
                  schedule={schedule}
                  isActive={schedule.id === activeScheduleId}
                  isFirst={index === 0}
                  isLast={index === schedules.length - 1}
                  onActivate={() => dispatch({ type: 'setActiveSchedule', id: schedule.id })}
                  onEdit={() => router.push({ pathname: '/schedule/[id]', params: { id: schedule.id } })}
                  onExport={() => void exportSchedule(schedule)}
                  onDelete={() => confirmDelete(schedule)}
                  onMove={(direction) =>
                    dispatch({ type: 'moveSchedule', id: schedule.id, direction })
                  }
                />
              </Animated.View>
            ))
          )}

          <View style={styles.actions}>
            <AppButton
              label="Create New Schedule"
              icon="✨"
              fullWidth
              onPress={() => router.push({ pathname: '/schedule/[id]', params: { id: 'new' } })}
            />
            <AppButton
              label="Load Schedule"
              icon="📥"
              variant="secondary"
              fullWidth
              onPress={() => void handleImport()}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ScheduleCard({
  schedule,
  isActive,
  isFirst,
  isLast,
  onActivate,
  onEdit,
  onExport,
  onDelete,
  onMove,
}: {
  schedule: Schedule;
  isActive: boolean;
  isFirst: boolean;
  isLast: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const theme = useTheme();
  const totalXp = schedule.tasks.reduce((sum, task) => sum + task.xp, 0);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isActive ? theme.accent : theme.border,
          borderWidth: isActive ? 2 : 1,
        },
      ]}>
      <View style={styles.cardTop}>
        <PressableScale onPress={onEdit} haptic="light" scaleTo={0.99} style={styles.cardCopy}>
          <View style={styles.cardTitleRow}>
            <ThemedText variant="heading" numberOfLines={1} style={styles.cardTitle}>
              {schedule.emoji ? `${schedule.emoji} ` : ''}
              {schedule.name}
            </ThemedText>
            {isActive ? (
              <View style={[styles.activeChip, { backgroundColor: theme.accent }]}>
                <ThemedText variant="caption" color={theme.onAccent}>
                  ACTIVE
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText variant="caption" themeColor="textMuted">
            {schedule.tasks.length} {schedule.tasks.length === 1 ? 'task' : 'tasks'} · {totalXp} XP
            a day
          </ThemedText>
        </PressableScale>

        <View style={styles.reorder}>
          <PressableScale
            accessibilityLabel="Move up"
            onPress={() => onMove(-1)}
            disabled={isFirst}
            haptic="selection"
            style={styles.reorderButton}>
            <ThemedText variant="caption" themeColor="textSecondary">
              ▲
            </ThemedText>
          </PressableScale>
          <PressableScale
            accessibilityLabel="Move down"
            onPress={() => onMove(1)}
            disabled={isLast}
            haptic="selection"
            style={styles.reorderButton}>
            <ThemedText variant="caption" themeColor="textSecondary">
              ▼
            </ThemedText>
          </PressableScale>
        </View>
      </View>

      <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
        <CardAction label={isActive ? 'Active' : 'Make active'} disabled={isActive} onPress={onActivate} />
        <CardAction label="Edit" onPress={onEdit} />
        <CardAction label="Export" onPress={onExport} />
        <CardAction label="Delete" destructive onPress={onDelete} />
      </View>
    </View>
  );
}

function CardAction({
  label,
  onPress,
  disabled,
  destructive,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      haptic={destructive ? 'heavy' : 'light'}
      style={styles.cardAction}>
      <ThemedText variant="label" themeColor={destructive ? 'danger' : 'textSecondary'}>
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
    gap: Spacing.three,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  cardCopy: {
    flex: 1,
    gap: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardTitle: {
    flexShrink: 1,
  },
  activeChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  reorder: {
    gap: 2,
  },
  reorderButton: {
    width: 32,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.three - 4,
  },
  actions: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
});
