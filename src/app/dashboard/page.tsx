"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Flame, Trophy, Plus, Sparkles } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { ChallengeCard } from "@/components/ChallengeCard";
import { ActivityFeed } from "@/components/ActivityFeed";
import { authSignOut } from "@/lib/auth-session";
import { useAppStore } from "@/store/useAppStore";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, hydrated, challenges } = useAppStore();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      </div>
    );
  }

  const totalStreak = challenges.reduce(
    (acc, c) => acc + (c.myProgress?.streak ?? 0),
    0
  );
  const totalDone = challenges.reduce(
    (acc, c) => acc + (c.myProgress?.completedDaysThisWeek ?? 0),
    0
  );
  const totalGoal = challenges.reduce(
    (acc, c) => acc + (c.myProgress?.weeklyGoal ?? 0),
    0
  );

  return (
    <div className="px-5 pb-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mb-6 flex justify-center">
        <AppLogo variant="header" />
      </div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{getGreeting()}</p>
          <h1 className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight text-white">
            {user.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => {
            void authSignOut().then(() => router.replace("/login"));
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.05] text-zinc-400 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Log out"
        >
          <LogOut className="h-[18px] w-[18px]" />
        </button>
      </header>

      {challenges.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-4 shadow-glass-sm backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <Flame className="h-4 w-4 text-apple-orange" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Streak
              </span>
            </div>
            <p className="font-display text-3xl font-semibold tabular-nums text-white">
              {totalStreak}
            </p>
            <p className="text-xs text-zinc-500">days in a row</p>
          </div>
          <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-4 shadow-glass-sm backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-apple-yellow" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                This week
              </span>
            </div>
            <p className="font-display text-3xl font-semibold tabular-nums text-white">
              {totalDone}
              <span className="text-lg font-normal text-zinc-600">/{totalGoal}</span>
            </p>
            <p className="text-xs text-zinc-500">days completed</p>
          </div>
        </div>
      )}

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-white">
              Challenges
            </h2>
            {challenges.length > 0 && (
              <span className="rounded-full bg-white/[0.1] px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                {challenges.length}
              </span>
            )}
          </div>
          <Link
            href="/create-challenge"
            className="inline-flex items-center gap-1.5 rounded-full bg-apple-blue/15 px-3.5 py-2 text-xs font-semibold text-apple-blue transition hover:bg-apple-blue/25"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            New
          </Link>
        </div>

        {challenges.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-white/[0.12] bg-white/[0.02] px-6 py-14 text-center backdrop-blur-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-apple-blue/20 to-apple-purple/20">
              <Sparkles className="h-8 w-8 text-apple-blue" />
            </div>
            <p className="font-display text-lg font-semibold text-white">
              No challenges yet
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Start one and invite your crew
            </p>
            <Link
              href="/create-challenge"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-apple-blue px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-apple-blue-hover active:scale-[0.99]"
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
        <ActivityFeed items={MOCK_ACTIVITIES} />
      </section>
    </div>
  );
}
