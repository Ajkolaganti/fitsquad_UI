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

  const ringColor = isDone ? "#30D158" : isActive ? "#0A84FF" : "rgba(255,255,255,0.06)";
  const ringGlow = isDone
    ? "drop-shadow(0 0 10px rgba(48,209,88,0.7))"
    : isActive
      ? "drop-shadow(0 0 10px rgba(10,132,255,0.7))"
      : "none";

  const statusLabel = {
    not_at_gym: "NOT AT GYM",
    at_gym: "AT GYM",
    completed_today: "DONE TODAY",
  }[status];

  const statusDot = isDone ? "#30D158" : isActive ? "#0A84FF" : "#52525B";
  const message = isDone
    ? "Session complete — you crushed it 🔥"
    : isActive
      ? "Stay in zone — timer running ⚡"
      : "Head to your gym to start";

  return (
    <div className="relative overflow-hidden rounded-[26px] border border-white/[0.09] bg-white/[0.04] p-6 shadow-glass backdrop-blur-2xl">
      {/* Ambient glow behind ring */}
      {isActive && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-apple-blue/15 blur-3xl" />
      )}
      {isDone && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-apple-green/15 blur-3xl" />
      )}

      <div className="relative flex flex-col items-center">
        {/* Status pill */}
        <div className="mb-5 flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.06] px-3.5 py-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: statusDot,
              boxShadow: isActive ? `0 0 6px ${statusDot}` : "none",
              animation: isActive ? "pulse 1.5s ease-in-out infinite" : "none",
            }}
          />
          <span className="text-[10px] font-bold tracking-[0.18em] text-zinc-300">
            {statusLabel}
          </span>
        </div>

        {/* SVG Ring */}
        <div className="relative">
          <svg
            width={SVG_SIZE}
            height={SVG_SIZE}
            className="-rotate-90"
            aria-hidden="true"
          >
            {/* Track */}
            <circle
              cx={SVG_SIZE / 2}
              cy={SVG_SIZE / 2}
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={STROKE}
            />
            {/* Progress */}
            <circle
              cx={SVG_SIZE / 2}
              cy={SVG_SIZE / 2}
              r={R}
              fill="none"
              stroke={ringColor}
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

          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-display text-[3.25rem] font-bold tabular-nums tracking-tight leading-none"
              style={{
                color: isDone ? "#30D158" : isActive ? "#FFFFFF" : "#52525B",
              }}
            >
              {formattedTime}
            </span>
            <span className="mt-2 text-xs font-medium text-zinc-600">
              / {requiredMinutes} min goal
            </span>
            {isActive && pct > 0 && (
              <span
                className="mt-1.5 text-sm font-bold"
                style={{ color: "#0A84FF" }}
              >
                {Math.round(pct * 100)}%
              </span>
            )}
          </div>
        </div>

        {/* Message */}
        <p
          className="mt-4 text-center text-sm font-medium"
          style={{
            color: isDone ? "#30D158" : isActive ? "#409CFF" : "#71717A",
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
