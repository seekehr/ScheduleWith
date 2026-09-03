/**
 * Liquid Glass surface with a graceful fallback.
 *
 * On iOS 26 this is a real `GlassView`. Everywhere else — and on the iOS 26
 * betas whose glass API is missing, which the Expo docs warn can crash — it
 * degrades to a blurred, hairline-bordered panel that reads the same way.
 */

import { BlurView } from 'expo-blur';
import {
  GlassContainer,
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';

/**
 * Resolved once at module load: both checks are cheap native reads, and the
 * answer cannot change during a session.
 */
export const LIQUID_GLASS_SUPPORTED = (() => {
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
})();

export type GlassPanelProps = ViewProps & {
  /** `regular` is frosted and readable; `clear` is barely-there. */
  glassStyle?: 'regular' | 'clear';
  radius?: number;
  /** Tints the glass; also tints the fallback's blur overlay. */
  tint?: string;
  /** Enables the interactive highlight on real Liquid Glass. */
  interactive?: boolean;
  /** Blur strength used only by the fallback. */
  fallbackIntensity?: number;
};

export function GlassPanel({
  glassStyle = 'regular',
  radius = Radius.lg,
  tint,
  interactive = false,
  fallbackIntensity = 28,
  style,
  children,
  ...rest
}: GlassPanelProps) {
  const theme = useTheme();
  const isDark = useIsDark();
  const shape: ViewStyle = { borderRadius: radius, overflow: 'hidden' };

  if (LIQUID_GLASS_SUPPORTED) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        tintColor={tint}
        isInteractive={interactive}
        colorScheme={isDark ? 'dark' : 'light'}
        style={[shape, style]}
        {...rest}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[shape, styles.fallback, { borderColor: theme.glassBorder }, style]} {...rest}>
      <BlurView
        intensity={glassStyle === 'clear' ? fallbackIntensity * 0.6 : fallbackIntensity}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: tint ?? theme.glassFallback },
        ]}
      />
      {children}
    </View>
  );
}

/**
 * Groups nearby panels so real Liquid Glass can merge them as they approach.
 * A plain passthrough on the fallback path.
 */
export function GlassGroup({
  spacing = 12,
  style,
  children,
  ...rest
}: ViewProps & { spacing?: number }) {
  if (LIQUID_GLASS_SUPPORTED) {
    return (
      <GlassContainer spacing={spacing} style={style} {...rest}>
        {children}
      </GlassContainer>
    );
  }
  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: StyleSheet.hairlineWidth,
  },
});
