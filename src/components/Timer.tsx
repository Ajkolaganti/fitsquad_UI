"use client";

import type { GymStatus } from "@/types";

interface TimerProps {
  status: GymStatus;
  formattedTime: string;
  requiredMinutes: number;
  goalReached: boolean;
  elapsedSeconds: number;
}

const SVG_SIZE = 224;
const STROKE = 16;
const R = (SVG_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const GREEN = "#0d9f6e";
const GREEN_SOFT = "rgba(13, 159, 110, 0.12)";
const TRACK = "rgba(20, 34, 26, 0.08)";

export function Timer({
  status,
  formattedTime,
  requiredMinutes,
  goalReached,
  elapsedSeconds,
}: TimerProps) {
  const requiredSeconds = requiredMinutes * 60;
  const pct = requiredSeconds > 0 ? Math.min(1, elapsedSeconds / requiredSeconds) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - pct);

  const isDone = goalReached || status === "completed_today";
  const isActive = status === "at_gym" && !isDone;

  const ringColor = isDone ? GREEN : isActive ? "#0ea5e9" : TRACK;
  const ringGlow = isDone
    ? "drop-shadow(0 0 10px rgba(13,159,110,0.45))"
    : isActive
      ? "drop-shadow(0 0 10px rgba(14,165,233,0.4))"
      : "none";

  const statusLabel = {
    not_at_gym: "NOT AT GYM",
    at_gym: "AT GYM",
    completed_today: "DONE TODAY",
  }[status];

  const statusDot = isDone ? GREEN : isActive ? "#0ea5e9" : "#94a3a8";
  const message = isDone
    ? "Session complete — goal hit for today"
    : isActive
      ? "Stay in the zone — timer running"
      : "Head to your gym to start";

  const centerColor = isDone ? GREEN : isActive ? "#14221a" : "#94a3a8";

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-pacer-border bg-white p-6 shadow-glass backdrop-blur-2xl">
      {isActive && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-100/80 blur-3xl" />
      )}
      {isDone && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ backgroundColor: GREEN_SOFT }} />
      )}

      <div className="relative flex flex-col items-center">
        <div className="mb-5 flex items-center gap-2 rounded-full border border-pacer-border bg-pacer-mist px-3.5 py-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: statusDot,
              boxShadow: isActive ? `0 0 6px ${statusDot}` : "none",
              animation: isActive ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span className="text-[10px] font-bold tracking-[0.18em] text-pacer-muted">
            {statusLabel}
          </span>
        </div>

        <div className="relative">
          <svg
            width={SVG_SIZE}
            height={SVG_SIZE}
            className="-rotate-90"
            aria-hidden="true"
          >
            <circle
              cx={SVG_SIZE / 2}
              cy={SVG_SIZE / 2}
              r={R}
              fill="none"
              stroke={TRACK}
              strokeWidth={STROKE}
            />
            <circle
              cx={SVG_SIZE / 2}
              cy={SVG_SIZE / 2}
              r={R}
              fill="none"
              stroke={ringColor === TRACK ? "#cbd5e1" : ringColor}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 1s ease, stroke 0.5s ease",
                filter: ringGlow,
              }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-display text-[3.25rem] font-bold tabular-nums tracking-tight leading-none"
              style={{ color: centerColor }}
            >
              {formattedTime}
            </span>
            <span className="mt-2 text-xs font-medium text-pacer-muted">
              / {requiredMinutes} min goal
            </span>
            {isActive && pct > 0 && (
              <span className="mt-1.5 text-sm font-bold text-sky-600">
                {Math.round(pct * 100)}%
              </span>
            )}
          </div>
        </div>

        <p
          className="mt-4 text-center text-sm font-medium"
          style={{
            color: isDone ? GREEN : isActive ? "#0284c7" : "#64748b",
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
