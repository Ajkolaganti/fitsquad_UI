/**
 * Client-side "last read" per squad chat (per user). Backend has no read receipts;
 * we persist ISO timestamps of the latest message the user has seen so we can show
 * WhatsApp-style unread counts on the squads list.
 */

const PREFIX = "fitsquad-squad-chat-read:v1:";

function key(userId: string) {
  return `${PREFIX}${userId}`;
}

export function getLastReadCreatedAt(
  userId: string,
  challengeId: string
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    const v = map[challengeId];
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Marks all messages up to `createdAt` as read (keeps the max timestamp). */
export function markChatRead(
  userId: string,
  challengeId: string,
  createdAt: string
): void {
  if (typeof window === "undefined") return;
  try {
    const k = key(userId);
    const raw = window.localStorage.getItem(k);
    const map: Record<string, string> = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    const prev = map[challengeId];
    const prevT = prev ? new Date(prev).getTime() : 0;
    const nextT = new Date(createdAt).getTime();
    if (!Number.isFinite(nextT)) return;
    if (nextT >= prevT) {
      map[challengeId] = createdAt;
      window.localStorage.setItem(k, JSON.stringify(map));
      window.dispatchEvent(new CustomEvent("fitsquad-chat-read"));
    }
  } catch {
    /* ignore quota / private mode */
  }
}

/** Newest message by `createdAt` (API may return oldest-first or newest-first). */
export function pickNewestMessageByCreatedAt<T extends { createdAt: string }>(
  messages: T[]
): T | null {
  if (messages.length === 0) return null;
  let best = messages[0]!;
  let bestT = new Date(best.createdAt).getTime();
  for (let i = 1; i < messages.length; i++) {
    const m = messages[i]!;
    const t = new Date(m.createdAt).getTime();
    if (Number.isFinite(t) && t >= bestT) {
      bestT = t;
      best = m;
    }
  }
  return best;
}

/**
 * If the user has no read cursor for this squad yet, set it to `latestCreatedAt`.
 * Without this, `countUnreadMessages(..., null)` counts every message in history (up to the fetch limit),
 * so every squad shows max unread on each app open.
 */
export function seedChatReadIfMissing(
  userId: string,
  challengeId: string,
  latestCreatedAt: string
): void {
  if (getLastReadCreatedAt(userId, challengeId)) return;
  markChatRead(userId, challengeId, latestCreatedAt);
}

/** Counts messages strictly after `lastRead` (by createdAt). If never read, all count. */
export function countUnreadMessages(
  messages: { createdAt: string }[],
  lastReadCreatedAt: string | null
): number {
  if (messages.length === 0) return 0;
  const t0 = lastReadCreatedAt
    ? new Date(lastReadCreatedAt).getTime()
    : -Infinity;
  if (lastReadCreatedAt && !Number.isFinite(t0)) return 0;
  let n = 0;
  for (const m of messages) {
    const t = new Date(m.createdAt).getTime();
    if (Number.isFinite(t) && t > t0) n += 1;
  }
  return n;
}
