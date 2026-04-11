import type { User } from "@/types";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

/**
 * Mirrors gym fields into Supabase Auth `user_metadata` so coordinates survive
 * login when `/auth/me` omits them or the API profile is stale.
 */
export async function syncGymToSupabaseUserMetadata(user: User): Promise<void> {
  if (!hasSupabaseConfig()) return;
  if (user.gymLat == null || user.gymLng == null) return;
  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({
      data: {
        gymLat: user.gymLat,
        gymLng: user.gymLng,
        gymName: user.gymName ?? null,
        gymAddress: user.gymAddress ?? null,
        gymPlaceId: user.gymPlaceId ?? null,
      },
    });
    if (error && process.env.NODE_ENV === "development") {
      console.warn("[FitSquad] Supabase gym metadata sync:", error.message);
    }
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[FitSquad] Supabase gym metadata sync failed", e);
    }
  }
}
