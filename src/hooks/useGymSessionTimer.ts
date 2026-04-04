"use client";

import { useEffect, useRef, useState } from "react";

export interface UseGymSessionTimerOptions {
  /** True while user is inside gym geofence */
  isInside: boolean;
  requiredMinutes: number;
  /** Called once when cumulative time in-zone reaches required minutes */
  onGoalReached?: () => void;
}

export interface UseGymSessionTimerResult {
  elapsedSeconds: number;
  isComplete: boolean;
  formatted: string;
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function useGymSessionTimer(
  options: UseGymSessionTimerOptions
): UseGymSessionTimerResult {
  const { isInside, requiredMinutes, onGoalReached } = options;
  const requiredSeconds = requiredMinutes * 60;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    if (isComplete || !isInside) return;

    const id = setInterval(() => {
      setElapsedSeconds((s) => {
        const next = s + 1;
        if (next >= requiredSeconds && !firedRef.current) {
          firedRef.current = true;
          setIsComplete(true);
          queueMicrotask(() => onGoalReached?.());
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isInside, isComplete, onGoalReached, requiredSeconds]);

  return {
    elapsedSeconds,
    isComplete,
    formatted: formatDuration(elapsedSeconds),
  };
}
