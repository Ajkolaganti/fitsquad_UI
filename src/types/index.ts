export type GymStatus = "not_at_gym" | "at_gym" | "completed_today";

/** App user — from API and/or Supabase Auth (JWT sent to API when logged in). */
export interface User {
  id: string;
  name: string;
  /** Legacy external id; empty when using email-only auth. */
  telegramId: string;
  email?: string | null;
  phone?: string | null;
  gymLat: number | null;
  gymLng: number | null;
  /** From Google Places (or demo); shown in UI when set. */
  gymName?: string | null;
  gymAddress?: string | null;
  gymPlaceId?: string | null;
}

/** How the squad frames the challenge (enforcement is still attendance-based in the API). */
export type ChallengeKind =
  | "attendance"
  | "split_focus"
  | "exercise_focus"
  | "custom_text";

/** Optional structured focus from the gym challenge catalog */
export interface ChallengeFocus {
  splitId?: string;
  exerciseId?: string;
  modalityId?: string;
  customText?: string;
}

/** Reserved for future rules (volume targets, etc.) */
export type ChallengeRules = Record<string, unknown>;

export interface Challenge {
  id: string;
  name: string;
  daysPerWeek: number;
  durationMinutes: number;
  inviteCode?: string;
  participants: Participant[];
  myProgress?: {
    streak: number;
    /** Total counted gym days in this challenge (API `completedDays`). */
    completedDaysTotal: number;
    weeklyGoal: number;
  };
  challengeKind?: ChallengeKind;
  focus?: ChallengeFocus;
  /** Display line built from kind + attendance rules + focus */
  goalSummary?: string;
  rules?: ChallengeRules | null;
}

export interface Participant {
  userId: string;
  name: string;
  streak: number;
  completedDays: number;
  rank?: number;
  /** ISO timestamp of last check-in at gym (from API leaderboard / challenge). */
  lastCheckin?: string | null;
  joinedAt?: string | null;
}

export interface ActivityItem {
  id: string;
  message: string;
  createdAt: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}
