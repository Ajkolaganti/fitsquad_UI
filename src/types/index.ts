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
}

export interface Challenge {
  id: string;
  name: string;
  daysPerWeek: number;
  durationMinutes: number;
  inviteCode?: string;
  participants: Participant[];
  myProgress?: {
    streak: number;
    completedDaysThisWeek: number;
    weeklyGoal: number;
  };
}

export interface Participant {
  userId: string;
  name: string;
  streak: number;
  completedDays: number;
  rank?: number;
  /** ISO timestamp of last check-in at gym (from API leaderboard / challenge). */
  lastCheckin?: string | null;
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
