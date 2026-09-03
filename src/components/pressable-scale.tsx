/**
 * A Pressable that springs inward when touched. Used everywhere a tap should
 * feel physical rather than flat.
 */

import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Duration, Springs } from '@/constants/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'none';

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while held. */
  scaleTo?: number;
  /** Opacity while held. */
  dimTo?: number;
  haptic?: HapticStyle;
};

export function triggerHaptic(kind: HapticStyle) {
  if (kind === 'none') return;
  try {
    switch (kind) {
      case 'selection':
        void Haptics.selectionAsync();
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'light':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  } catch {
    // Haptics are pure garnish — never let them break an interaction.
  }
}

export function PressableScale({
  style,
  scaleTo = 0.96,
  dimTo = 0.9,
  haptic = 'light',
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * (1 - scaleTo) }],
    opacity: 1 - pressed.value * (1 - dimTo),
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      pressed.value = withTiming(1, { duration: Duration.fast });
      triggerHaptic(haptic);
      onPressIn?.(event);
    },
    [pressed, haptic, onPressIn]
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      pressed.value = withSpring(0, Springs.press);
      onPressOut?.(event);
    },
    [pressed, onPressOut]
  );

  return (
    <AnimatedPressable
      style={[style, animatedStyle, disabled ? { opacity: 0.45 } : null]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...rest}
    />
  );
}
