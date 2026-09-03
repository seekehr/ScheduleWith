/**
 * A brief, non-blocking banner when the user crosses into a new level.
 * Purely celebratory — it never intercepts touches and clears itself.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Confetti } from '@/components/confetti';
import { triggerHaptic } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Forest, Radius, Spacing, Springs } from '@/constants/theme';
import { useLevel, useStreakTier } from '@/store/app-store';

const VISIBLE_MS = 2200;

export function LevelUpOverlay() {
  const { level } = useLevel();
  const tier = useStreakTier();
  const insets = useSafeAreaInsets();

  const previousLevel = useRef(level);
  const [celebrating, setCelebrating] = useState<number | null>(null);

  useEffect(() => {
    // Only a genuine increase counts — un-ticking a task can lower the level,
    // and hydration sets the initial value without any transition at all.
    if (level > previousLevel.current) {
      setCelebrating(level);
      triggerHaptic('success');
    }
    previousLevel.current = level;
  }, [level]);

  if (celebrating === null) return null;

  return (
    <LevelUpBanner
      key={celebrating}
      level={celebrating}
      colors={tier.colors}
      top={insets.top + Spacing.two}
      onDone={() => setCelebrating(null)}
    />
  );
}

function LevelUpBanner({
  level,
  colors,
  top,
  onDone,
}: {
  level: number;
  colors: readonly string[];
  top: number;
  onDone: () => void;
}) {
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withSequence(
      withSpring(1, Springs.bouncy),
      withDelay(
        VISIBLE_MS,
        withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(onDone);
        })
      )
    );
  }, [enter, onDone]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * -40 },
      { scale: 0.85 + enter.value * 0.15 },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Confetti count={44} colors={colors} duration={2600} loop={false} />

      <Animated.View
        exiting={FadeOut.duration(200)}
        style={[styles.banner, { top }, style]}>
        <LinearGradient
          colors={[Forest[500], Forest[800]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <ThemedText variant="overline" color="#D8F3DC">
          Level up
        </ThemedText>
        <ThemedText variant="title" color="#FFFFFF">
          Level {level}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: Forest[900],
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
});
