/**
 * Confetti burst for the celebration screen.
 *
 * One `withTiming` clock drives every piece; each piece derives its own
 * position from that single shared value. A hundred-plus independent
 * animations would be wasteful — a hundred derived styles off one clock is not.
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

type Piece = {
  startX: number;
  width: number;
  height: number;
  color: string;
  /** Fraction of the cycle before this piece starts falling. */
  delay: number;
  speed: number;
  swayAmplitude: number;
  swayFrequency: number;
  spin: number;
  round: boolean;
};

export type ConfettiProps = {
  count: number;
  colors: readonly string[];
  /** Milliseconds for one full top-to-bottom pass. */
  duration?: number;
  /** Keeps raining instead of falling once. */
  loop?: boolean;
};

export function Confetti({ count, colors, duration = 3400, loop = true }: ConfettiProps) {
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, index) => ({
        startX: Math.random() * width,
        width: 6 + Math.random() * 7,
        height: 9 + Math.random() * 10,
        color: colors[index % colors.length],
        delay: Math.random() * 0.35,
        speed: 0.75 + Math.random() * 0.5,
        swayAmplitude: 14 + Math.random() * 40,
        swayFrequency: 1 + Math.random() * 2.5,
        spin: 1 + Math.random() * 3,
        round: Math.random() < 0.25,
      })),
    [count, colors, width]
  );

  useEffect(() => {
    clock.value = 0;
    const animation = withTiming(1, { duration, easing: Easing.linear });
    clock.value = loop ? withRepeat(animation, -1, false) : animation;
  }, [clock, duration, loop]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} clock={clock} fallHeight={height} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  piece,
  clock,
  fallHeight,
}: {
  piece: Piece;
  clock: SharedValue<number>;
  fallHeight: number;
}) {
  const style = useAnimatedStyle(() => {
    const raw = (clock.value - piece.delay) / Math.max(0.01, 1 - piece.delay);
    const progress = Math.min(1, Math.max(0, raw * piece.speed));

    return {
      opacity: progress <= 0 ? 0 : progress > 0.86 ? (1 - progress) / 0.14 : 1,
      transform: [
        { translateY: -60 + progress * (fallHeight + 120) },
        {
          translateX:
            Math.sin(progress * piece.swayFrequency * Math.PI * 2) * piece.swayAmplitude,
        },
        { rotate: `${progress * piece.spin * 360}deg` },
        { scaleX: Math.cos(progress * piece.spin * Math.PI * 3) },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: piece.startX,
          width: piece.width,
          height: piece.round ? piece.width : piece.height,
          borderRadius: piece.round ? piece.width / 2 : 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    top: 0,
  },
});
