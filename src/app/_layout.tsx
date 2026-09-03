import { Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DayEndOverlay } from '@/components/day-end-overlay';
import { LevelUpOverlay } from '@/components/level-up-overlay';
import { OnboardingFlow } from '@/components/onboarding-flow';
import { Fonts } from '@/constants/theme';
import { useIsDark, useTheme } from '@/hooks/use-theme';
import { useReminderSync } from '@/hooks/use-reminder-sync';
import { AppStoreProvider, useHydrated, useProfile } from '@/store/app-store';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppStoreProvider>
          <AppShell />
        </AppStoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const hydrated = useHydrated();
  const theme = useTheme();
  const isDark = useIsDark();
  const { onboarded } = useProfile();

  useReminderSync();

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync().catch(() => {});
  }, [hydrated]);

  // Keeps the window behind the JS view in sync, so theme changes and screen
  // transitions never flash the wrong background.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
  }, [theme.background]);

  const navigationTheme = useMemo<Theme>(
    () => ({
      dark: isDark,
      colors: {
        primary: theme.accent,
        background: theme.background,
        card: theme.surface,
        text: theme.text,
        border: theme.border,
        notification: theme.accent,
      },
      fonts: {
        regular: { fontFamily: Fonts.sans, fontWeight: '400' },
        medium: { fontFamily: Fonts.sans, fontWeight: '500' },
        bold: { fontFamily: Fonts.rounded, fontWeight: '700' },
        heavy: { fontFamily: Fonts.rounded, fontWeight: '800' },
      },
    }),
    [isDark, theme]
  );

  if (!hydrated) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/*
        The navigator always renders, even during onboarding: expo-router
        expects the root layout to mount one, and the welcome flow simply
        covers it until there's a profile to come back to.
      */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="schedules" />
        <Stack.Screen name="schedule/[id]" />
        <Stack.Screen name="settings" />
      </Stack>

      {/*
        These sit alongside the navigator rather than inside it, so they cover
        every screen and cannot be swiped away — the punishment screen is only
        meant to be dismissed by its own two buttons.
      */}
      {onboarded ? (
        <>
          <LevelUpOverlay />
          <DayEndOverlay />
        </>
      ) : (
        <View style={StyleSheet.absoluteFill}>
          <OnboardingFlow />
        </View>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
