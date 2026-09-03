/**
 * The streak badge: the day count sitting in a pulsing, tier-coloured aura,
 * with orbiting embers once the streak is long enough to have earned them.
 *
 * The tier is communicated by colour, pulse rate and orbit rather than by an
 * icon — the number is the only glyph on it.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { StreakTier } from '@/store/leveling';

export type StreakFlameProps = {
  streak: number;
  tier: StreakTier;
  size?: number;
};

export function StreakFlame({ streak, tier, size = 40 }: StreakFlameProps) {
  const theme = useTheme();
  const pulse = useSharedValue(0);
  const spin = useSharedValue(0);

  // Higher tiers breathe faster and swing wider.
  const period = 1800 - tier.rank * 180;
  const lit = tier.rank > 0;

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: period, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [pulse, period]);

  useEffect(() => {
    if (!tier.orbit) {
      spin.value = 0;
      return;
    }
    spin.value = withRepeat(
      withTiming(1, { duration: 4200 - tier.rank * 400, easing: Easing.linear }),
      -1,
      false
    );
  }, [spin, tier.orbit, tier.rank]);

  const intensity = 0.18 + tier.rank * 0.12;

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * (0.1 + tier.rank * 0.035) }],
    opacity: intensity * (0.6 + pulse.value * 0.4),
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.05 }],
  }));

  return (
    <View
      style={[styles.root, { width: size * 1.6, height: size * 1.6 }]}
      accessibilityRole="text"
      accessibilityLabel={
        streak === 0 ? 'No streak yet' : `${streak} day streak, ${tier.label} tier`
      }>
      {lit ? (
        <Animated.View
          style={[
            styles.aura,
            { width: size * 1.6, height: size * 1.6, borderRadius: size * 0.8 },
            auraStyle,
          ]}>
          <LinearGradient
            colors={tier.colors}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      {tier.orbit
        ? [0, 1, 2].map((index) => (
            <Ember
              key={index}
              spin={spin}
              index={index}
              radius={size * 0.78}
              color={tier.colors[index % tier.colors.length]}
            />
          ))
        : null}

      <Animated.View
        style={[
          styles.core,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: lit ? 'transparent' : theme.surface,
            borderColor: lit ? 'transparent' : theme.border,
          },
          coreStyle,
        ]}>
        {lit ? (
          <LinearGradient
            colors={tier.colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: size / 2 }]}
          />
        ) : null}
        <ThemedText
          variant="number"
          color={lit ? '#FFFFFF' : theme.textMuted}
          style={{ fontSize: size * 0.42, lineHeight: size * 0.52 }}>
          {streak}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

function Ember({
  spin,
  index,
  radius,
  color,
}: {
  spin: SharedValue<number>;
  index: number;
  radius: number;
  color: string;
}) {
  const offset = index / 3;
  const angle = useDerivedValue(() => (spin.value + offset) * Math.PI * 2);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.cos(angle.value) * radius },
      { translateY: Math.sin(angle.value) * radius * 0.62 },
    ],
  }));

  return <Animated.View style={[styles.ember, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    overflow: 'hidden',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  ember: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
