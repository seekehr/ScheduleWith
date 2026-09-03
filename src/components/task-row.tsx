/**
 * A single checklist row. Ticking one is the app's core interaction, so the
 * checkbox draws itself in, the row springs, the phone taps back and the XP
 * floats off — all on the UI thread.
 */

import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale, triggerHaptic } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { XpBurst } from '@/components/xp-burst';
import { Duration, Radius, Spacing, Springs } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DayTask } from '@/store/types';

export type TaskRowProps = {
  task: DayTask;
  description?: string;
  completed: boolean;
  onToggle: (taskId: string) => void;
  onLongPress?: (taskId: string) => void;
};

export function TaskRow({ task, description, completed, onToggle, onLongPress }: TaskRowProps) {
  const theme = useTheme();
  const [burstId, setBurstId] = useState(0);

  const handlePress = useCallback(() => {
    // Completing is the celebratory direction; un-ticking gets a plainer tap.
    triggerHaptic(completed ? 'selection' : 'success');
    if (!completed) setBurstId((id) => id + 1);
    onToggle(task.id);
  }, [completed, onToggle, task.id]);

  return (
    <Animated.View layout={LinearTransition.springify().damping(20)} entering={FadeIn.duration(220)}>
      <PressableScale
        onPress={handlePress}
        onLongPress={onLongPress ? () => onLongPress(task.id) : undefined}
        haptic="none"
        scaleTo={0.975}
        dimTo={1}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${task.title}, ${task.xp} XP`}
        style={[
          styles.row,
          {
            backgroundColor: completed ? theme.accentSoft : theme.surface,
            borderColor: completed ? 'transparent' : theme.border,
          },
        ]}>
        <Checkbox checked={completed} />

        <View style={styles.copy}>
          <ThemedText
            variant="bodyBold"
            themeColor={completed ? 'textSecondary' : 'text'}
            numberOfLines={2}
            style={completed ? styles.struck : undefined}>
            {task.title}
          </ThemedText>
          {description ? (
            <ThemedText variant="caption" themeColor="textMuted" numberOfLines={2}>
              {description}
            </ThemedText>
          ) : null}
        </View>

        <View
          style={[
            styles.xpChip,
            { backgroundColor: completed ? 'transparent' : theme.surfaceRaised },
          ]}>
          <ThemedText variant="caption" themeColor={completed ? 'textMuted' : 'textSecondary'}>
            +{task.xp}
          </ThemedText>
        </View>

        {burstId > 0 ? (
          <XpBurst key={burstId} amount={task.xp} color={theme.accent} />
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

/** Two bars that sweep in from their inner ends, so the tick looks drawn. */
function Checkbox({ checked }: { checked: boolean }) {
  const theme = useTheme();
  const progress = useSharedValue(checked ? 1 : 0);
  const shortArm = useSharedValue(checked ? 1 : 0);
  const longArm = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    if (checked) {
      progress.value = withSpring(1, Springs.tick);
      shortArm.value = withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) });
      longArm.value = withDelay(
        70,
        withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) })
      );
    } else {
      progress.value = withSpring(0, Springs.press);
      shortArm.value = withTiming(0, { duration: Duration.fast });
      longArm.value = withTiming(0, { duration: Duration.fast });
    }
  }, [checked, progress, shortArm, longArm]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: progress.value > 0.5 ? theme.accent : 'transparent',
    borderColor: progress.value > 0.5 ? theme.accent : theme.borderStrong,
    transform: [{ scale: 0.9 + progress.value * 0.1 }],
  }));

  // The rotation lives here rather than in the static style: an animated
  // `transform` replaces the static one wholesale, so both parts must be listed
  // together. Order matters — scale along the bar's own axis, then rotate.
  const shortStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '45deg' }, { scaleX: shortArm.value }],
  }));
  const longStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '-50deg' }, { scaleX: longArm.value }],
  }));

  return (
    <Animated.View style={[styles.checkbox, boxStyle]}>
      <Animated.View
        style={[styles.arm, styles.armShort, { backgroundColor: theme.onAccent }, shortStyle]}
      />
      <Animated.View
        style={[styles.arm, styles.armLong, { backgroundColor: theme.onAccent }, longStyle]}
      />
    </Animated.View>
  );
}

const BOX = 28;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  checkbox: {
    width: BOX,
    height: BOX,
    borderRadius: BOX / 3,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arm: {
    position: 'absolute',
    height: 2.5,
    borderRadius: 2,
  },
  // Geometry for a 24x24 content box: the tick runs (4,13) -> (9,18) -> (19,6).
  // `left`/`top` place each bar's left end; `transformOrigin` anchors the sweep.
  armShort: {
    width: 7,
    left: 4,
    top: 11.75,
    transformOrigin: 'left center',
  },
  armLong: {
    width: 15.5,
    left: 9,
    top: 16.75,
    transformOrigin: 'left center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  xpChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
});
