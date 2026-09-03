import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  /** Rendered on the right of the bar. */
  trailing?: ReactNode;
};

export function ScreenHeader({ title, subtitle, trailing }: ScreenHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        haptic="light"
        style={styles.back}>
        <ThemedText variant="title" themeColor="textSecondary">
          ‹
        </ThemedText>
      </PressableScale>

      <View style={styles.copy}>
        <ThemedText variant="heading" numberOfLines={1}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" themeColor="textMuted" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.three,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  trailing: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
});
