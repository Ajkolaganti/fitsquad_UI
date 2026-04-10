import type { Challenge } from "@/types";

const MAX_QUERY_VALUE_LEN = 480;

function clampQueryValue(s: string): string {
  const t = s.trim();
  if (t.length <= MAX_QUERY_VALUE_LEN) return t;
  return `${t.slice(0, MAX_QUERY_VALUE_LEN - 1)}…`;
}

/** Human-readable schedule line (e.g. "4 times per week · 40 min sessions"). */
export function buildInviteScheduleDetail(
  c: Pick<Challenge, "goalSummary" | "daysPerWeek" | "durationMinutes">
): string {
  if (c.goalSummary?.trim()) return c.goalSummary.trim();
  const n = c.daysPerWeek;
  const times = n === 1 ? "1 time per week" : `${n} times per week`;
  return `${times} · ${c.durationMinutes} min sessions`;
}

export function buildInviteJoinUrl(
  origin: string,
  inviteCode: string,
  meta: {
    challengeName: string;
    inviterName: string;
    detail: string;
  }
): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams();
  params.set("code", inviteCode.trim());
  params.set("challengeName", clampQueryValue(meta.challengeName));
  params.set("inviter", clampQueryValue(meta.inviterName));
  params.set("detail", clampQueryValue(meta.detail));
  return `${base}/join?${params.toString()}`;
}

/** Full text to paste into SMS / WhatsApp / Telegram (message + link). */
export function buildInviteShareMessage(opts: {
  inviteUrl: string;
  challengeName: string;
  inviterName: string;
  detail: string;
}): string {
  const who = opts.inviterName.trim() || "Someone";
  const title = opts.challengeName.trim() || "a challenge";
  return [
    `${who} sent you an invite to join "${title}" on fitsquad.`,
    ``,
    opts.detail.trim(),
    ``,
    `Join: ${opts.inviteUrl}`,
  ].join("\n");
}
