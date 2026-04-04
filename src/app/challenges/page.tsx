"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, Plus, PlusCircle, Sparkles } from "lucide-react";
import { ChallengeCard } from "@/components/ChallengeCard";
import { apiGetChallenge, isApiConfigured } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

export default function ChallengesPage() {
  const router = useRouter();
  const { user, hydrated, challenges } = useAppStore();
  const challengeCount = challenges.length;

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
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
        .filter(
          (
            r
          ): r is PromiseFulfilledResult<
            Awaited<ReturnType<typeof apiGetChallenge>>
          > => r.status === "fulfilled"
        )
        .map((r) => r.value);
      if (next.length > 0) {
        useAppStore.getState().setChallenges(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user, challengeCount]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-pacer-ink">
              Challenges
            </h1>
            <p className="mt-1.5 text-sm text-pacer-muted">
              {challenges.length === 0
                ? "Create or join to get moving with your squad."
                : "Your active challenges and progress."}
            </p>
          </div>
          {challenges.length > 0 && (
            <div className="flex shrink-0 gap-2">
              <Link
                href="/join"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-pacer-border bg-white text-pacer-muted shadow-sm transition hover:bg-pacer-mist hover:text-pacer-ink"
                aria-label="Join with code"
              >
                <Link2 className="h-[18px] w-[18px]" strokeWidth={2} />
              </Link>
              <Link
                href="/create-challenge"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-pacer-mint text-pacer-leaf shadow-sm transition hover:bg-pacer-mint/80"
                aria-label="New challenge"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </div>
      </header>

      {challenges.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-pacer-border bg-white/80 px-6 py-14 text-center shadow-sm backdrop-blur-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-pacer-mint">
            <Sparkles className="h-8 w-8 text-pacer-primary" />
          </div>
          <p className="font-display text-lg font-semibold text-pacer-ink">
            No challenges yet
          </p>
          <p className="mt-2 text-sm text-pacer-muted">
            Start one or join with a code from a friend.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3">
            <Link
              href="/create-challenge"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pacer-primary px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:bg-pacer-primary-hover active:scale-[0.99]"
            >
              <PlusCircle className="h-4 w-4" strokeWidth={2} />
              New challenge
            </Link>
            <Link
              href="/join"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-pacer-border bg-white px-6 py-3.5 text-sm font-semibold text-pacer-ink shadow-sm transition hover:bg-pacer-mist/60 active:scale-[0.99]"
            >
              <Link2 className="h-4 w-4" strokeWidth={2} />
              Join with code
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}
