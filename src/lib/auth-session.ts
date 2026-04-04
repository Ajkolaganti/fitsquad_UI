import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import { setAuthToken, apiGetCurrentUser } from "@/lib/api";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import type { User } from "@/types";

/** Map Supabase Auth user to app `User` when `/auth/me` is unavailable. */
export function userFromSupabaseAuthUser(su: SupabaseAuthUser): User {
  const meta = su.user_metadata as
    | { name?: string; telegramId?: string }
    | undefined;
  const name =
    (typeof meta?.name === "string" && meta.name.trim()) ||
    su.email?.split("@")[0] ||
    "Athlete";
  return {
    id: su.id,
    name,
    telegramId: typeof meta?.telegramId === "string" ? meta.telegramId : "",
    email: su.email ?? null,
    phone: su.phone ?? null,
    gymLat: null,
    gymLng: null,
  };
}

export async function syncSessionToApp(session: Session): Promise<User> {
  setAuthToken(session.access_token);
  try {
    const u = await apiGetCurrentUser();
    useAppStore.getState().setUser(u);
    return u;
  } catch {
    const u = userFromSupabaseAuthUser(session.user);
    useAppStore.getState().setUser(u);
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
  setAuthToken(null);
  useAppStore.getState().logout();
}
