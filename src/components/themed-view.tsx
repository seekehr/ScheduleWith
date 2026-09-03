import { View, type ViewProps } from 'react-native';

import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  /** Palette key used as the background. Omit for a transparent view. */
  surface?: ThemeColor;
};

export function ThemedView({ style, surface, ...rest }: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[surface ? { backgroundColor: theme[surface] } : null, style]}
      {...rest}
    />
  );
}
