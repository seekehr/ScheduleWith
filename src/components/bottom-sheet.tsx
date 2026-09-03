/**
 * A pan-dismissable bottom sheet, used for both the swipe-up navbar and the
 * FAB's action menu.
 *
 * Rendered inline (not in a `Modal`) so gestures, the blur behind it and the
 * app's own theming all behave predictably.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassPanel } from '@/components/glass-panel';
import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Duration, Radius, Spacing, Springs } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Drag further than this (or flick faster) and the sheet closes. */
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 800;

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Kept mounted for the duration of the exit animation.
  const [mounted, setMounted] = useState(visible);
  const [sheetHeight, setSheetHeight] = useState(screenHeight * 0.4);

  const progress = useSharedValue(0);
  const drag = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = withSpring(1, Springs.sheet);
    } else {
      progress.value = withTiming(0, { duration: Duration.base }, (finished) => {
        'worklet';
        if (finished) runOnJS(setMounted)(false);
      });
    }
  }, [visible, progress, drag]);

  const close = useCallback(() => onClose(), [onClose]);

  const pan = Gesture.Pan()
    .onChange((event) => {
      drag.value = Math.max(0, drag.value + event.changeY);
    })
    .onEnd((event) => {
      if (drag.value > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
        runOnJS(close)();
      } else {
        drag.value = withSpring(0, Springs.sheet);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * interpolate(drag.value, [0, sheetHeight], [1, 0.2], 'clamp'),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * sheetHeight + drag.value }],
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          haptic="light"
          scaleTo={1}
          dimTo={1}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
        />
      </Animated.View>

      <Animated.View
        style={[styles.sheetWrapper, sheetStyle]}
        onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}>
        <GestureDetector gesture={pan}>
          <GlassPanel
            radius={Radius.xl}
            style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.four }]}>
            <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
            {title ? (
              <ThemedText variant="heading" style={styles.title}>
                {title}
              </ThemedText>
            ) : null}
            {children}
          </GlassPanel>
        </GestureDetector>
      </Animated.View>
    </View>
  );
}

/** A tappable row inside a sheet. */
export function SheetAction({
  icon,
  label,
  hint,
  onPress,
  destructive,
}: {
  icon: string;
  label: string;
  hint?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptic="medium"
      style={[styles.action, { backgroundColor: theme.surface }]}>
      <View style={[styles.actionIcon, { backgroundColor: theme.surfaceRaised }]}>
        <ThemedText variant="heading">{icon}</ThemedText>
      </View>
      <View style={styles.actionCopy}>
        <ThemedText variant="bodyBold" themeColor={destructive ? 'danger' : 'text'}>
          {label}
        </ThemedText>
        {hint ? (
          <ThemedText variant="caption" themeColor="textMuted">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText variant="heading" themeColor="textMuted">
        ›
      </ThemedText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sheetWrapper: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: 0,
  },
  sheet: {
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  grabber: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: Radius.pill,
    marginBottom: Spacing.two,
  },
  title: {
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.two,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + 2,
    borderRadius: Radius.md,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: 1,
  },
});
