import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale, type HapticStyle } from '@/components/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading glyph, usually an emoji or a symbol character. */
  icon?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: HapticStyle;
  style?: StyleProp<ViewStyle>;
};

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  fullWidth,
  haptic = 'medium',
  style,
}: AppButtonProps) {
  const theme = useTheme();

  const surface: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: theme.accent },
    secondary: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: theme.danger },
  };

  const labelColor =
    variant === 'primary' || variant === 'danger' ? theme.onAccent : theme.text;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      haptic={haptic}
      style={[
        styles.base,
        sizes[size],
        surface[variant],
        fullWidth ? styles.fullWidth : null,
        style,
      ]}>
      <View style={styles.content}>
        {icon ? (
          <ThemedText variant={size === 'lg' ? 'heading' : 'body'} color={labelColor}>
            {icon}
          </ThemedText>
        ) : null}
        <ThemedText
          variant={size === 'lg' ? 'heading' : 'bodyBold'}
          color={labelColor}
          numberOfLines={1}>
          {label}
        </ThemedText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});

const sizes = StyleSheet.create({
  sm: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, minHeight: 36 },
  md: { paddingVertical: Spacing.three - 4, paddingHorizontal: Spacing.four, minHeight: 48 },
  lg: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.five, minHeight: 60 },
});
