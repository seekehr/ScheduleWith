/**
 * The horizontal glass cylinder at the top of the main screen: avatar, name,
 * level, XP-to-next-level and the streak badge.
 */

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { GlassPanel } from '@/components/glass-panel';
import { PressableScale } from '@/components/pressable-scale';
import { StreakFlame } from '@/components/streak-flame';
import { ThemedText } from '@/components/themed-text';
import { Forest, Radius, Spacing, Springs } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLevel, useProfile, useStreakTier } from '@/store/app-store';

export type ProfileHeaderProps = {
  onPress?: () => void;
};

export function ProfileHeader({ onPress }: ProfileHeaderProps) {
  const theme = useTheme();
  const profile = useProfile();
  const level = useLevel();
  const tier = useStreakTier();

  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      scaleTo={0.985}
      dimTo={1}
      accessibilityRole="button"
      accessibilityLabel={`${profile.displayName}, level ${level.level}, ${profile.streak} day streak`}
      style={styles.pressable}>
      <GlassPanel radius={Radius.pill} style={styles.panel}>
        <Avatar uri={profile.avatarUri} name={profile.displayName} />

        <View style={styles.middle}>
          <View style={styles.nameRow}>
            <ThemedText variant="bodyBold" numberOfLines={1} style={styles.name}>
              {profile.displayName || 'Friend'}
            </ThemedText>
            <View style={[styles.levelChip, { backgroundColor: theme.accent }]}>
              <ThemedText variant="caption" color={theme.onAccent}>
                LVL {level.level}
              </ThemedText>
            </View>
          </View>

          <XpBar progress={level.progress} />

          <ThemedText variant="caption" themeColor="textSecondary">
            {level.xpForNext - level.xpIntoLevel} XP to level {level.level + 1}
          </ThemedText>
        </View>

        <StreakFlame streak={profile.streak} tier={tier} size={38} />
      </GlassPanel>
    </PressableScale>
  );
}

function Avatar({ uri, name }: { uri?: string; name: string }) {
  const theme = useTheme();
  const initial = name.trim().charAt(0).toUpperCase() || '🙂';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, { borderColor: theme.glassBorder }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View style={[styles.avatar, styles.avatarFallback, { borderColor: theme.glassBorder }]}>
      <LinearGradient
        colors={[Forest[500], Forest[800]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <ThemedText variant="heading" color="#FFFFFF">
        {initial}
      </ThemedText>
    </View>
  );
}

/** Springs to its new width whenever XP changes, so ticking a task is visible. */
function XpBar({ progress }: { progress: number }) {
  const theme = useTheme();
  const width = useSharedValue(progress);

  useEffect(() => {
    width.value = withSpring(Math.min(1, Math.max(0, progress)), Springs.sheet);
  }, [width, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View style={[styles.track, { backgroundColor: theme.border }]}>
      <Animated.View style={[styles.fill, fillStyle]}>
        <LinearGradient
          colors={[Forest[500], Forest[700]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.three,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    gap: Spacing.one + 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  levelChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  track: {
    height: 7,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    minWidth: 7,
  },
});
