"use client";

import { Dumbbell } from "lucide-react";
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

/** Deterministic demo minutes when API does not expose per-user session length. */
function demoMinutes(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h + userId.charCodeAt(i) * (i + 1)) % 997;
  return 18 + (h % 34);
}

function initial(name: string) {
  const t = name.trim();
  return t ? t[0]!.toUpperCase() : "?";
}

interface ChallengeGymFeedProps {
  participants: Participant[];
  goalMinutes: number;
  currentUserId: string;
  myGym: MyGymRowState;
}

export function ChallengeGymFeed({
  participants,
  goalMinutes,
  currentUserId,
  myGym,
}: ChallengeGymFeedProps) {
  const sorted = [...participants].sort((a, b) => {
    const ra = a.rank ?? 999;
    const rb = b.rank ?? 999;
    return ra - rb;
  });

  return (
    <div className="overflow-hidden rounded-[22px] border border-pacer-border bg-white shadow-glass-sm backdrop-blur-xl">
      <div className="border-b border-pacer-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pacer-mint text-pacer-primary">
            <Dumbbell className="h-4 w-4" strokeWidth={2.25} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-pacer-ink">
              Gym feed
            </h3>
            <p className="text-xs text-pacer-muted">
              Who showed up today · goal {goalMinutes} min
            </p>
          </div>
        </div>
      </div>

      <ul className="max-h-[min(28rem,70dvh)] divide-y divide-pacer-border/60 overflow-y-auto">
        {sorted.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-pacer-muted">
            No participants yet.
          </li>
        ) : (
          sorted.map((p) => {
            const isMe = p.userId === currentUserId;
            const last = p.lastCheckin;
            const today = last && isSameLocalDay(last);

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
                detail = `Last visit ${formatShortDate(last)} · ${formatClock(last)}`;
              } else {
                detail = "No check-in logged yet";
              }
            } else if (today && last) {
              const m = demoMinutes(p.userId);
              detail = `Today · ${formatClock(last)} · ~${m} min`;
            } else if (last) {
              detail = `Last visit ${formatShortDate(last)} · ${formatClock(last)}`;
            } else {
              detail = "No recent check-in";
            }

            return (
              <li
                key={p.userId}
                className="flex items-start gap-3 px-5 py-3.5"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pacer-mint to-pacer-mist font-display text-sm font-bold text-pacer-leaf">
                  {initial(p.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-pacer-ink">
                      {p.name}
                      {isMe && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-pacer-primary">
                          You
                        </span>
                      )}
                    </p>
                    {p.rank != null && (
                      <span className="shrink-0 rounded-md bg-pacer-cream px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-pacer-muted">
                        #{p.rank}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] leading-snug text-pacer-muted">
                    {detail}
                  </p>
                  <p className="mt-1 text-[11px] text-pacer-muted/90">
                    {p.streak} day streak · {p.completedDays} days logged
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
