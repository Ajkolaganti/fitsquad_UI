/**
 * Returns a safe in-app path for post-login redirects, or null if untrusted.
 * Prevents open redirects (e.g. next=https://evil.com).
 */
export function getSafeInternalNextPath(
  raw: string | null | undefined
): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t.startsWith("/")) return null;
  if (t.startsWith("//")) return null;
  if (t.includes("\\") || t.includes("://")) return null;
  if (t.length > 2048) return null;
  return t;
}

/** Read `next` from the current page URL (client-only). */
export function readNextFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("next");
  return getSafeInternalNextPath(raw);
}
