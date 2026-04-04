"use client";

import { MapPin, Navigation, RefreshCw } from "lucide-react";
import type { Coordinates } from "@/types";
import { GYM_RADIUS_METERS } from "@/lib/geo";
import type { UseLocationResult } from "@/hooks/useLocation";

interface LocationTrackerProps {
  gym: Coordinates | null;
  location: UseLocationResult;
  onSaveGymHere?: () => void;
  canSaveGym: boolean;
}

export function LocationTracker({
  gym,
  location,
  onSaveGymHere,
  canSaveGym,
}: LocationTrackerProps) {
  const {
    distanceToGymMeters,
    accuracyMeters,
    permission,
    error,
    loading,
    refresh,
    isWithinGym,
  } = location;

  const insideGym = isWithinGym && gym;

  return (
    <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] shadow-glass-sm backdrop-blur-xl overflow-hidden">
      {insideGym && (
        <div className="flex items-center gap-2 bg-apple-green/10 border-b border-apple-green/20 px-5 py-2.5">
          <span className="h-1.5 w-1.5 rounded-full bg-apple-green animate-pulse" />
          <span className="text-xs font-semibold text-apple-green">You&apos;re at the gym!</span>
        </div>
      )}
      <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${insideGym ? "bg-apple-green/15" : "bg-mint-500/15"}`}>
            <MapPin className={`h-5 w-5 ${insideGym ? "text-apple-green" : "text-mint-400"}`} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Location
            </h3>
            <p className="text-xs leading-relaxed text-zinc-500">
              Within {GYM_RADIUS_METERS}m of your gym counts as at gym
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-xl border border-white/[0.1] bg-white/[0.05] p-2.5 text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Refresh location"
        >
          <RefreshCw
            className={`h-5 w-5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {gym && (
        <p className="mt-4 rounded-2xl bg-black/40 px-3 py-2.5 font-mono text-xs text-zinc-400">
          Gym: {gym.lat.toFixed(5)}, {gym.lng.toFixed(5)}
        </p>
      )}

      {permission === "denied" && (
        <p className="mt-3 text-sm text-apple-orange">
          {error || "Allow location to track gym check-ins."}
        </p>
      )}
      {permission === "unsupported" && (
        <p className="mt-3 text-sm text-apple-orange">
          This device cannot use GPS in this context.
        </p>
      )}
      {error && permission !== "denied" && (
        <p className="mt-3 text-sm text-apple-red">{error}</p>
      )}

      <div className="mt-4 space-y-2 text-sm">
        {distanceToGymMeters != null && gym ? (
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.05] px-4 py-3">
            <span className="text-zinc-400">Distance to gym</span>
            <span className="font-semibold tabular-nums text-white">
              {distanceToGymMeters} m
            </span>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.05] px-4 py-3 text-zinc-500">
            {loading
              ? "Getting your position…"
              : gym
                ? "Waiting for GPS fix…"
                : "Save a gym location to measure distance."}
          </div>
        )}
        {accuracyMeters != null && (
          <p className="px-1 text-xs text-zinc-500">
            GPS accuracy ~{accuracyMeters}m
          </p>
        )}
      </div>

      {canSaveGym && onSaveGymHere && (
        <button
          type="button"
          onClick={onSaveGymHere}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-mint-500 py-3.5 text-sm font-semibold text-black shadow-lg transition active:scale-[0.99] hover:bg-mint-400"
        >
          <Navigation className="h-4 w-4" />
          Save current spot as gym
        </button>
      )}
      </div>
    </div>
  );
}
