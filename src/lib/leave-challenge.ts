import { apiLeaveChallenge, isApiConfigured } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

/** Calls API when configured, then drops the challenge from local store + persistence. */
export async function leaveChallengeForUser(
  challengeId: string,
  userId: string
): Promise<void> {
  if (isApiConfigured()) {
    await apiLeaveChallenge(challengeId, userId);
  }
  useAppStore.getState().removeChallenge(challengeId);
}
