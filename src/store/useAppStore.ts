import { create } from "zustand";
import type { Challenge, User } from "@/types";
import { setAuthToken } from "@/lib/api";
import { clearBackendTokens } from "@/lib/auth-tokens";

const CHALLENGES_STORAGE_KEY = "firsquad_challenges_v1";

interface StoredChallengesPayload {
  userId: string;
  challenges: Challenge[];
}

function loadChallengesSnapshot(userId: string): Challenge[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHALLENGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChallengesPayload;
    if (
      !parsed ||
      parsed.userId !== userId ||
      !Array.isArray(parsed.challenges)
    ) {
      return [];
    }
    return parsed.challenges;
  } catch {
    return [];
  }
}

function persistChallengesSnapshot(userId: string, challenges: Challenge[]) {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredChallengesPayload = { userId, challenges };
    localStorage.setItem(CHALLENGES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

interface AppState {
  user: User | null;
  challenges: Challenge[];
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  setGymLocation: (
    lat: number,
    lng: number,
    meta?: {
      gymName?: string | null;
      gymAddress?: string | null;
      gymPlaceId?: string | null;
    }
  ) => void;
  setChallenges: (challenges: Challenge[]) => void;
  upsertChallenge: (challenge: Challenge) => void;
  removeChallenge: (challengeId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  challenges: [],
  hydrated: false,

  setHydrated: (v) => set({ hydrated: v }),

  setUser: (user) => {
    if (!user) {
      setAuthToken(null);
      clearBackendTokens();
      set({ user: null, challenges: [] });
      if (typeof window !== "undefined") {
        localStorage.removeItem("firsquad_user");
        localStorage.removeItem(CHALLENGES_STORAGE_KEY);
      }
      return;
    }
    let storedPayload: Record<string, unknown> | null = null;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("firsquad_user");
        if (raw) storedPayload = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        storedPayload = null;
      }
    }
    const prev = get().user;
    const merged = mergeGymIfApiMissing(user, prev, storedPayload);
    const storedChallenges = loadChallengesSnapshot(merged.id);
    set({ user: merged, challenges: storedChallenges });
    if (typeof window !== "undefined") {
      localStorage.setItem("firsquad_user", JSON.stringify(merged));
    }
  },

  logout: () => {
    setAuthToken(null);
    clearBackendTokens();
    set({ user: null, challenges: [] });
    if (typeof window !== "undefined") {
      localStorage.removeItem("firsquad_user");
      localStorage.removeItem(CHALLENGES_STORAGE_KEY);
    }
  },

  setGymLocation: (lat, lng, meta) => {
    const u = get().user;
    if (!u) return;
    const next: User = { ...u, gymLat: lat, gymLng: lng };
    if (meta) {
      if (meta.gymName !== undefined) next.gymName = meta.gymName;
      if (meta.gymAddress !== undefined) next.gymAddress = meta.gymAddress;
      if (meta.gymPlaceId !== undefined) next.gymPlaceId = meta.gymPlaceId;
    }
    set({ user: next });
    if (typeof window !== "undefined") {
      localStorage.setItem("firsquad_user", JSON.stringify(next));
    }
  },

  setChallenges: (challenges) => {
    set({ challenges });
    const u = get().user;
    if (u) persistChallengesSnapshot(u.id, challenges);
  },

  upsertChallenge: (challenge) => {
    const list = get().challenges;
    const i = list.findIndex((c) => c.id === challenge.id);
    const prev = i >= 0 ? list[i] : null;
    const merged =
      prev && challenge.inviteCode == null && prev.inviteCode
        ? { ...challenge, inviteCode: prev.inviteCode }
        : challenge;
    let next: Challenge[];
    if (i >= 0) {
      next = [...list];
      next[i] = merged;
    } else {
      next = [merged, ...list];
    }
    set({ challenges: next });
    const u = get().user;
    if (u) persistChallengesSnapshot(u.id, next);
  },

  removeChallenge: (challengeId) => {
    const list = get().challenges.filter((c) => c.id !== challengeId);
    set({ challenges: list });
    const u = get().user;
    if (u) persistChallengesSnapshot(u.id, list);
  },
}));

/** If the API returns no gym coords, keep the same user's last saved gym from memory or disk. */
function mergeGymIfApiMissing(
  incoming: User,
  prev: User | null,
  storedPayload: Record<string, unknown> | null
): User {
  if (incoming.gymLat != null && incoming.gymLng != null) return incoming;
  const candidates: (User | null)[] = [
    prev && prev.id === incoming.id ? prev : null,
    storedPayload ? migrateLegacyUser(storedPayload) : null,
  ];
  const donor = candidates.find(
    (u) =>
      u &&
      u.id === incoming.id &&
      u.gymLat != null &&
      u.gymLng != null
  );
  if (!donor) return incoming;
  return {
    ...incoming,
    gymLat: donor.gymLat,
    gymLng: donor.gymLng,
    gymName: incoming.gymName ?? donor.gymName,
    gymAddress: incoming.gymAddress ?? donor.gymAddress,
    gymPlaceId: incoming.gymPlaceId ?? donor.gymPlaceId,
  };
}

function migrateLegacyUser(raw: Record<string, unknown>): User {
  const telegramId =
    typeof raw.telegramId === "string" && raw.telegramId
      ? raw.telegramId
      : typeof raw.email === "string"
        ? raw.email.replace(/[^\d+]/g, "") || `tg-${String(raw.id).slice(0, 8)}`
        : `tg-${String(raw.id ?? "user").slice(0, 12)}`;

  return {
    id: String(raw.id),
    name: typeof raw.name === "string" ? raw.name : "Athlete",
    telegramId,
    email:
      typeof raw.email === "string" || raw.email === null
        ? (raw.email as string | null)
        : undefined,
    phone:
      typeof raw.phone === "string" || raw.phone === null
        ? (raw.phone as string | null)
        : undefined,
    gymLat: typeof raw.gymLat === "number" ? raw.gymLat : null,
    gymLng: typeof raw.gymLng === "number" ? raw.gymLng : null,
    gymName:
      typeof raw.gymName === "string" || raw.gymName === null
        ? (raw.gymName as string | null)
        : undefined,
    gymAddress:
      typeof raw.gymAddress === "string" || raw.gymAddress === null
        ? (raw.gymAddress as string | null)
        : undefined,
    gymPlaceId:
      typeof raw.gymPlaceId === "string" || raw.gymPlaceId === null
        ? (raw.gymPlaceId as string | null)
        : undefined,
  };
}

export function hydrateUserFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("firsquad_user");
    if (!raw) {
      useAppStore.getState().setHydrated(true);
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const user = migrateLegacyUser(parsed);
    useAppStore.getState().setUser(user);
  } catch {
    localStorage.removeItem("firsquad_user");
  } finally {
    useAppStore.getState().setHydrated(true);
  }
}
