"use client";

import { Dumbbell, Sparkles, Trophy } from "lucide-react";
import type { Participant } from "@/types";

type MyGymRowState = {
  /** Minutes logged today for the current user (from live check-in / timer). */
  minutesToday: number | null;
  /** Whether the current user is at gym, finished today, or not. */
  status: "at_gym" | "completed_today" | "not_at_gym";
};

function isSameLocalDay(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatRelative(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatShortDate(iso);
}

/** Deterministic demo minutes when API does not expose per-user session length. */
function demoMinutes(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = (h + userId.charCodeAt(i) * (i + 1)) % 997;
  }
  return 18 + (h % 34);
}

function initial(name: string) {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

interface ChallengeGymFeedProps {
  participants: Participant[];
  goalMinutes: number;
  /** Challenge `daysPerWeek` — shown as squad target context. */
  weeklyDayTarget: number;
  currentUserId: string;
  myGym: MyGymRowState;
}

export function ChallengeGymFeed({
  participants,
  goalMinutes,
  weeklyDayTarget,
  currentUserId,
  myGym,
}: ChallengeGymFeedProps) {
  const sorted = [...participants].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return (
      b.completedDays - a.completedDays ||
      b.streak - a.streak ||
      a.name.localeCompare(b.name)
    );
  });

  const trainedToday = sorted.filter(
    (p) => p.lastCheckin && isSameLocalDay(p.lastCheckin)
  ).length;
  const totalSquadDays = sorted.reduce((s, p) => s + p.completedDays, 0);
  const avgDays =
    sorted.length > 0
      ? Math.round((totalSquadDays / sorted.length) * 10) / 10
      : 0;
  const topStreak = sorted.reduce((m, p) => Math.max(m, p.streak), 0);

  const meIdx = sorted.findIndex((p) => p.userId === currentUserId);
  const me = meIdx >= 0 ? sorted[meIdx] : undefined;
  const above = meIdx > 0 ? sorted[meIdx - 1] : undefined;

  let pulseLine: string | null = null;
  if (me && sorted.length > 1) {
    if (meIdx === 0) {
      pulseLine = `You’re #1 on total gym days in this squad.`;
    } else if (above && above.completedDays > me.completedDays) {
      const gap = above.completedDays - me.completedDays;
      pulseLine =
        gap === 1
          ? `One more logged day to tie ${above.name}.`
          : `${gap} more logged days to catch ${above.name}.`;
    }
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-pacer-border bg-white shadow-glass-sm backdrop-blur-xl">
      <div className="border-b border-pacer-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pacer-mint text-pacer-primary">
            <Dumbbell className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-semibold text-pacer-ink">
              Gym feed
            </h3>
            <p className="text-xs text-pacer-muted">
              Live squad energy · {goalMinutes} min sessions · {weeklyDayTarget}×
              / week target
            </p>
          </div>
        </div>

        {sorted.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-gradient-to-br from-sky-50 to-pacer-mist/80 px-2.5 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700/90">
                Today
              </p>
              <p className="font-display text-lg font-bold tabular-nums text-pacer-ink">
                {trainedToday}
              </p>
              <p className="text-[9px] font-medium text-pacer-muted">checked in</p>
            </div>
            <div className="rounded-xl bg-pacer-cream/90 px-2.5 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-pacer-muted">
                Squad
              </p>
              <p className="font-display text-lg font-bold tabular-nums text-pacer-ink">
                {sorted.length}
              </p>
              <p className="text-[9px] font-medium text-pacer-muted">members</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-50/90 to-pacer-cream px-2.5 py-2 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800/80">
                Fire
              </p>
              <p className="font-display text-lg font-bold tabular-nums text-pacer-ink">
                {topStreak}
              </p>
              <p className="text-[9px] font-medium text-pacer-muted">best streak</p>
            </div>
          </div>
        )}

        {pulseLine && (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-pacer-border/60 bg-pacer-mint/30 px-3 py-2 text-[12px] font-medium leading-snug text-pacer-leaf">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {pulseLine}
          </p>
        )}

        {sorted.length > 0 && (
          <p className="mt-2 text-[11px] text-pacer-muted">
            Avg <span className="font-semibold text-pacer-ink">{avgDays}</span>{" "}
            logged days per member · totals are all-time for this challenge
          </p>
        )}
      </div>

      <ul className="max-h-[min(28rem,70dvh)] divide-y divide-pacer-border/60 overflow-y-auto">
        {sorted.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-pacer-muted">
            No participants yet.
          </li>
        ) : (
          sorted.map((p, i) => {
            const isMe = p.userId === currentUserId;
            const last = p.lastCheckin;
            const today = last && isSameLocalDay(last);
            const displayRank = p.rank ?? i + 1;
            const medal = displayRank <= 3 ? RANK_MEDALS[displayRank - 1] : null;

            let detail = "";
            if (isMe) {
              if (myGym.status === "at_gym") {
                const m =
                  myGym.minutesToday != null && myGym.minutesToday > 0
                    ? myGym.minutesToday
                    : null;
                detail =
                  m != null
                    ? `At gym now · ${m} min so far (goal ${goalMinutes} min)`
                    : `At gym now · goal ${goalMinutes} min`;
              } else if (myGym.status === "completed_today") {
                const m =
                  myGym.minutesToday != null && myGym.minutesToday > 0
                    ? myGym.minutesToday
                    : goalMinutes;
                detail = `Finished today · ~${m} min`;
              } else if (today && last) {
                const m =
                  myGym.minutesToday != null && myGym.minutesToday > 0
                    ? myGym.minutesToday
                    : demoMinutes(p.userId);
                detail = `Today · ${formatClock(last)} · ~${m} min`;
              } else if (last) {
                detail = `Last activity ${formatRelative(last)} · ${formatClock(last)}`;
              } else {
                detail = "No check-in logged yet";
              }
            } else if (today && last) {
              const m = demoMinutes(p.userId);
              detail = `Today · ${formatClock(last)} · ~${m} min`;
            } else if (last) {
              detail = `Last activity ${formatRelative(last)} · ${formatClock(last)}`;
            } else {
              detail = "No recent check-in";
            }

            const joinedHint =
              p.joinedAt && !Number.isNaN(new Date(p.joinedAt).getTime())
                ? `Joined ${formatShortDate(p.joinedAt)}`
                : null;

            return (
              <li
                key={p.userId}
                className={`flex items-start gap-3 px-5 py-3.5 ${
                  displayRank === 1 ? "bg-amber-50/40" : ""
                } ${isMe ? "bg-pacer-mint/25" : ""}`}
              >
                <div className="flex w-8 shrink-0 flex-col items-center pt-0.5">
                  {medal ? (
                    <span className="text-lg leading-none" aria-hidden>
                      {medal}
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pacer-cream text-[11px] font-bold tabular-nums text-pacer-muted">
                      {displayRank}
                    </span>
                  )}
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pacer-mint to-pacer-mist font-display text-sm font-bold text-pacer-leaf">
                  {initial(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-semibold text-pacer-ink">
                      {p.name}
                      {isMe && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-pacer-primary">
                          You
                        </span>
                      )}
                    </p>
                    {displayRank === 1 && (
                      <Trophy
                        className="h-3.5 w-3.5 shrink-0 text-amber-500"
                        aria-hidden
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-pacer-muted">
                    {detail}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-800">
                      🔥 {p.streak}d streak
                    </span>
                    <span className="inline-flex items-center rounded-md bg-pacer-cream px-2 py-0.5 text-[10px] font-semibold text-pacer-ink">
                      {p.completedDays} challenge days
                    </span>
                    {p.rank != null && (
                      <span className="inline-flex items-center rounded-md border border-pacer-border/80 bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-pacer-muted">
                        rank #{p.rank}
                      </span>
                    )}
                  </div>
                  {joinedHint && (
                    <p className="mt-1.5 text-[10px] text-pacer-muted/90">
                      {joinedHint}
                    </p>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
