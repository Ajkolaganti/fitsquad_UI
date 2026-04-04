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
    telegramId: u.telegramId,
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    gymLat: u.gymLat,
    gymLng: u.gymLng,
  };
}

function mapParticipant(p: ApiChallengeParticipant): Participant {
  return {
    userId: p.userId,
    name: p.user.name,
    streak: p.streak,
    completedDays: p.completedDays,
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
  }));
}
