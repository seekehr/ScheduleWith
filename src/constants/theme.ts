/**
 * ScheduleWith design tokens.
 *
 * The app is forest green on white (light) / dark gray (dark). Colors are read
 * through `useTheme()` (see `@/hooks/use-theme`), which resolves the palette
 * from the user's stored `darkMode` setting rather than from the system scheme.
 */

import { Platform } from 'react-native';

/** The forest-green ramp. Shared by both schemes so brand color never shifts. */
export const Forest = {
  /** Deepest — pressed states, dark-mode text on light chips. */
  900: '#122C21',
  800: '#1B4332',
  /** Primary brand color. Buttons, active accents. */
  700: '#2D6A4F',
  600: '#40916C',
  500: '#52B788',
  400: '#74C69D',
  300: '#95D5B2',
  200: '#B7E4C7',
  100: '#D8F3DC',
} as const;

/** Non-brand accents used by the celebration / punishment screens. */
export const Accent = {
  gold: '#F2C14E',
  amber: '#F0932B',
  ember: '#E8590C',
  sky: '#4CC9F0',
  violet: '#9D4EDD',
  rose: '#FF5D8F',
  danger: '#D64545',
  dangerDeep: '#8E2A2A',
  rain: '#7A8B99',
  storm: '#2B3440',
} as const;

/** Every color the UI can ask for, in both schemes. */
export type Palette = {
  text: string;
  textSecondary: string;
  textMuted: string;
  onAccent: string;

  background: string;
  surface: string;
  surfaceRaised: string;
  surfacePressed: string;

  border: string;
  borderStrong: string;

  accent: string;
  accentSoft: string;
  accentStrong: string;

  danger: string;
  glassFallback: string;
  glassBorder: string;
  scrim: string;
};

export type ThemeName = 'light' | 'dark';
export type ThemeColor = keyof Palette;

export const Colors: Record<ThemeName, Palette> = {
  light: {
    text: '#0B1F17',
    textSecondary: '#4A5D54',
    textMuted: '#7C8C84',
    /** Text that sits on top of a filled forest-green surface. */
    onAccent: '#FFFFFF',

    background: '#FFFFFF',
    /** Cards, rows, section wrappers. */
    surface: '#F4F8F5',
    surfaceRaised: '#FFFFFF',
    surfacePressed: '#E7EFE9',

    border: '#DCE7E0',
    borderStrong: '#C3D5C9',

    accent: Forest[700],
    accentSoft: Forest[100],
    accentStrong: Forest[800],

    danger: Accent.danger,
    /** Translucent fill behind the blur fallback for glass panels. */
    glassFallback: 'rgba(255, 255, 255, 0.55)',
    glassBorder: 'rgba(255, 255, 255, 0.85)',
    /** Scrim behind modals and sheets. */
    scrim: 'rgba(11, 31, 23, 0.35)',
  },
  dark: {
    text: '#F2F7F3',
    textSecondary: '#A9BCB1',
    textMuted: '#7B8D83',
    onAccent: '#FFFFFF',

    background: '#1B1D1B',
    surface: '#262926',
    surfaceRaised: '#2F332F',
    surfacePressed: '#373B37',

    border: '#3A3F3A',
    borderStrong: '#4C524C',

    accent: Forest[500],
    accentSoft: '#22362B',
    accentStrong: Forest[600],

    danger: '#F06767',
    glassFallback: 'rgba(38, 41, 38, 0.55)',
    glassBorder: 'rgba(255, 255, 255, 0.12)',
    scrim: 'rgba(0, 0, 0, 0.5)',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  /** Big enough that any realistic row height renders as a full cylinder. */
  pill: 999,
} as const;

export const Duration = {
  fast: 140,
  base: 240,
  slow: 420,
  celebration: 1600,
} as const;

/**
 * Spring configs for feedback.
 *
 * Damping is the dial that matters: below about 12 a spring visibly wobbles
 * several times before settling, which reads as a shake on anything the user
 * triggers repeatedly. `bouncy` keeps that deliberately — it is reserved for
 * one-off showpieces (the welcome orb, the level-up banner, the celebration
 * figure) where the overshoot is the point.
 */
export const Springs = {
  /** Ticking a task. Lively, but settles in a single soft overshoot. */
  tick: { damping: 17, stiffness: 300, mass: 0.6 },
  press: { damping: 18, stiffness: 340, mass: 0.6 },
  sheet: { damping: 24, stiffness: 220, mass: 0.9 },
  /** Arrives and stops. No overshoot at all. */
  settle: { damping: 22, stiffness: 170, mass: 0.9 },
  /** Showpiece only — overshoots hard on purpose. */
  bouncy: { damping: 8, stiffness: 180, mass: 0.8 },
} as const;
