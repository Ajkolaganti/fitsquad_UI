"use client";

import type { Participant } from "@/types";

interface LeaderboardProps {
  participants: Participant[];
  currentUserId?: string;
}

const AVATAR_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-violet-600",
  "from-cyan-500 to-blue-600",
];

function getAvatarGradient(name: string) {
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

export function Leaderboard({ participants, currentUserId }: LeaderboardProps) {
  const sorted = [...participants].sort(
    (a, b) => b.completedDays - a.completedDays
  );
  const maxDays = Math.max(1, sorted[0]?.completedDays ?? 1);

  return (
    <div className="overflow-hidden rounded-[22px] border border-pacer-border bg-white shadow-glass-sm backdrop-blur-xl">
      <div className="border-b border-pacer-border px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <div>
            <h3 className="font-display text-base font-semibold text-pacer-ink">
              Squad Ranking
            </h3>
            <p className="text-xs text-pacer-muted">By completed days</p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-pacer-border/60">
        {sorted.map((p, i) => {
          const rank = i + 1;
          const isSelf = p.userId === currentUserId;
          const barPct = (p.completedDays / maxDays) * 100;
          const avatarGrad = getAvatarGradient(p.name);

          return (
            <li
              key={p.userId}
              className={`flex items-center gap-3 px-5 py-4 ${isSelf ? "bg-pacer-mint/40" : ""}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center text-base">
                {rank <= 3 ? (
                  RANK_MEDALS[rank - 1]
                ) : (
                  <span className="text-sm font-bold text-pacer-muted">{rank}</span>
                )}
              </span>

              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white ${avatarGrad} ${
                  isSelf
                    ? "ring-2 ring-pacer-primary ring-offset-2 ring-offset-white"
                    : ""
                }`}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`truncate text-sm font-semibold ${isSelf ? "text-pacer-leaf" : "text-pacer-ink"}`}
                  >
                    {p.name}
                  </p>
                  {isSelf && (
                    <span className="shrink-0 rounded-full bg-pacer-mint px-2 py-0.5 text-[10px] font-bold text-pacer-leaf">
                      you
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-pacer-border/80">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        rank === 1
                          ? "bg-gradient-to-r from-amber-400 to-yellow-300"
                          : isSelf
                            ? "bg-pacer-primary"
                            : "bg-pacer-muted/50"
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-pacer-muted">{p.streak}🔥</span>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`font-display text-xl font-bold tabular-nums ${
                    rank === 1 ? "text-amber-500" : isSelf ? "text-pacer-primary" : "text-pacer-ink"
                  }`}
                >
                  {p.completedDays}
                </span>
                <p className="text-[10px] text-pacer-muted">days</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
