"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Flame, Trophy, Plus, Sparkles } from "lucide-react";
import { ChallengeCard } from "@/components/ChallengeCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { authSignOut } from "@/lib/auth-session";
import { apiGetChallenge, isApiConfigured } from "@/lib/api";
import { buildSquadActivityItems } from "@/lib/squad-activity";
import { useAppStore } from "@/store/useAppStore";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated, challenges } = useAppStore();
  const challengeCount = challenges.length;

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!hydrated || !user || !isApiConfigured()) return;
    const ids = useAppStore.getState().challenges.map((c) => c.id);
    if (ids.length === 0) return;
    let cancelled = false;
    void (async () => {
      const results = await Promise.allSettled(
        ids.map((id) => apiGetChallenge(id, user.id))
      );
      if (cancelled) return;
      const next = results
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof apiGetChallenge>>> => r.status === "fulfilled")
        .map((r) => r.value);
      if (next.length > 0) {
        useAppStore.getState().setChallenges(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user, challengeCount]);

  const squadActivityItems = useMemo(() => {
    if (!user) return [];
    return buildSquadActivityItems(challenges, user.id);
  }, [challenges, user]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
          <p className="text-sm text-pacer-muted">Loading…</p>
        </div>
      </div>
    );
  }

  const bestStreak = challenges.reduce(
    (best, c) => Math.max(best, c.myProgress?.streak ?? 0),
    0
  );
  const totalDaysLogged = challenges.reduce(
    (acc, c) => acc + (c.myProgress?.completedDaysTotal ?? 0),
    0
  );

  return (
    <div className="px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-pacer-muted">{getGreeting()}</p>
          <h1 className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight text-pacer-ink">
            {user.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            void authSignOut().then(() => router.replace("/login"));
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-pacer-border bg-white text-pacer-muted shadow-sm transition hover:bg-pacer-mist hover:text-pacer-ink"
          aria-label="Log out"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </header>

      {challenges.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-pacer-border bg-white p-4 shadow-glass-sm">
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-ember-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
                Streak
              </span>
            </div>
            <p className="font-display text-3xl font-semibold tabular-nums text-pacer-ink">
              {bestStreak}
            </p>
            <p className="text-xs text-pacer-muted">
              Best in one challenge · server counts consecutive days
            </p>
          </div>
          <div className="rounded-[20px] border border-pacer-border bg-white p-4 shadow-glass-sm">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
                Squad days
              </span>
            </div>
            <p className="font-display text-3xl font-semibold tabular-nums text-pacer-ink">
              {totalDaysLogged}
            </p>
            <p className="text-xs text-pacer-muted">
              Total gym days logged across challenges
            </p>
          </div>
        </div>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-pacer-ink">
              Challenges
            </h2>
            {challenges.length > 0 && (
              <span className="rounded-full bg-pacer-mint px-2.5 py-0.5 text-xs font-semibold text-pacer-leaf">
                {challenges.length}
              </span>
            )}
          </div>
          <Link
            href="/create-challenge"
            className="inline-flex items-center gap-1.5 rounded-full bg-pacer-mint px-3.5 py-2 text-xs font-semibold text-pacer-leaf transition hover:bg-pacer-mint/80"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            New
          </Link>
        </div>

        {challenges.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-pacer-border bg-white/80 px-6 py-14 text-center shadow-sm backdrop-blur-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-pacer-mint">
              <Sparkles className="h-8 w-8 text-pacer-primary" />
            </div>
            <p className="font-display text-lg font-semibold text-pacer-ink">
              No challenges yet
            </p>
            <p className="mt-2 text-sm text-pacer-muted">
              Start one and invite your crew
            </p>
            <Link
              href="/create-challenge"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-pacer-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-pacer-primary-hover active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Create a challenge
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((c) => (
              <ChallengeCard key={c.id} challenge={c} />
            ))}
          </div>
        )}
      </section>

      <section>
        <ActivityFeed items={squadActivityItems} />
      </section>
    </div>
  );
}
