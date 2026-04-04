"use client";

import Link from "next/link";
import { Flame, Users, ChevronRight } from "lucide-react";
import type { Challenge } from "@/types";

interface ChallengeCardProps {
  challenge: Challenge;
}

const CARD_ACCENTS = [
  "from-apple-blue to-sky-500",
  "from-emerald-500 to-teal-500",
  "from-apple-pink to-rose-500",
  "from-apple-purple to-violet-500",
];

function getAccent(id: string) {
  const idx = id.charCodeAt(0) % CARD_ACCENTS.length;
  return CARD_ACCENTS[idx];
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const progress = challenge.myProgress;
  const pct = progress
    ? Math.min(
        100,
        Math.round((progress.completedDaysThisWeek / progress.weeklyGoal) * 100)
      )
    : 0;
  const accent = getAccent(challenge.id);

  return (
    <Link
      href={`/challenge/${challenge.id}`}
      className="group block overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.04] shadow-glass-sm backdrop-blur-xl transition-all duration-300 active:scale-[0.985] hover:bg-white/[0.06]"
    >
      <div className={`h-1 w-full bg-gradient-to-r ${accent} opacity-90`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-semibold tracking-tight text-white">
              {challenge.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              {challenge.daysPerWeek}× / week · {challenge.durationMinutes} min
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 transition group-hover:bg-white/[0.1] group-hover:text-apple-blue">
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300">
            <Users className="h-3.5 w-3.5 text-apple-blue" />
            {challenge.participants.length} in squad
          </span>
          {progress && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-zinc-300">
              <Flame className="h-3.5 w-3.5 text-apple-orange" />
              {progress.streak} day streak
            </span>
          )}
        </div>

        {progress && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-zinc-500">This week</span>
              <span className="font-semibold tabular-nums text-zinc-300">
                {progress.completedDaysThisWeek}
                <span className="text-zinc-600">/{progress.weeklyGoal}</span>
              </span>
            </div>
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${accent} transition-all duration-700`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
