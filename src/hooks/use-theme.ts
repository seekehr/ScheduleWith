/**
 * Palette access.
 *
 * The spec calls for a dark-mode *toggle*, so the active scheme comes from the
 * user's stored setting (seeded from the system scheme on first launch) rather
 * than from `useColorScheme()`.
 */

import { useMemo } from 'react';

import { Colors, type Palette, type ThemeName } from '@/constants/theme';
import { useSettings } from '@/store/app-store';

export function useThemeName(): ThemeName {
  return useSettings().darkMode ? 'dark' : 'light';
}

export function useTheme(): Palette {
  return Colors[useThemeName()];
}

export function useIsDark(): boolean {
  return useThemeName() === 'dark';
}

/**
 * Builds themed styles without re-creating the object on every render.
 *
 * @example
 * const styles = useThemedStyles((c) => ({ box: { backgroundColor: c.surface } }));
 */
export function useThemedStyles<T>(factory: (colors: Palette) => T): T {
  const colors = useTheme();
  return useMemo(() => factory(colors), [colors]);
}
