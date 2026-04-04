import type { Challenge, Participant, User } from "@/types";
import type {
  ApiChallenge,
  ApiChallengeParticipant,
  ApiLeaderboardRow,
  ApiUser,
} from "@/lib/api-types";

export function mapApiUserToUser(u: ApiUser): User {
  return {
    id: u.id,
    name: u.name,
    telegramId: typeof u.telegramId === "string" ? u.telegramId : "",
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    gymLat: u.gymLat ?? null,
    gymLng: u.gymLng ?? null,
  };
}

/** `/auth/login` user payload (no gym coords / telegram). */
export function mapLoginResponseUser(u: {
  id: string;
  name: string;
  email: string;
}): User {
  return {
    id: u.id,
    name: u.name,
    telegramId: "",
    email: u.email,
    phone: null,
    gymLat: null,
    gymLng: null,
  };
}

function mapParticipant(p: ApiChallengeParticipant): Participant {
  const name =
    typeof p.name === "string" && p.name.length > 0
      ? p.name
      : p.user?.name ?? "Member";
  return {
    userId: p.userId,
    name,
    streak: p.streak,
    completedDays: p.completedDays,
    rank: p.rank,
    lastCheckin: p.lastCheckin ?? null,
  };
}

export function mapApiChallengeToChallenge(
  c: ApiChallenge,
  currentUserId?: string
): Challenge {
  const participants = (c.participants ?? []).map(mapParticipant);
  const me = currentUserId
    ? participants.find((p) => p.userId === currentUserId)
    : undefined;

  return {
    id: c.id,
    name: c.name,
    daysPerWeek: c.daysPerWeek,
    durationMinutes: c.durationMinutes,
    inviteCode: c.inviteCode,
    participants,
    myProgress: me
      ? {
          streak: me.streak,
          completedDaysThisWeek: me.completedDays,
          weeklyGoal: c.daysPerWeek,
        }
      : undefined,
  };
}

export function mapLeaderboardRows(rows: ApiLeaderboardRow[]): Participant[] {
  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    streak: r.streak,
    completedDays: r.completedDays,
    rank: r.rank,
    lastCheckin: r.lastCheckin ?? null,
  }));
}
