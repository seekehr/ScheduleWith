/**
 * First-launch experience: the welcome animation, then a name, then an
 * optional profile picture.
 *
 * The welcome step is deliberately hard-coded to black-on-white — it's the
 * app's one branded moment and reads the same for every user, whatever theme
 * they end up in.
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { PressableScale, triggerHaptic } from '@/components/pressable-scale';
import { ThemedText } from '@/components/themed-text';
import { Forest, Radius, Spacing, Springs } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useDispatch } from '@/store/app-store';
import { pickAvatar } from '@/store/media';

type Step = 'welcome' | 'name' | 'avatar';

/** Text that sits on the forest-green orb and button — white in both themes. */
const ON_FOREST = '#FFFFFF';

export function OnboardingFlow() {
  const dispatch = useDispatch();
  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | undefined>();

  const finish = useCallback(() => {
    triggerHaptic('success');
    dispatch({ type: 'finishOnboarding', displayName: name, avatarUri });
  }, [dispatch, name, avatarUri]);

  if (step === 'welcome') {
    return <WelcomeStep onNext={() => setStep('name')} />;
  }

  return (
    <ProfileSteps
      step={step}
      name={name}
      avatarUri={avatarUri}
      onChangeName={setName}
      onChangeAvatar={setAvatarUri}
      onBack={() => setStep(step === 'avatar' ? 'name' : 'welcome')}
      onNext={() => (step === 'name' ? setStep('avatar') : finish())}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — welcome                                                           */
/* -------------------------------------------------------------------------- */

function WelcomeStep({ onNext }: { onNext: () => void }) {
  // The spec asks for black on white, and that is exactly what the light theme
  // is. Reading it from the theme instead of hard-coding it means a phone set
  // to dark mode gets the dark-gray equivalent — without it, this screen
  // flashed white and then dropped into dark gray on the very next tap, and
  // the themed status bar drew light icons over the white.
  const theme = useTheme();
  const bloom = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    bloom.value = withDelay(120, withSpring(1, Springs.bouncy));
    drift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );
  }, [bloom, drift]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 0.2 + bloom.value * 0.8 },
      { translateY: -10 + drift.value * 20 },
    ],
    opacity: bloom.value,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.6 + bloom.value * 0.6 + drift.value * 0.08 }],
    opacity: bloom.value * (0.35 - drift.value * 0.15),
  }));

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.welcomeSafeArea}>
        <View style={styles.welcomeArt}>
          <Animated.View style={[styles.welcomeRing, ringStyle]} />
          <Animated.View style={[styles.welcomeOrb, orbStyle]}>
            <LinearGradient
              colors={[Forest[400], Forest[700]]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <ThemedText variant="display" color={ON_FOREST} style={styles.welcomeGlyph}>
              ✓
            </ThemedText>
          </Animated.View>
        </View>

        <View style={styles.welcomeCopy}>
          <Animated.View entering={FadeInDown.delay(420).duration(560).springify()}>
            <ThemedText variant="display" style={styles.centered}>
              Welcome to
            </ThemedText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(600).duration(560).springify()}>
            <ThemedText variant="display" style={styles.centered}>
              ScheduleWith
            </ThemedText>
          </Animated.View>
          <Animated.View entering={FadeIn.delay(900).duration(500)}>
            <ThemedText variant="body" themeColor="textSecondary" style={styles.centered}>
              One schedule. Every day. Keep the streak alive.
            </ThemedText>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(1150).duration(520).springify()}>
          <PressableScale
            accessibilityRole="button"
            onPress={onNext}
            haptic="medium"
            style={[styles.welcomeNext, { backgroundColor: theme.accent }]}>
            <ThemedText variant="heading" color={ON_FOREST}>
              Next ›
            </ThemedText>
          </PressableScale>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Steps 2 & 3 — name and avatar                                              */
/* -------------------------------------------------------------------------- */

type ProfileStepsProps = {
  step: Exclude<Step, 'welcome'>;
  name: string;
  avatarUri?: string;
  onChangeName: (value: string) => void;
  onChangeAvatar: (value: string | undefined) => void;
  onBack: () => void;
  onNext: () => void;
};

function ProfileSteps({
  step,
  name,
  avatarUri,
  onChangeName,
  onChangeAvatar,
  onBack,
  onNext,
}: ProfileStepsProps) {
  const theme = useTheme();
  const isNameStep = step === 'name';

  const choosePhoto = useCallback(async () => {
    const uri = await pickAvatar();
    if (uri) onChangeAvatar(uri);
  }, [onChangeAvatar]);

  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.stepSafeArea}>
          <View style={styles.stepHeader}>
            <PressableScale onPress={onBack} haptic="light" style={styles.backButton}>
              <ThemedText variant="heading" themeColor="textSecondary">
                ‹
              </ThemedText>
            </PressableScale>
            <StepDots active={isNameStep ? 1 : 2} />
            <View style={styles.backButton} />
          </View>

          <Animated.View
            key={step}
            entering={FadeInDown.duration(340).springify()}
            exiting={FadeOut.duration(140)}
            style={styles.stepBody}>
            {isNameStep ? (
              <>
                <ThemedText variant="title" style={styles.centered}>
                  What should we call you?
                </ThemedText>
                <ThemedText variant="body" themeColor="textSecondary" style={styles.centered}>
                  This stays on your phone. No account, no cloud.
                </ThemedText>
                <TextInput
                  value={name}
                  onChangeText={onChangeName}
                  placeholder="Your name"
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                  autoCorrect={false}
                  maxLength={40}
                  returnKeyType="next"
                  onSubmitEditing={() => name.trim() && onNext()}
                  style={[
                    styles.nameInput,
                    {
                      color: theme.text,
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                />
              </>
            ) : (
              <>
                <ThemedText variant="title" style={styles.centered}>
                  Add a photo?
                </ThemedText>
                <ThemedText variant="body" themeColor="textSecondary" style={styles.centered}>
                  Totally optional — you can add one later in Settings.
                </ThemedText>

                <PressableScale
                  onPress={choosePhoto}
                  haptic="medium"
                  style={[
                    styles.avatarWell,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <ThemedText variant="display" themeColor="textMuted">
                      +
                    </ThemedText>
                  )}
                </PressableScale>

                {avatarUri ? (
                  <PressableScale onPress={() => onChangeAvatar(undefined)} haptic="light">
                    <ThemedText variant="label" themeColor="textSecondary">
                      Remove photo
                    </ThemedText>
                  </PressableScale>
                ) : null}
              </>
            )}
          </Animated.View>

          <View style={styles.stepFooter}>
            <AppButton
              label={isNameStep ? 'Next ›' : "Let's go"}
              size="lg"
              fullWidth
              disabled={isNameStep && name.trim().length === 0}
              onPress={onNext}
            />
            {isNameStep ? null : (
              <PressableScale onPress={onNext} haptic="light" style={styles.skip}>
                <ThemedText variant="label" themeColor="textSecondary">
                  Skip for now
                </ThemedText>
              </PressableScale>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

function StepDots({ active }: { active: number }) {
  const theme = useTheme();
  return (
    <View style={styles.dots}>
      {[1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index <= active ? theme.accent : theme.border,
              width: index === active ? 22 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

const ORB_SIZE = 140;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { textAlign: 'center' },

  welcomeSafeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeArt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  welcomeRing: {
    position: 'absolute',
    width: ORB_SIZE * 2,
    height: ORB_SIZE * 2,
    borderRadius: ORB_SIZE,
    borderWidth: 2,
    borderColor: Forest[500],
  },
  welcomeOrb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeGlyph: {
    fontSize: 64,
    lineHeight: 74,
  },
  welcomeCopy: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  welcomeNext: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.six,
    borderRadius: Radius.pill,
  },

  stepSafeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  stepBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  nameInput: {
    alignSelf: 'stretch',
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  avatarWell: {
    marginTop: Spacing.four,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  stepFooter: {
    gap: Spacing.three,
    alignItems: 'center',
  },
  skip: {
    paddingVertical: Spacing.one,
  },
});
