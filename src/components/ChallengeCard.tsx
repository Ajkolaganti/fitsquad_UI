"use client";

import Link from "next/link";
import { Flame, Users, ChevronRight } from "lucide-react";
import type { Challenge } from "@/types";

interface ChallengeCardProps {
  challenge: Challenge;
}

const CARD_ACCENTS = [
  "from-pacer-primary to-teal-500",
  "from-emerald-500 to-teal-500",
  "from-sky-500 to-cyan-500",
  "from-teal-600 to-pacer-leaf",
];

function getAccent(id: string) {
  const idx = id.charCodeAt(0) % CARD_ACCENTS.length;
  return CARD_ACCENTS[idx];
}

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const progress = challenge.myProgress;
  const accent = getAccent(challenge.id);

  return (
    <Link
      href={`/challenge/${challenge.id}`}
      className="group block overflow-hidden rounded-[22px] border border-pacer-border bg-white shadow-glass-sm backdrop-blur-xl transition-all duration-300 active:scale-[0.985] hover:bg-pacer-mist/50"
    >
      <div className={`h-1 w-full bg-gradient-to-r ${accent} opacity-90`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-lg font-semibold tracking-tight text-pacer-ink">
              {challenge.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-pacer-muted">
              {challenge.goalSummary ??
                `${challenge.daysPerWeek}× / week · ${challenge.durationMinutes} min`}
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pacer-cream text-pacer-muted transition group-hover:bg-pacer-mint group-hover:text-pacer-primary">
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-pacer-cream px-3 py-1.5 text-xs font-medium text-pacer-ink">
            <Users className="h-3.5 w-3.5 text-pacer-primary" />
            {challenge.participants.length} in squad
          </span>
          {progress && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pacer-cream px-3 py-1.5 text-xs font-medium text-pacer-ink">
              <Flame className="h-3.5 w-3.5 text-ember-500" />
              {progress.streak} day streak
            </span>
          )}
        </div>

        {progress && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-pacer-border/80 bg-pacer-cream/60 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-pacer-muted">
                Logged
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-pacer-ink">
                {progress.completedDaysTotal}
                <span className="text-xs font-medium text-pacer-muted"> days</span>
              </p>
            </div>
            <div className="rounded-xl border border-pacer-border/80 bg-pacer-cream/60 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-pacer-muted">
                Target
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-pacer-ink">
                {progress.weeklyGoal}
                <span className="text-xs font-medium text-pacer-muted">× / week</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
