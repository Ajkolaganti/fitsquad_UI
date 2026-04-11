"use client";

import Link from "next/link";
import { MapPin, RefreshCw } from "lucide-react";
import type { Coordinates } from "@/types";
import { GYM_RADIUS_METERS } from "@/lib/geo";
import type { UseLocationResult } from "@/hooks/useLocation";

interface LocationTrackerProps {
  gym: Coordinates | null;
  /** Human-readable gym line (e.g. from Google Places). */
  gymLabel?: string | null;
  location: UseLocationResult;
  /** When user has no gym yet — link to onboarding. */
  gymSetupHref?: string;
}

export function LocationTracker({
  gym,
  gymLabel,
  location,
  gymSetupHref,
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
    <div className="overflow-hidden rounded-[22px] border border-pacer-border bg-white shadow-glass-sm backdrop-blur-xl">
      {insideGym && (
        <div className="flex items-center gap-2 border-b border-pacer-mint bg-pacer-mint/60 px-5 py-2.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pacer-primary" />
          <span className="text-xs font-semibold text-pacer-leaf">
            You&apos;re at the gym!
          </span>
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${insideGym ? "bg-pacer-mint" : "bg-pacer-cream"}`}
            >
              <MapPin
                className={`h-5 w-5 ${insideGym ? "text-pacer-primary" : "text-mint-600"}`}
              />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-pacer-ink">
                Location
              </h3>
              <p className="text-xs leading-relaxed text-pacer-muted">
                Within {GYM_RADIUS_METERS}m of your gym counts as at gym
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-xl border border-pacer-border bg-pacer-mist p-2.5 text-pacer-muted transition hover:bg-white hover:text-pacer-ink"
            aria-label="Refresh location"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {gym && (
          <div className="mt-4 space-y-1 rounded-2xl bg-pacer-cream px-3 py-2.5 text-xs text-pacer-muted">
            {gymLabel ? (
              <p className="text-sm font-medium text-pacer-ink">{gymLabel}</p>
            ) : null}
            <p className="font-mono">
              {gym.lat.toFixed(5)}, {gym.lng.toFixed(5)}
            </p>
          </div>
        )}

        {permission === "denied" && (
          <p className="mt-3 text-sm text-ember-500">
            {error || "Allow location to track gym check-ins."}
          </p>
        )}
        {permission === "unsupported" && (
          <p className="mt-3 text-sm text-ember-500">
            This device cannot use GPS in this context.
          </p>
        )}
        {error && permission !== "denied" && (
          <p className="mt-3 text-sm text-apple-red">{error}</p>
        )}

        <div className="mt-4 space-y-2 text-sm">
          {distanceToGymMeters != null && gym ? (
            <div className="flex items-center justify-between rounded-2xl border border-pacer-border/80 bg-pacer-mist/50 px-4 py-3">
              <span className="text-pacer-muted">Distance to gym</span>
              <span className="font-semibold tabular-nums text-pacer-ink">
                {distanceToGymMeters} m
              </span>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-pacer-border bg-pacer-mist/30 px-4 py-3 text-pacer-muted">
              {loading
                ? "Getting your position…"
                : gym
                  ? "Waiting for GPS fix…"
                  : "Set your gym to measure distance."}
            </div>
          )}
          {accuracyMeters != null && (
            <p className="px-1 text-xs text-pacer-muted">
              GPS accuracy ~{accuracyMeters}m
            </p>
          )}
        </div>

        {!gym && gymSetupHref ? (
          <Link
            href={gymSetupHref}
            className="mt-4 flex w-full items-center justify-center rounded-2xl bg-pacer-primary py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] hover:bg-pacer-primary-hover"
          >
            Choose your gym
          </Link>
        ) : null}
      </div>
    </div>
  );
}
