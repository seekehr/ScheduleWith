/**
 * The grabber pinned to the bottom of the main screen. Swipe up on it (or just
 * tap it) to reveal the navbar sheet.
 */

import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, Springs } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Pull up this far (or flick faster) and the navbar opens. */
const OPEN_DISTANCE = 44;
const OPEN_VELOCITY = -600;

export function SwipeUpHandle({ onOpen }: { onOpen: () => void }) {
  const theme = useTheme();
  const lift = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onChange((event) => {
      // Only upward movement counts; downward drag does nothing.
      lift.value = Math.min(70, Math.max(0, lift.value - event.changeY));
    })
    .onEnd((event) => {
      if (lift.value > OPEN_DISTANCE || event.velocityY < OPEN_VELOCITY) {
        runOnJS(onOpen)();
      }
      lift.value = withSpring(0, Springs.sheet);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onOpen)();
  });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.value }],
    opacity: 0.75 + Math.min(1, lift.value / OPEN_DISTANCE) * 0.25,
  }));

  return (
    <GestureDetector gesture={Gesture.Race(gesture, tap)}>
      <Animated.View
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        accessibilityHint="Shows other schedules and settings"
        style={[styles.root, style]}>
        <View style={[styles.bar, { backgroundColor: theme.borderStrong }]} />
        <ThemedText variant="caption" themeColor="textMuted">
          Swipe up for menu
        </ThemedText>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  bar: {
    width: 52,
    height: 5,
    borderRadius: Radius.pill,
  },
});
