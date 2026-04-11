import type { User } from "@/types";
import { isGymOnboardingPromptDismissed } from "@/lib/gym-onboarding-prompt";
import { readNextFromLocation } from "@/lib/safe-next-path";

/**
 * True only for users who still owe a first-time gym choice: no coordinates and
 * they have not skipped. Returning logins keep merged gym from storage when the
 * API omits coords; skips are remembered per account.
 */
export function userNeedsGymOnboarding(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.gymLat != null && user.gymLng != null) return false;
  return !isGymOnboardingPromptDismissed(user.id);
}

/** After sign-in: gym onboarding first, then `next` query, else dashboard. */
export function postAuthNavigate(
  router: { replace: (href: string) => void },
  user: User
): void {
  const next = readNextFromLocation();
  if (userNeedsGymOnboarding(user)) {
    const suffix = next ? `?next=${encodeURIComponent(next)}` : "";
    router.replace(`/onboarding/gym${suffix}`);
    return;
  }
  router.replace(next ?? "/dashboard");
}
