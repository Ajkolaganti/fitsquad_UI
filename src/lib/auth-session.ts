import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import { setAuthToken, apiGetCurrentUser } from "@/lib/api";
import { refreshChallengesFromServer } from "@/lib/user-challenges";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { extractGymFromSupabaseMetadata } from "@/lib/user-gym-normalize";
import { useAppStore } from "@/store/useAppStore";
import type { User } from "@/types";

/** Map Supabase Auth user to app `User` when `/auth/me` is unavailable. */
export function userFromSupabaseAuthUser(su: SupabaseAuthUser): User {
  const meta = su.user_metadata as Record<string, unknown> | undefined;
  const g = extractGymFromSupabaseMetadata(meta);
  const name =
    (typeof meta?.name === "string" && meta.name.trim()) ||
    su.email?.split("@")[0] ||
    "Athlete";
  return {
    id: su.id,
    name,
    telegramId:
      typeof meta?.telegramId === "string" ? meta.telegramId : "",
    email: su.email ?? null,
    phone: su.phone ?? null,
    gymLat: g.gymLat,
    gymLng: g.gymLng,
    gymName: g.gymName,
    gymAddress: g.gymAddress,
    gymPlaceId: g.gymPlaceId,
  };
}

export async function syncSessionToApp(session: Session): Promise<User> {
  setAuthToken(session.access_token);
  try {
    let u = await apiGetCurrentUser();
    if (u.gymLat == null || u.gymLng == null) {
      const g = extractGymFromSupabaseMetadata(
        session.user.user_metadata as Record<string, unknown> | undefined
      );
      if (g.gymLat != null && g.gymLng != null) {
        u = {
          ...u,
          gymLat: g.gymLat,
          gymLng: g.gymLng,
          gymName: g.gymName ?? u.gymName,
          gymAddress: g.gymAddress ?? u.gymAddress,
          gymPlaceId: g.gymPlaceId ?? u.gymPlaceId,
        };
      }
    }
    useAppStore.getState().setUser(u);
    await refreshChallengesFromServer(u.id);
    return u;
  } catch {
    const u = userFromSupabaseAuthUser(session.user);
    useAppStore.getState().setUser(u);
    await refreshChallengesFromServer(u.id);
    return u;
  }
}

export async function authSignOut(): Promise<void> {
  if (hasSupabaseConfig()) {
    try {
      await getSupabaseBrowserClient().auth.signOut();
    } catch {
      /* still clear local session */
    }
  }
  useAppStore.getState().logout();
}
