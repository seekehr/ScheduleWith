/**
 * XP -> level, and streak -> animation intensity.
 *
 * Levels get progressively more expensive so early progress feels fast and
 * later levels still mean something: 100 XP for level 2, 150 for level 3, and
 * +50 for each level after that.
 */

import { Accent, Forest } from '@/constants/theme';

const BASE_REQUIREMENT = 100;
const REQUIREMENT_GROWTH = 50;

/** XP needed to advance *from* `level` to `level + 1`. */
export function xpToAdvance(level: number): number {
  return BASE_REQUIREMENT + REQUIREMENT_GROWTH * (Math.max(1, level) - 1);
}

export type LevelInfo = {
  level: number;
  /** XP accumulated inside the current level. */
  xpIntoLevel: number;
  /** XP the current level requires in total. */
  xpForNext: number;
  /** 0-1. */
  progress: number;
  totalXp: number;
};

export function levelFromXp(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let remaining = safeXp;
  let requirement = xpToAdvance(level);

  while (remaining >= requirement) {
    remaining -= requirement;
    level += 1;
    requirement = xpToAdvance(level);
  }

  return {
    level,
    xpIntoLevel: remaining,
    xpForNext: requirement,
    progress: requirement === 0 ? 0 : remaining / requirement,
    totalXp: safeXp,
  };
}

export type StreakTierName = 'none' | 'spark' | 'flame' | 'blaze' | 'aurora' | 'cosmic';

export type StreakTier = {
  name: StreakTierName;
  /** Ordinal, 0-5 — handy for scaling anything not listed here. */
  rank: number;
  label: string;
  /** Gradient for the flame / aura. */
  colors: readonly [string, string, ...string[]];
  /** Confetti pieces on the celebration screen. */
  confettiCount: number;
  /** Expanding rings behind the happy figure. */
  shockwaves: number;
  /** Whether the celebration adds a full-screen flash. */
  flash: boolean;
  /** Whether particles orbit the streak badge. */
  orbit: boolean;
  /** Multiplier applied to the day-completion XP bonus. */
  bonusMultiplier: number;
};

const TIERS: readonly StreakTier[] = [
  {
    name: 'none',
    rank: 0,
    label: 'No streak yet',
    colors: [Forest[300], Forest[500]],
    confettiCount: 24,
    shockwaves: 0,
    flash: false,
    orbit: false,
    bonusMultiplier: 1,
  },
  {
    name: 'spark',
    rank: 1,
    label: 'Spark',
    colors: [Forest[400], Forest[600]],
    confettiCount: 40,
    shockwaves: 1,
    flash: false,
    orbit: false,
    bonusMultiplier: 1.1,
  },
  {
    name: 'flame',
    rank: 2,
    label: 'Flame',
    colors: [Accent.gold, Accent.amber, Accent.ember],
    confettiCount: 64,
    shockwaves: 2,
    flash: false,
    orbit: false,
    bonusMultiplier: 1.25,
  },
  {
    name: 'blaze',
    rank: 3,
    label: 'Blaze',
    colors: [Accent.sky, Forest[400], Accent.gold],
    confettiCount: 88,
    shockwaves: 3,
    flash: true,
    orbit: true,
    bonusMultiplier: 1.5,
  },
  {
    name: 'aurora',
    rank: 4,
    label: 'Aurora',
    colors: [Accent.violet, Accent.sky, Forest[400], Accent.rose],
    confettiCount: 112,
    shockwaves: 4,
    flash: true,
    orbit: true,
    bonusMultiplier: 1.75,
  },
  {
    name: 'cosmic',
    rank: 5,
    label: 'Cosmic',
    colors: [Accent.rose, Accent.gold, Accent.sky, Accent.violet, Forest[400]],
    confettiCount: 140,
    shockwaves: 5,
    flash: true,
    orbit: true,
    bonusMultiplier: 2,
  },
];

export function streakTier(streak: number): StreakTier {
  if (streak >= 30) return TIERS[5];
  if (streak >= 14) return TIERS[4];
  if (streak >= 7) return TIERS[3];
  if (streak >= 3) return TIERS[2];
  if (streak >= 1) return TIERS[1];
  return TIERS[0];
}

/** Streak length at which the next tier unlocks, or `null` at the top tier. */
export function nextTierAt(streak: number): number | null {
  for (const threshold of [1, 3, 7, 14, 30]) {
    if (streak < threshold) return threshold;
  }
  return null;
}

const BASE_DAY_BONUS = 25;

/** Bonus XP for closing out a full day, scaled by the streak being extended. */
export function dayCompletionBonus(streakAfter: number): number {
  return Math.round(BASE_DAY_BONUS * streakTier(streakAfter).bonusMultiplier);
}
