"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import {
  apiCreateChallenge,
  getApiErrorMessage,
  isApiConfigured,
} from "@/lib/api";
import type { Challenge } from "@/types";

function buildLocalChallenge(
  name: string,
  daysPerWeek: number,
  durationMinutes: number,
  userId: string,
  userName: string
): Challenge {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `ch-${Date.now()}`;
  const inviteCode = id.slice(0, 8).toUpperCase();
  return {
    id,
    name,
    daysPerWeek,
    durationMinutes,
    inviteCode,
    participants: [
      {
        userId,
        name: userName,
        streak: 0,
        completedDays: 0,
        rank: 1,
      },
    ],
    myProgress: {
      streak: 0,
      completedDaysThisWeek: 0,
      weeklyGoal: daysPerWeek,
    },
  };
}

const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7];
const DURATION_OPTIONS = [20, 30, 40, 45, 60, 90];

export default function CreateChallengePage() {
  const router = useRouter();
  const { user, hydrated, upsertChallenge } = useAppStore();
  const [name, setName] = useState("Morning grind");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [telegramGroupId, setTelegramGroupId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<Challenge | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErr(null);
    setLoading(true);
    try {
      if (isApiConfigured()) {
        const ch = await apiCreateChallenge({
          name,
          daysPerWeek,
          durationMinutes,
          telegramGroupId: telegramGroupId.trim() || undefined,
        });
        upsertChallenge(ch);
        setCreated(ch);
      } else {
        const ch = buildLocalChallenge(
          name,
          daysPerWeek,
          durationMinutes,
          user.id,
          user.name
        );
        upsertChallenge(ch);
        setCreated(ch);
      }
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  const inviteUrl =
    typeof window !== "undefined" && created?.inviteCode
      ? `${window.location.origin}/join?code=${created.inviteCode}`
      : "";

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputClass =
    "w-full rounded-2xl border border-white/[0.1] bg-white/[0.06] px-4 py-3.5 text-base text-white placeholder-zinc-500 transition focus:border-apple-blue/50 focus:ring-2 focus:ring-apple-blue/20";

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
        <h1 className="font-display text-3xl font-bold tracking-tight text-white">
          New Challenge
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Set the rules. Share the link. Hold each other accountable.
        </p>
      </div>

      {created ? (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-apple-green/25 bg-apple-green/[0.08] p-6 text-center backdrop-blur-xl">
            <div className="mb-3 text-4xl">🎉</div>
            <h2 className="font-display text-xl font-bold text-white">
              {created.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {created.daysPerWeek}× / week · {created.durationMinutes} min sessions
            </p>
          </div>

          <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Invite link
            </p>
            <p className="break-all rounded-xl bg-black/40 px-3 py-2.5 font-mono text-xs text-zinc-300">
              {inviteUrl}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-apple-green py-3.5 text-sm font-semibold text-black transition active:scale-[0.99] hover:opacity-90"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy link"}
              </button>
              <Link
                href={`/challenge/${created.id}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.06] py-3.5 text-center text-sm font-semibold text-white transition hover:bg-white/[0.1]"
              >
                <ExternalLink className="h-4 w-4" />
                Open
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Challenge name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Morning grind"
            />
          </div>

          <div>
            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Days per week
            </label>
            <div className="flex gap-2">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysPerWeek(d)}
                  className={`flex h-11 flex-1 items-center justify-center rounded-2xl text-sm font-bold transition ${
                    daysPerWeek === d
                      ? "bg-apple-blue text-white"
                      : "border border-white/[0.1] bg-white/[0.05] text-zinc-400 hover:bg-white/[0.08]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Session duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationMinutes(d)}
                  className={`flex h-12 items-center justify-center rounded-2xl text-sm font-bold transition ${
                    durationMinutes === d
                      ? "bg-apple-blue text-white"
                      : "border border-white/[0.1] bg-white/[0.05] text-zinc-400 hover:bg-white/[0.08]"
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Telegram group ID{" "}
              <span className="normal-case font-normal text-zinc-600">(optional)</span>
            </label>
            <input
              value={telegramGroupId}
              onChange={(e) => setTelegramGroupId(e.target.value)}
              className={`${inputClass} font-mono text-sm`}
              placeholder="-1001234567890"
            />
            <p className="mt-1.5 text-xs text-zinc-600">
              For bot announcements in your squad group.
            </p>
          </div>

          {err && (
            <p className="rounded-2xl border border-apple-red/25 bg-apple-red/[0.1] px-4 py-3 text-sm text-red-200">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-apple-blue py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50 hover:bg-apple-blue-hover"
          >
            {loading ? "Creating…" : "Create & get invite link"}
          </button>
        </form>
      )}
    </div>
  );
}
