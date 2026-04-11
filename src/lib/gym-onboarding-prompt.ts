/**
 * Per-user flag: user chose "Skip" on gym onboarding, so we stop redirecting them
 * on every login. Gym can still be set later from Settings.
 */
const STORAGE_KEY = "firsquad_gym_prompt_dismissed_v1";

function readMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, boolean>;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export function isGymOnboardingPromptDismissed(userId: string): boolean {
  return Boolean(readMap()[userId]);
}

export function dismissGymOnboardingPrompt(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...readMap(), [userId]: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}
