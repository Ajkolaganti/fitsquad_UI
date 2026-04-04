"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Link2, PlusCircle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export default function StartPage() {
  const router = useRouter();
  const { user, hydrated } = useAppStore();

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-pacer-muted transition hover:text-pacer-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mb-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-pacer-mint">
          <span className="text-3xl">🚀</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-pacer-ink">
          Start a challenge
        </h1>
        <p className="mt-1.5 text-sm text-pacer-muted">
          Create a new squad or join one with an invite code.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/create-challenge"
          className="flex items-center gap-4 rounded-[22px] border border-pacer-border bg-white p-4 shadow-sm transition active:scale-[0.99] hover:border-pacer-primary/30 hover:bg-pacer-mist/40"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pacer-mint text-pacer-leaf">
            <PlusCircle className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 text-left">
            <p className="font-display text-base font-bold text-pacer-ink">
              New challenge
            </p>
            <p className="text-sm text-pacer-muted">
              Set goals and invite friends
            </p>
          </div>
        </Link>

        <Link
          href="/join"
          className="flex items-center gap-4 rounded-[22px] border border-pacer-border bg-white p-4 shadow-sm transition active:scale-[0.99] hover:border-pacer-primary/30 hover:bg-pacer-mist/40"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pacer-mint text-pacer-leaf">
            <Link2 className="h-6 w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 text-left">
            <p className="font-display text-base font-bold text-pacer-ink">
              Join with code
            </p>
            <p className="text-sm text-pacer-muted">
              Enter an invite from your squad
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
