/**
 * The two day-end screens.
 *
 * Finish everything and you get confetti, a grinning figure and a green "Just
 * Woke Up!". Let the day run out unfinished and you get rain, a slumped figure
 * and a red one — with a single one-hour reprieve if you ask for it.
 *
 * Mounted above the navigator so it covers every route and cannot be swiped
 * away: these screens are only dismissable through their own buttons.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { Confetti } from '@/components/confetti';
import { Figure } from '@/components/figure';
import { Rain } from '@/components/rain';
import { ThemedText } from '@/components/themed-text';
import { triggerHaptic } from '@/components/pressable-scale';
import { Accent, Forest, Spacing } from '@/constants/theme';
import {
  useAppState,
  useDayStatus,
  useDispatch,
  useProfile,
  useStreakTier,
  useToday,
} from '@/store/app-store';
import { formatDateKey } from '@/store/day';

export function DayEndOverlay() {
  const status = useDayStatus();
  const state = useAppState();
  const today = useToday();

  const celebrated = today !== null && state.celebratedDate === today.date;
  const showCelebration = status === 'complete' && !celebrated;
  const showPunishment = status === 'expired';

  if (showCelebration) return <CelebrationScreen />;
  if (showPunishment) return <PunishmentScreen />;
  return null;
}

/* -------------------------------------------------------------------------- */
/* Celebration                                                                */
/* -------------------------------------------------------------------------- */

function CelebrationScreen() {
  const dispatch = useDispatch();
  const profile = useProfile();
  const today = useToday();
  const tier = useStreakTier();

  useEffect(() => {
    triggerHaptic('success');
  }, []);

  const flash = useSharedValue(0);
  useEffect(() => {
    if (!tier.flash) return;
    flash.value = withRepeat(
      withSequence(
        withTiming(0.16, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 520, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
  }, [flash, tier.flash]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const startNewDay = useCallback(() => {
    dispatch({ type: 'startNewDay', now: Date.now() });
  }, [dispatch]);

  const sendMeBack = useCallback(() => {
    dispatch({ type: 'dismissCelebration' });
  }, [dispatch]);

  const nextStreak = profile.streak + 1;

  return (
    <Animated.View
      entering={FadeIn.duration(320)}
      exiting={FadeOut.duration(200)}
      style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#F6FBF7', '#DFF3E5', '#C7E9D4']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Confetti count={tier.confettiCount} colors={tier.colors} />
      {tier.flash ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.flash, flashStyle]}
        />
      ) : null}

      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.delay(120).duration(420).springify()}>
          <ThemedText variant="overline" color={Forest[700]} style={styles.centered}>
            {today ? formatDateKey(today.date) : 'Today'} · complete
          </ThemedText>
        </Animated.View>

        <View style={styles.stage}>
          <Figure mood="happy" shockwaves={tier.shockwaves} colors={tier.colors} />
        </View>

        <Animated.View
          entering={FadeInDown.delay(240).duration(460).springify()}
          style={styles.copy}>
          <ThemedText variant="display" color="#0B1F17" style={styles.centered}>
            Everything done.
          </ThemedText>
          <ThemedText variant="body" color="#3D5648" style={styles.centered}>
            {profile.streak > 0
              ? `Wake up to make it ${nextStreak} days in a row.`
              : 'Wake up to start your streak at 1 day.'}
          </ThemedText>
          {today ? (
            <ThemedText variant="label" color={Forest[700]} style={styles.centered}>
              +{today.xpEarned} XP today
            </ThemedText>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(380).duration(460).springify()}
          style={styles.actions}>
          <AppButton
            label="Just Woke Up!"
            size="lg"
            fullWidth
            haptic="success"
            onPress={startNewDay}
          />
          <AppButton
            label="Send me back :("
            size="sm"
            variant="ghost"
            haptic="light"
            onPress={sendMeBack}
            style={styles.secondaryAction}
          />
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */
/* Punishment                                                                 */
/* -------------------------------------------------------------------------- */

function PunishmentScreen() {
  const dispatch = useDispatch();
  const profile = useProfile();
  const today = useToday();

  useEffect(() => {
    triggerHaptic('heavy');
  }, []);

  const remaining = today ? today.tasks.length - today.completedIds.length : 0;

  const startNewDay = useCallback(() => {
    dispatch({ type: 'startNewDay', now: Date.now() });
  }, [dispatch]);

  const askForAnHour = useCallback(() => {
    dispatch({ type: 'grantGrace', now: Date.now() });
  }, [dispatch]);

  return (
    <Animated.View entering={FadeIn.duration(420)} style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#2B3440', '#1E252E', '#12171D']}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Rain count={80} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeInDown.delay(160).duration(500)}>
          <ThemedText variant="overline" color={Accent.rain} style={styles.centered}>
            {today ? formatDateKey(today.date) : 'Yesterday'} · unfinished
          </ThemedText>
        </Animated.View>

        <View style={styles.stage}>
          <Figure mood="sad" />
        </View>

        <Animated.View
          entering={FadeInDown.delay(320).duration(520)}
          style={styles.copy}>
          <ThemedText variant="display" color="#E6ECF2" style={styles.centered}>
            The day ran out.
          </ThemedText>
          <ThemedText variant="body" color={Accent.rain} style={styles.centered}>
            {remaining} {remaining === 1 ? 'task' : 'tasks'} left unchecked.
            {profile.streak > 0
              ? ` Your ${profile.streak}-day streak ends here.`
              : ' No streak to lose this time.'}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(520).duration(520)}
          style={styles.actions}>
          <AppButton
            label="Just Woke Up :("
            size="lg"
            variant="danger"
            fullWidth
            haptic="heavy"
            onPress={startNewDay}
          />
          <AppButton
            label="Wait, give me an hour"
            size="sm"
            haptic="medium"
            onPress={askForAnHour}
            style={styles.secondaryAction}
          />
        </Animated.View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centered: { textAlign: 'center' },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.two,
    alignItems: 'center',
  },
  secondaryAction: {
    marginTop: Spacing.one,
  },
  flash: {
    backgroundColor: '#FFFFFF',
  },
});
