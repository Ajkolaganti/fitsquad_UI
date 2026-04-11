import type {
  Challenge,
  ChallengeFocus,
  ChallengeKind,
  Participant,
  User,
} from "@/types";
import type {
  ApiChallenge,
  ApiChallengeFocus,
  ApiChallengeParticipant,
  ApiLeaderboardRow,
  ApiUser,
} from "@/lib/api-types";

const CHALLENGE_KINDS: ChallengeKind[] = [
  "attendance",
  "split_focus",
  "exercise_focus",
  "custom_text",
];

function mapApiFocus(f: ApiChallengeFocus | null | undefined): ChallengeFocus | undefined {
  if (!f || typeof f !== "object") return undefined;
  const out: ChallengeFocus = {};
  if (typeof f.splitId === "string") out.splitId = f.splitId;
  if (typeof f.exerciseId === "string") out.exerciseId = f.exerciseId;
  if (typeof f.modalityId === "string") out.modalityId = f.modalityId;
  if (typeof f.customText === "string") out.customText = f.customText;
  return Object.keys(out).length ? out : undefined;
}

function mapChallengeKind(raw: string | undefined | null): ChallengeKind | undefined {
  if (!raw || typeof raw !== "string") return undefined;
  return CHALLENGE_KINDS.includes(raw as ChallengeKind)
    ? (raw as ChallengeKind)
    : undefined;
}

export function mapApiUserToUser(u: ApiUser): User {
  return {
    id: u.id,
    name: u.name,
    telegramId: typeof u.telegramId === "string" ? u.telegramId : "",
    email: u.email ?? undefined,
    phone: u.phone ?? undefined,
    gymLat: u.gymLat ?? null,
    gymLng: u.gymLng ?? null,
    gymName: u.gymName ?? undefined,
    gymAddress: u.gymAddress ?? undefined,
    gymPlaceId: u.gymPlaceId ?? undefined,
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
    joinedAt: p.joinedAt ?? null,
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

  const kind = mapChallengeKind(c.challengeKind);
  const focus = mapApiFocus(c.focus ?? undefined);
  const rules =
    c.rules && typeof c.rules === "object" && !Array.isArray(c.rules)
      ? (c.rules as Challenge["rules"])
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
          completedDaysTotal: me.completedDays,
          weeklyGoal: c.daysPerWeek,
        }
      : undefined,
    ...(kind ? { challengeKind: kind } : {}),
    ...(focus ? { focus } : {}),
    ...(typeof c.goalSummary === "string" && c.goalSummary
      ? { goalSummary: c.goalSummary }
      : {}),
    ...(rules ? { rules } : {}),
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
    joinedAt: r.joinedAt ?? null,
  }));
}
