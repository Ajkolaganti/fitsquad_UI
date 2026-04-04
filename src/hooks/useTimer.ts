"use client";

import { useEffect, useState } from "react";

/**
 * Simple stopwatch-style timer (starts when `active` is true).
 * For gym sessions with geofence + goal duration, prefer `useGymSessionTimer`.
 */
export function useTimer(active: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  return { seconds, formatted };
}
