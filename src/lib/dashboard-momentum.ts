import type { Challenge } from "@/types";

export function weeklyGoalOrOne(weeklyGoal: number): number {
  return Math.max(1, weeklyGoal);
}

/**
 * Streak as a fraction of each challenge's weekly session target (0–1).
 * Uses server streak vs `daysPerWeek`, not calendar-week completion (API has no weekly slice yet).
 */
export function streakVsWeeklyFraction(
  progress: NonNullable<Challenge["myProgress"]>
): number {
  const goal = weeklyGoalOrOne(progress.weeklyGoal);
  return Math.min(1, progress.streak / goal);
}

export function aggregateMomentumAcrossChallenges(challenges: Challenge[]): {
  /** Mean of per-challenge streak fractions (0–1). */
  avgFraction: number;
  /** Challenges where `myProgress` exists. */
  counted: number;
} {
  const parts = challenges
    .map((c) => c.myProgress)
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => streakVsWeeklyFraction(p));
  if (parts.length === 0) return { avgFraction: 0, counted: 0 };
  const sum = parts.reduce((a, b) => a + b, 0);
  return { avgFraction: sum / parts.length, counted: parts.length };
}
