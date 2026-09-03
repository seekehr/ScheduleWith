import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodyBold'
  | 'label'
  | 'caption'
  | 'overline'
  | 'number';

export type ThemedTextProps = TextProps & {
  variant?: TextVariant;
  themeColor?: ThemeColor;
  /** Overrides `themeColor` when you need a non-palette color (e.g. a tier hue). */
  color?: string;
};

export function ThemedText({
  style,
  variant = 'body',
  themeColor = 'text',
  color,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[{ color: color ?? theme[themeColor] }, styles[variant], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: Fonts.rounded,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  heading: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  bodyBold: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  number: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
