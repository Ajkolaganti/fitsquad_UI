import type { ActivityItem, Challenge } from "@/types";

const MAX_ITEMS = 25;

function truncateSquadName(name: string, max = 36) {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * Recent gym check-ins across every squad the user is in, newest first.
 * Uses `Participant.lastCheckin` from challenge payloads (same source as leaderboards).
 */
export function buildSquadActivityItems(
  challenges: Challenge[],
  currentUserId: string
): ActivityItem[] {
  const rows: ActivityItem[] = [];
  for (const c of challenges) {
    const squad = truncateSquadName(c.name);
    for (const p of c.participants) {
      const raw = p.lastCheckin?.trim();
      if (!raw) continue;
      const ts = new Date(raw).getTime();
      if (Number.isNaN(ts)) continue;
      const message =
        p.userId === currentUserId
          ? `You checked in · ${squad}`
          : `${p.name} checked in · ${squad}`;
      rows.push({
        id: `${c.id}:${p.userId}:${raw}`,
        message,
        createdAt: raw,
      });
    }
  }
  rows.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return rows.slice(0, MAX_ITEMS);
}
