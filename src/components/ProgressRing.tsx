"use client";

import type { ReactNode } from "react";

interface ProgressRingProps {
  /** 0–1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** Track stroke color (CSS). */
  trackColor?: string;
  /** Progress stroke color (CSS). */
  progressColor?: string;
  className?: string;
  children?: ReactNode;
  /** For accessibility when no visible label */
  "aria-label": string;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  trackColor = "rgba(20, 34, 26, 0.1)",
  progressColor = "#0d9f6e",
  className = "",
  children,
  "aria-label": ariaLabel,
}: ProgressRingProps) {
  const p = Math.min(1, Math.max(0, progress));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - p);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 motion-safe:transition-[transform] duration-300"
        role="img"
        aria-label={ariaLabel}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        {children}
      </div>
    </div>
  );
}
