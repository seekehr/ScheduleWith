/**
 * Falling rain for the punishment screen. Same single-clock trick as the
 * confetti, wrapped to loop forever.
 */

import { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Accent } from '@/constants/theme';

type Drop = {
  x: number;
  length: number;
  thickness: number;
  offset: number;
  speed: number;
  opacity: number;
};

export type RainProps = {
  count?: number;
  color?: string;
  /** Milliseconds for one drop to cross the screen. */
  duration?: number;
};

export function Rain({ count = 70, color = Accent.rain, duration = 1100 }: RainProps) {
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0);

  const drops = useMemo<Drop[]>(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * width,
        length: 14 + Math.random() * 34,
        thickness: Math.random() < 0.3 ? 2 : 1,
        offset: Math.random(),
        speed: 0.7 + Math.random() * 0.8,
        opacity: 0.18 + Math.random() * 0.45,
      })),
    [count, width]
  );

  useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, { duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [clock, duration]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((drop, index) => (
        <RainDrop
          key={index}
          drop={drop}
          clock={clock}
          fallHeight={height}
          color={color}
        />
      ))}
    </View>
  );
}

function RainDrop({
  drop,
  clock,
  fallHeight,
  color,
}: {
  drop: Drop;
  clock: SharedValue<number>;
  fallHeight: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    // Wrapping with modulo keeps every drop in a continuous loop, offset so
    // they never fall in lockstep.
    const progress = (clock.value * drop.speed + drop.offset) % 1;
    return {
      transform: [
        { translateY: -drop.length + progress * (fallHeight + drop.length * 2) },
        // A slight slant reads as wind rather than a static grid.
        { translateX: progress * 18 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.drop,
        {
          left: drop.x,
          width: drop.thickness,
          height: drop.length,
          backgroundColor: color,
          opacity: drop.opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
    top: 0,
    borderRadius: 1,
  },
});
