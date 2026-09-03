/**
 * The big green + in the bottom-right corner. Its two bars rotate into an ×
 * while its menu is open.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/pressable-scale';
import { Forest, Springs } from '@/constants/theme';

export type FabProps = {
  open: boolean;
  onPress: () => void;
};

export function Fab({ open, onPress }: FabProps) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = withSpring(open ? 1 : 0, Springs.press);
  }, [spin, open]);

  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 135}deg` }],
  }));

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={open ? 'Close menu' : 'Schedule actions'}
      onPress={onPress}
      haptic="medium"
      scaleTo={0.9}
      dimTo={1}
      style={styles.button}>
      <Animated.View style={[styles.glyph, rootStyle]}>
        <View style={styles.barHorizontal} />
        <View style={styles.barVertical} />
      </Animated.View>
    </PressableScale>
  );
}

const SIZE = 62;
const BAR = 3;
const BAR_LENGTH = 24;

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Forest[700],
    alignItems: 'center',
    justifyContent: 'center',
    // A grounded shadow keeps it legible over both light and dark content.
    shadowColor: Forest[900],
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  glyph: {
    width: BAR_LENGTH,
    height: BAR_LENGTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barHorizontal: {
    position: 'absolute',
    width: BAR_LENGTH,
    height: BAR,
    borderRadius: BAR,
    backgroundColor: '#FFFFFF',
  },
  barVertical: {
    position: 'absolute',
    width: BAR,
    height: BAR_LENGTH,
    borderRadius: BAR,
    backgroundColor: '#FFFFFF',
  },
});
