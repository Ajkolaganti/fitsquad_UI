import { apiGetChallenge, isApiConfigured } from "@/lib/api";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";

/**
 * Loads challenge IDs for this user from Supabase `participants`, then hydrates
 * full `Challenge` objects via the FitSquad API. This matches DB membership after
 * refresh or login (in-memory / localStorage alone cannot).
 */
export async function refreshChallengesFromServer(userId: string): Promise<void> {
  if (!isApiConfigured() || !hasSupabaseConfig()) return;

  let challengeIds: string[] = [];
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("participants")
      .select("challengeId")
      .eq("userId", userId);

    if (error) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[FitSquad] participants lookup failed:", error.message);
      }
      return;
    }
    challengeIds = [
      ...new Set(
        (data ?? [])
          .map((row: { challengeId?: string }) => row.challengeId)
          .filter((id): id is string => typeof id === "string" && id.length > 0)
      ),
    ];
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[FitSquad] refreshChallengesFromServer:", e);
    }
    return;
  }

  if (challengeIds.length === 0) {
    useAppStore.getState().setChallenges([]);
    return;
  }

  const results = await Promise.allSettled(
    challengeIds.map((id) => apiGetChallenge(id, userId))
  );
  const challenges = results
    .filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof apiGetChallenge>>> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);

  if (challenges.length > 0) {
    useAppStore.getState().setChallenges(challenges);
  }
}
