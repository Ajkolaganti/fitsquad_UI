"use client";

import { Target } from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";
import { aggregateMomentumAcrossChallenges } from "@/lib/dashboard-momentum";
import type { Challenge } from "@/types";

export function DashboardMomentumHero({
  challenges,
}: {
  challenges: Challenge[];
}) {
  const { avgFraction, counted } = aggregateMomentumAcrossChallenges(challenges);
  const pct = Math.round(avgFraction * 100);

  return (
    <div className="relative mb-6 overflow-hidden rounded-[22px] border border-pacer-border bg-gradient-to-br from-white via-white to-pacer-mint/30 p-5 shadow-glass-sm">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pacer-primary/30 to-transparent"
        aria-hidden
      />
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
        <ProgressRing
          progress={avgFraction}
          size={132}
          strokeWidth={11}
          aria-label={`Momentum ${pct} percent compared to weekly session targets`}
        >
          <span className="font-display text-[2rem] font-bold leading-none tabular-nums text-pacer-ink">
            {pct}
            <span className="text-base font-bold text-pacer-muted">%</span>
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="mb-2 flex items-center justify-center gap-2 sm:justify-start">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pacer-mint text-pacer-primary">
              <Target className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
            </span>
            <p className="font-display text-lg font-semibold text-pacer-ink">Momentum</p>
          </div>
          <p className="text-xs leading-relaxed text-pacer-muted">
            Current streak vs each challenge&apos;s weekly goal
            {counted > 1 ? ` — averaged across ${counted} challenges` : ""}. Not
            tied to the calendar week until the API exposes weekly totals.
          </p>
        </div>
      </div>
    </div>
  );
}
