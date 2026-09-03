/**
 * The happy / sad character for the day-end screens.
 *
 * Drawn entirely from views — no SVG dependency, no image assets — so it
 * scales, themes and animates without any extra machinery.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Accent, Forest, Springs } from '@/constants/theme';

export type FigureProps = {
  mood: 'happy' | 'sad';
  size?: number;
  /** Expanding rings behind a happy figure. Ignored when sad. */
  shockwaves?: number;
  /** Ring colours, cycled. */
  colors?: readonly string[];
};

export function Figure({ mood, size = 170, shockwaves = 0, colors }: FigureProps) {
  const happy = mood === 'happy';
  const bob = useSharedValue(0);
  const entrance = useSharedValue(0);

  useEffect(() => {
    // The celebration keeps its overshoot; the punishment screen should not
    // spring in cheerfully, and a bounce there read as a shake.
    entrance.value = withDelay(80, withSpring(1, happy ? Springs.bouncy : Springs.settle));
    bob.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: happy ? 700 : 2200,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: happy ? 700 : 2200,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
  }, [bob, entrance, happy]);

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { scale: 0.7 + entrance.value * 0.3 },
      // Happy bounces vertically; sad sways and slumps.
      { translateY: happy ? -12 * bob.value : 4 * bob.value },
      { rotate: happy ? `${(bob.value - 0.5) * 6}deg` : `${(bob.value - 0.5) * 3 + 4}deg` },
    ],
  }));

  const headSize = size * 0.72;
  const eyeSize = size * 0.075;

  return (
    <View style={[styles.root, { width: size * 1.9, height: size * 1.5 }]}>
      {happy
        ? Array.from({ length: shockwaves }, (_, index) => (
            <Shockwave
              key={index}
              index={index}
              size={size}
              color={colors?.[index % colors.length] ?? Forest[400]}
            />
          ))
        : null}

      <Animated.View style={[styles.body, bodyStyle]}>
        <View
          style={[
            styles.head,
            { width: headSize, height: headSize, borderRadius: headSize / 2 },
          ]}>
          <LinearGradient
            colors={happy ? [Forest[400], Forest[700]] : [Accent.storm, '#1A2029']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={[styles.eyeRow, { top: headSize * 0.34, gap: headSize * 0.22 }]}>
            <Eye size={eyeSize} sad={!happy} />
            <Eye size={eyeSize} sad={!happy} />
          </View>

          <Mouth width={headSize * 0.42} smiling={happy} bottom={headSize * 0.2} />

          {happy ? null : <Tear left={headSize * 0.28} top={headSize * 0.44} size={eyeSize} />}
        </View>
      </Animated.View>
    </View>
  );
}

function Eye({ size, sad }: { size: number; sad: boolean }) {
  // A sad eye is squashed and tilted, which reads as a downturned lid.
  return (
    <View
      style={{
        width: size,
        height: sad ? size * 0.6 : size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        transform: sad ? [{ rotate: '-12deg' }] : undefined,
      }}
    />
  );
}

/**
 * An arc built from a half-height box with one rounded, thick border — a
 * smile when the bottom border is used, a frown when it's the top.
 */
function Mouth({
  width,
  smiling,
  bottom,
}: {
  width: number;
  smiling: boolean;
  bottom: number;
}) {
  const height = width * 0.5;

  return (
    <View
      style={[
        styles.mouth,
        {
          bottom,
          width,
          height,
          borderColor: '#FFFFFF',
          ...(smiling
            ? {
                borderBottomWidth: 3.5,
                borderBottomLeftRadius: width,
                borderBottomRightRadius: width,
              }
            : {
                borderTopWidth: 3.5,
                borderTopLeftRadius: width,
                borderTopRightRadius: width,
              }),
        },
      ]}
    />
  );
}

/** A single tear that swells, slides down the cheek and repeats. */
function Tear({ left, top, size }: { left: number; top: number; size: number }) {
  const fall = useSharedValue(0);

  useEffect(() => {
    fall.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.in(Easing.quad) }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: 900 })
      ),
      -1,
      false
    );
  }, [fall]);

  const style = useAnimatedStyle(() => ({
    opacity: fall.value === 0 ? 0 : 1 - Math.max(0, fall.value - 0.7) / 0.3,
    transform: [{ translateY: fall.value * size * 5 }, { scaleY: 1 + fall.value * 0.6 }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left,
          top,
          width: size * 0.55,
          height: size * 0.75,
          borderRadius: size * 0.35,
          backgroundColor: Accent.sky,
        },
        style,
      ]}
    />
  );
}

function Shockwave({ index, size, color }: { index: number; size: number; color: string }) {
  const wave = useSharedValue(0);

  useEffect(() => {
    wave.value = withDelay(
      index * 260,
      withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false)
    );
  }, [wave, index]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - wave.value) * 0.5,
    transform: [{ scale: 0.55 + wave.value * 1.1 }],
  }));

  return (
    <Animated.View
      style={[
        styles.shockwave,
        {
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: size * 0.75,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeRow: {
    position: 'absolute',
    flexDirection: 'row',
  },
  mouth: {
    position: 'absolute',
  },
  shockwave: {
    position: 'absolute',
    borderWidth: 2,
  },
});
