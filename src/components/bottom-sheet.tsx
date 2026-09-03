/**
 * A pan-dismissable bottom sheet: the app's menu, the FAB's actions, and the
 * task editor all live in one.
 *
 * Rendered inline (not in a `Modal`) so gestures, the blur behind it and the
 * app's own theming all behave predictably.
 *
 * The drag-to-dismiss gesture is confined to the grabber at the top rather than
 * the whole panel, so the content below it stays free to scroll — which it
 * needs to be once the keyboard is up and the sheet has far less room.
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Keyboard, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { useKeyboard } from '@/hooks/use-keyboard';
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
  const keyboard = useKeyboard();

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

  /**
   * Tapping the backdrop dismisses the keyboard first and only closes the sheet
   * on a second tap. Without this, reaching for anywhere outside a multi-line
   * field — the only way to put that keyboard away — threw the whole form away
   * with it.
   */
  const handleBackdropPress = useCallback(() => {
    if (keyboard.visible) {
      Keyboard.dismiss();
      return;
    }
    onClose();
  }, [keyboard.visible, onClose]);

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

  // The sheet is pinned to the bottom of the screen, so it has to ride up with
  // the keyboard or the fields end up underneath it.
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withSpring(keyboard.height, Springs.sheet);
  }, [lift, keyboard.height]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - progress.value) * sheetHeight + drag.value - lift.value },
    ],
  }));

  // Whatever is left of the screen once the keyboard and the status bar have
  // taken their share. Without this the task editor runs off the top.
  const contentMaxHeight = Math.max(
    220,
    screenHeight - keyboard.height - insets.top - Spacing.six * 2
  );

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={keyboard.visible ? 'Dismiss keyboard' : 'Close'}
          onPress={handleBackdropPress}
          haptic="light"
          scaleTo={1}
          dimTo={1}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }]}
        />
      </Animated.View>

      <Animated.View
        style={[styles.sheetWrapper, sheetStyle]}
        onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}>
        <GlassPanel radius={Radius.xl} style={styles.sheet}>
          <GestureDetector gesture={pan}>
            <View style={styles.handle}>
              <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
              {title ? (
                <ThemedText variant="heading" style={styles.title}>
                  {title}
                </ThemedText>
              ) : null}
            </View>
          </GestureDetector>

          <ScrollView
            style={{ maxHeight: contentMaxHeight }}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: (keyboard.visible ? Spacing.three : insets.bottom) + Spacing.four },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}>
            {children}
          </ScrollView>
        </GlassPanel>
      </Animated.View>
    </View>
  );
}

/** A tappable row inside a sheet. */
export function SheetAction({
  label,
  hint,
  onPress,
  destructive,
}: {
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
  },
  handle: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
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
    paddingTop: Spacing.one,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    minHeight: 60,
  },
  actionCopy: {
    flex: 1,
    gap: 1,
  },
});
