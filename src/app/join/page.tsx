"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { apiJoinChallenge, getApiErrorMessage, isApiConfigured } from "@/lib/api";
import { getMockChallenge } from "@/lib/mock-data";

function JoinInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromQuery = searchParams.get("code") || "";
  const { user, hydrated, upsertChallenge } = useAppStore();
  const [code, setCode] = useState(codeFromQuery);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setCode(codeFromQuery);
  }, [codeFromQuery]);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  async function onJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErr(null);
    setLoading(true);
    try {
      if (isApiConfigured()) {
        const ch = await apiJoinChallenge(user.id, code.trim());
        upsertChallenge(ch);
        router.replace(`/challenge/${ch.id}`);
      } else {
        const mock = getMockChallenge("demo-1");
        if (mock && code.toUpperCase().includes("DEMO")) {
          upsertChallenge(mock);
          router.replace(`/challenge/${mock.id}`);
        } else {
          setErr('Mock mode: use invite code containing "DEMO" or create a new challenge.');
        }
      }
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>

      <div className="mb-8">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-apple-blue/[0.15]">
          <span className="text-3xl">🔗</span>
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">
          Join a Challenge
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Paste the invite code your friend shared with you.
        </p>
      </div>

      <form onSubmit={onJoin} className="space-y-5">
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Invite code
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full rounded-2xl border border-white/[0.1] bg-white/[0.06] px-4 py-4 text-center font-mono text-xl font-bold uppercase tracking-[0.2em] text-white placeholder-zinc-600 transition focus:border-apple-blue/50 focus:ring-2 focus:ring-apple-blue/20"
            placeholder="DEMO2026"
            autoCapitalize="characters"
          />
        </div>

        {err && (
          <p className="rounded-2xl border border-apple-red/25 bg-apple-red/[0.1] px-4 py-3 text-sm text-red-200">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="w-full rounded-2xl bg-apple-blue py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-40 hover:bg-apple-blue-hover"
        >
          {loading ? "Joining…" : "Join squad"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-600">
        Don&apos;t have a code?{" "}
        <Link href="/create-challenge" className="text-apple-blue hover:underline">
          Create your own challenge
        </Link>
      </p>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
        </div>
      }
    >
      <JoinInner />
    </Suspense>
  );
}
