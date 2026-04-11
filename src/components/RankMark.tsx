"use client";

import { Medal } from "lucide-react";

interface RankMarkProps {
  rank: number;
  className?: string;
}

/** Top-three ranks use a tinted medal icon; others show the numeric rank. */
export function RankMark({ rank, className = "" }: RankMarkProps) {
  if (rank === 1) {
    return (
      <Medal
        className={`h-[22px] w-[22px] text-amber-500 ${className}`}
        strokeWidth={2}
        aria-hidden
      />
    );
  }
  if (rank === 2) {
    return (
      <Medal
        className={`h-[22px] w-[22px] text-slate-400 ${className}`}
        strokeWidth={2}
        aria-hidden
      />
    );
  }
  if (rank === 3) {
    return (
      <Medal
        className={`h-[22px] w-[22px] text-amber-800/90 ${className}`}
        strokeWidth={2}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-lg bg-pacer-cream text-[11px] font-bold tabular-nums text-pacer-muted ${className}`}
    >
      {rank}
    </span>
  );
}
