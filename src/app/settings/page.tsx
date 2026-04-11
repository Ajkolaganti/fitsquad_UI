"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, MapPin, UserRound } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { userNeedsGymOnboarding } from "@/lib/gym-onboarding";

export default function SettingsPage() {
  const router = useRouter();
  const { user, hydrated } = useAppStore();

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
      </div>
    );
  }

  const gymLine =
    user.gymName && user.gymName.trim()
      ? [user.gymName, user.gymAddress?.trim()].filter(Boolean).join(" · ")
      : user.gymLat != null && user.gymLng != null
        ? `${user.gymLat.toFixed(4)}, ${user.gymLng.toFixed(4)}`
        : null;
  const hasGymCoords = user.gymLat != null && user.gymLng != null;

  return (
    <div className="px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-pacer-muted transition hover:text-pacer-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      <h1 className="font-display text-2xl font-bold tracking-tight text-pacer-ink">
        Profile & settings
      </h1>
      <p className="mt-1 text-sm text-pacer-muted">
        Account details and your gym for check-ins.
      </p>

      <div className="mt-8 overflow-hidden rounded-[22px] border border-pacer-border bg-white shadow-glass-sm">
        <div className="flex items-center gap-3 border-b border-pacer-border/80 px-5 py-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pacer-mint text-pacer-primary">
            <UserRound className="h-5 w-5" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-pacer-muted">
              Name
            </p>
            <p className="truncate font-display text-base font-semibold text-pacer-ink">
              {user.name}
            </p>
            {user.email ? (
              <p className="mt-0.5 truncate text-sm text-pacer-muted">{user.email}</p>
            ) : null}
          </div>
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-pacer-muted">
            Gym location
          </p>
          <p className="mt-2 text-sm leading-relaxed text-pacer-ink">
            {gymLine ?? "Not set yet — add your gym for distance check-ins."}
          </p>
          {!hasGymCoords && !userNeedsGymOnboarding(user) ? (
            <p className="mt-2 text-xs text-pacer-muted">
              You skipped setup earlier. Set your gym anytime here.
            </p>
          ) : null}
          <Link
            href="/onboarding/gym?change=1&next=%2Fsettings"
            className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-pacer-border bg-pacer-mist/50 px-4 py-3.5 text-sm font-semibold text-pacer-ink transition hover:bg-pacer-mint/40"
          >
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-pacer-primary" aria-hidden />
              {hasGymCoords ? "Update gym" : "Set gym"}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-pacer-muted" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
