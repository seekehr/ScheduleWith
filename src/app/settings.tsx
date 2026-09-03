import { DatePicker, Host } from '@expo/ui/swift-ui';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { StreakFlame } from '@/components/streak-flame';
import { ThemedText } from '@/components/themed-text';
import { Forest, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useAppState,
  useDispatch,
  useLevel,
  useProfile,
  useSettings,
  useStreakTier,
} from '@/store/app-store';
import { formatDayEnd, formatDayEndLabel, parseDayEnd } from '@/store/day';
import { nextTierAt } from '@/store/leveling';
import { pickAvatar, pruneAvatars } from '@/store/media';
import { cancelAllReminders, requestNotificationPermission } from '@/store/notifications';

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const dispatch = useDispatch();

  const state = useAppState();
  const profile = useProfile();
  const settings = useSettings();
  const level = useLevel();
  const tier = useStreakTier();

  const [name, setName] = useState(profile.displayName);

  const commitName = useCallback(() => {
    dispatch({ type: 'setDisplayName', displayName: name });
  }, [dispatch, name]);

  const changeAvatar = useCallback(async () => {
    const uri = await pickAvatar();
    if (!uri) return;
    dispatch({ type: 'setAvatar', avatarUri: uri });
    pruneAvatars(uri);
  }, [dispatch]);

  const toggleNotifications = useCallback(
    async (enabled: boolean) => {
      if (!enabled) {
        dispatch({ type: 'patchSettings', patch: { notifications: false } });
        await cancelAllReminders();
        return;
      }
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          'Turn them on for ScheduleWith in the iOS Settings app to get reminders.'
        );
        return;
      }
      dispatch({ type: 'patchSettings', patch: { notifications: true } });
    },
    [dispatch]
  );

  // The SwiftUI picker works in Dates, the setting is stored as 'HH:mm'.
  const dayEndDate = useMemo(() => {
    const minutes = parseDayEnd(settings.dayEndsAt);
    const date = new Date();
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return date;
  }, [settings.dayEndsAt]);

  const confirmReset = useCallback(() => {
    Alert.alert(
      'Erase everything?',
      'Schedules, history, XP, streak and profile are all deleted from this device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase',
          style: 'destructive',
          onPress: () => {
            // No navigation needed: clearing `onboarded` makes the root layout
            // swap the whole navigator out for the welcome flow.
            dispatch({ type: 'resetEverything' });
            void cancelAllReminders();
          },
        },
      ]
    );
  }, [dispatch]);

  const nextTier = nextTierAt(profile.streak);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.root} edges={['top']}>
        <ScreenHeader title="Settings" subtitle="Everything stays on this device" />

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Stats */}
          <View style={[styles.statsCard, { backgroundColor: theme.surface }]}>
            <StreakFlame streak={profile.streak} tier={tier} size={44} />
            <View style={styles.statsGrid}>
              <Stat label="Level" value={String(level.level)} />
              <Stat label="Total XP" value={String(profile.totalXp)} />
              <Stat label="Streak" value={`${profile.streak}d`} />
              <Stat label="Best" value={`${profile.bestStreak}d`} />
            </View>
            <ThemedText variant="caption" themeColor="textMuted" style={styles.tierNote}>
              {nextTier === null
                ? `${tier.label} tier — the highest there is.`
                : `${tier.label} tier · ${nextTier - profile.streak} more ${
                    nextTier - profile.streak === 1 ? 'day' : 'days'
                  } to the next one.`}
            </ThemedText>
          </View>

          {/* Profile */}
          <Section title="Profile">
            <View style={[styles.row, { backgroundColor: theme.surface }]}>
              <View style={styles.rowCopy}>
                <ThemedText variant="bodyBold">Profile picture</ThemedText>
                <ThemedText variant="caption" themeColor="textMuted">
                  Stored locally, never uploaded
                </ThemedText>
              </View>
              <PressableScale onPress={() => void changeAvatar()} haptic="medium">
                {profile.avatarUri ? (
                  <Image
                    source={{ uri: profile.avatarUri }}
                    style={[styles.avatar, { borderColor: theme.border }]}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.avatarEmpty,
                      { borderColor: theme.borderStrong },
                    ]}>
                    <ThemedText variant="heading" themeColor="textMuted">
                      +
                    </ThemedText>
                  </View>
                )}
              </PressableScale>
            </View>

            {profile.avatarUri ? (
              <PressableScale
                onPress={() => dispatch({ type: 'setAvatar', avatarUri: undefined })}
                haptic="light"
                style={styles.inlineAction}>
                <ThemedText variant="label" themeColor="textSecondary">
                  Remove photo
                </ThemedText>
              </PressableScale>
            ) : null}

            <View style={[styles.row, { backgroundColor: theme.surface }]}>
              <View style={styles.rowCopy}>
                <ThemedText variant="bodyBold">Display name</ThemedText>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                onBlur={commitName}
                onSubmitEditing={commitName}
                placeholder="Your name"
                placeholderTextColor={theme.textMuted}
                maxLength={40}
                returnKeyType="done"
                style={[styles.nameInput, { color: theme.text, borderColor: theme.border }]}
              />
            </View>
          </Section>

          {/* Appearance & day */}
          <Section title="Appearance">
            <ToggleRow
              title="Dark theme"
              hint="Forest green on dark gray"
              value={settings.darkMode}
              onChange={(darkMode) => dispatch({ type: 'patchSettings', patch: { darkMode } })}
            />
          </Section>

          <Section title="Your day">
            <View style={[styles.row, { backgroundColor: theme.surface }]}>
              <View style={styles.rowCopy}>
                <ThemedText variant="bodyBold">When does my day end?</ThemedText>
                <ThemedText variant="caption" themeColor="textMuted">
                  Currently {formatDayEndLabel(settings.dayEndsAt)} — unfinished tasks count as a
                  miss after this
                </ThemedText>
              </View>
              <Host style={styles.timePicker} seedColor={theme.accent}>
                <DatePicker
                  selection={dayEndDate}
                  displayedComponents={['hourAndMinute']}
                  onDateChange={(date) =>
                    dispatch({
                      type: 'patchSettings',
                      patch: {
                        dayEndsAt: formatDayEnd(date.getHours() * 60 + date.getMinutes()),
                      },
                    })
                  }
                />
              </Host>
            </View>
          </Section>

          {/* Notifications */}
          <Section title="Notifications">
            <ToggleRow
              title="Notifications"
              hint="A nudge one hour before your day ends"
              value={settings.notifications}
              onChange={(enabled) => void toggleNotifications(enabled)}
            />
            <ToggleRow
              title="Hourly reminders"
              hint="Every hour while tasks are still unchecked"
              value={settings.hourlyReminders}
              disabled={!settings.notifications}
              onChange={(hourlyReminders) =>
                dispatch({ type: 'patchSettings', patch: { hourlyReminders } })
              }
            />
          </Section>

          {/* Schedules */}
          <Section title="Schedules">
            <PressableScale
              onPress={() => router.push('/schedules')}
              haptic="light"
              style={[styles.row, { backgroundColor: theme.surface }]}>
              <View style={styles.rowCopy}>
                <ThemedText variant="bodyBold">Your schedules</ThemedText>
                <ThemedText variant="caption" themeColor="textMuted">
                  {state.schedules.length} saved · manage, reorder, export
                </ThemedText>
              </View>
              <ThemedText variant="heading" themeColor="textMuted">
                ›
              </ThemedText>
            </PressableScale>
          </Section>

          {state.history.length > 0 ? (
            <Section title="Recent days">
              <View style={[styles.historyCard, { backgroundColor: theme.surface }]}>
                {state.history.slice(0, 14).map((record) => (
                  <View
                    key={`${record.date}-${record.scheduleId}`}
                    style={[
                      styles.historyDot,
                      {
                        backgroundColor:
                          record.outcome === 'success' ? Forest[500] : theme.borderStrong,
                      },
                    ]}
                  />
                ))}
                <ThemedText variant="caption" themeColor="textMuted" style={styles.historyNote}>
                  Last {Math.min(14, state.history.length)} days · green means every task got done
                </ThemedText>
              </View>
            </Section>
          ) : null}

          <PressableScale onPress={confirmReset} haptic="heavy" style={styles.reset}>
            <ThemedText variant="label" themeColor="danger">
              Erase all data
            </ThemedText>
          </PressableScale>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText variant="overline" themeColor="textSecondary" style={styles.sectionLabel}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function ToggleRow({
  title,
  hint,
  value,
  onChange,
  disabled,
}: {
  title: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[styles.row, { backgroundColor: theme.surface }, disabled ? styles.disabled : null]}>
      <View style={styles.rowCopy}>
        <ThemedText variant="bodyBold">{title}</ThemedText>
        {hint ? (
          <ThemedText variant="caption" themeColor="textMuted">
            {hint}
          </ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: theme.border, true: theme.accent }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText variant="number">{value}</ThemedText>
      <ThemedText variant="caption" themeColor="textMuted">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },

  statsCard: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  stat: {
    alignItems: 'center',
    gap: 1,
    flex: 1,
  },
  tierNote: {
    textAlign: 'center',
  },

  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    paddingHorizontal: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three - 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    minHeight: 62,
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  inlineAction: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.three,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
  },
  avatarEmpty: {
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInput: {
    minWidth: 140,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
  },
  timePicker: {
    // SwiftUI hosts have no intrinsic size inside a flex row, so the compact
    // hour/minute picker needs an explicit box.
    width: 116,
    height: 40,
  },

  historyCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  historyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  historyNote: {
    width: '100%',
    paddingTop: Spacing.one,
  },

  reset: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
});
