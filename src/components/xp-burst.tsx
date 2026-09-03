/**
 * The little "+20 XP" that floats up and fades whenever a task is ticked.
 * Self-removing: it unmounts itself once the animation finishes.
 */

import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ThemedText } from '@/components/themed-text';
import { Springs } from '@/constants/theme';

export type XpBurstProps = {
  amount: number;
  color: string;
  /** Fired once the burst has finished and removed itself. */
  onDone?: () => void;
};

export function XpBurst({ amount, color, onDone }: XpBurstProps) {
  const [visible, setVisible] = useState(true);
  const rise = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    pop.value = withSequence(
      withSpring(1, Springs.tick),
      withDelay(320, withTiming(0, { duration: 260 }))
    );
    rise.value = withTiming(
      1,
      { duration: 900, easing: Easing.out(Easing.cubic) },
      (finished) => {
        'worklet';
        if (finished) scheduleOnRN(setVisible, false);
      }
    );
  }, [rise, pop]);

  useEffect(() => {
    if (!visible) onDone?.();
  }, [visible, onDone]);

  const style = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [
      { translateY: -34 * rise.value },
      { scale: 0.7 + pop.value * 0.45 },
    ],
  }));

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.root, style]}>
      <ThemedText variant="number" color={color}>
        +{amount}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: 8,
    top: 6,
  },
});
