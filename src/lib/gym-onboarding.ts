import type { User } from "@/types";
import { readNextFromLocation } from "@/lib/safe-next-path";

export function userNeedsGymOnboarding(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.gymLat == null || user.gymLng == null;
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
