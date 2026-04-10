"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, ExternalLink, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import {
  apiCreateChallenge,
  getApiErrorMessage,
  isApiConfigured,
} from "@/lib/api";
import {
  MODALITIES,
  SPLIT_TYPES,
  buildGoalSummary,
  filterExercisesByModality,
  normalizeFocus,
} from "@/data/gym-challenge-catalog";
import type { Challenge, ChallengeFocus, ChallengeKind } from "@/types";

const KIND_OPTIONS: { id: ChallengeKind; label: string; hint: string }[] = [
  {
    id: "attendance",
    label: "General gym habit",
    hint: "Show up & hit session length",
  },
  {
    id: "split_focus",
    label: "Training split",
    hint: "Push, pull, legs…",
  },
  {
    id: "exercise_focus",
    label: "Specific lift / movement",
    hint: "Pick an exercise",
  },
  {
    id: "custom_text",
    label: "Custom",
    hint: "Describe your own rules",
  },
];

function buildLocalChallenge(
  name: string,
  daysPerWeek: number,
  durationMinutes: number,
  userId: string,
  userName: string,
  meta: {
    challengeKind: ChallengeKind;
    focus?: ChallengeFocus;
    goalSummary: string;
  }
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
    challengeKind: meta.challengeKind,
    ...(meta.focus ? { focus: meta.focus } : {}),
    goalSummary: meta.goalSummary,
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

function focusToApiBody(f?: ChallengeFocus): Record<string, string> | undefined {
  if (!f) return undefined;
  const o: Record<string, string> = {};
  if (f.splitId) o.splitId = f.splitId;
  if (f.exerciseId) o.exerciseId = f.exerciseId;
  if (f.modalityId) o.modalityId = f.modalityId;
  if (f.customText) o.customText = f.customText;
  return Object.keys(o).length ? o : undefined;
}

export default function CreateChallengePage() {
  const router = useRouter();
  const { user, hydrated, upsertChallenge } = useAppStore();
  const [name, setName] = useState("Morning grind");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [telegramGroupId, setTelegramGroupId] = useState("");
  const [challengeKind, setChallengeKind] = useState<ChallengeKind>("attendance");
  const [splitId, setSplitId] = useState<string>(SPLIT_TYPES[0].id);
  const [exerciseId, setExerciseId] = useState<string>("");
  const [modalityFilter, setModalityFilter] = useState<string | null>(null);
  const [exerciseQuery, setExerciseQuery] = useState("");
  const [customText, setCustomText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [created, setCreated] = useState<Challenge | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  const filteredExercises = useMemo(() => {
    const byMod = filterExercisesByModality(modalityFilter);
    const q = exerciseQuery.trim().toLowerCase();
    if (!q) return byMod;
    return byMod.filter(
      (e) =>
        e.label.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
    );
  }, [modalityFilter, exerciseQuery]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setErr(null);

    const partial: {
      splitId?: string;
      exerciseId?: string;
      modalityId?: string;
      customText?: string;
    } = {};
    if (challengeKind === "split_focus") partial.splitId = splitId;
    if (challengeKind === "exercise_focus") {
      partial.exerciseId = exerciseId;
      if (modalityFilter) partial.modalityId = modalityFilter;
    }
    if (challengeKind === "custom_text") partial.customText = customText;

    if (challengeKind === "split_focus" && !splitId) {
      setErr("Pick a training split.");
      return;
    }
    if (challengeKind === "exercise_focus" && !exerciseId) {
      setErr("Select an exercise from the list.");
      return;
    }
    if (challengeKind === "custom_text" && !customText.trim()) {
      setErr("Add a short description for your custom challenge.");
      return;
    }

    const focus = normalizeFocus(challengeKind, partial);
    const goalSummary = buildGoalSummary({
      challengeKind,
      daysPerWeek,
      durationMinutes,
      focus,
    });

    const meta = { challengeKind, focus, goalSummary };

    setLoading(true);
    try {
      if (isApiConfigured()) {
        const focusBody = focusToApiBody(focus);
        const ch = await apiCreateChallenge(
          {
            name,
            daysPerWeek,
            durationMinutes,
            telegramGroupId: telegramGroupId.trim() || undefined,
            challengeKind,
            ...(focusBody ? { focus: focusBody } : {}),
            goalSummary,
          },
          user.id
        );
        const merged: Challenge = {
          ...ch,
          goalSummary: ch.goalSummary ?? goalSummary,
          challengeKind: ch.challengeKind ?? challengeKind,
          focus: ch.focus ?? focus,
        };
        upsertChallenge(merged);
        setCreated(merged);
      } else {
        const ch = buildLocalChallenge(
          name,
          daysPerWeek,
          durationMinutes,
          user.id,
          user.name,
          meta
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
    "w-full rounded-2xl border border-pacer-border bg-white px-4 py-3.5 text-base text-pacer-ink placeholder-zinc-400 shadow-sm transition focus:border-pacer-primary/50 focus:ring-2 focus:ring-pacer-primary/15";

  const pillActive =
    "bg-pacer-primary text-white shadow-sm";
  const pillIdle =
    "border border-pacer-border bg-white text-pacer-muted hover:bg-pacer-mist";

  const previewSummary = buildGoalSummary({
    challengeKind,
    daysPerWeek,
    durationMinutes,
    focus: normalizeFocus(challengeKind, {
      splitId,
      exerciseId,
      modalityId: modalityFilter ?? undefined,
      customText,
    }),
  });

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
        <h1 className="font-display text-3xl font-bold tracking-tight text-pacer-ink">
          New Challenge
        </h1>
        <p className="mt-1.5 text-sm text-pacer-muted">
          Set the rules. Share the link. Hold each other accountable.
        </p>
      </div>

      {created ? (
        <div className="space-y-4">
          <div className="rounded-[22px] border border-pacer-mint bg-pacer-mint/70 p-6 text-center shadow-sm backdrop-blur-xl">
            <div className="mb-3 text-4xl">🎉</div>
            <h2 className="font-display text-xl font-bold text-pacer-ink">
              {created.name}
            </h2>
            <p className="mt-1 text-sm text-pacer-muted">
              {created.goalSummary ??
                `${created.daysPerWeek}× / week · ${created.durationMinutes} min sessions`}
            </p>
          </div>

          <div className="rounded-[22px] border border-pacer-border bg-white p-5 shadow-sm backdrop-blur-xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
              Invite link
            </p>
            <p className="break-all rounded-xl bg-pacer-cream px-3 py-2.5 font-mono text-xs text-pacer-ink">
              {inviteUrl}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => void copyLink()}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-pacer-primary py-3.5 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-pacer-primary-hover"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy link"}
              </button>
              <Link
                href={`/challenge/${created.id}`}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-pacer-border bg-pacer-mist py-3.5 text-center text-sm font-semibold text-pacer-ink transition hover:bg-white"
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
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
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
            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
              What kind of challenge?
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {KIND_OPTIONS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => {
                    setChallengeKind(k.id);
                    setErr(null);
                  }}
                  className={`flex flex-col rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    challengeKind === k.id ? pillActive : pillIdle
                  }`}
                >
                  <span>{k.label}</span>
                  <span
                    className={`mt-0.5 text-xs font-normal ${
                      challengeKind === k.id ? "text-white/90" : "text-pacer-muted"
                    }`}
                  >
                    {k.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {challengeKind === "split_focus" && (
            <div>
              <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
                Training split
              </label>
              <div className="flex flex-wrap gap-2">
                {SPLIT_TYPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSplitId(s.id)}
                    className={`rounded-2xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
                      splitId === s.id ? pillActive : pillIdle
                    }`}
                  >
                    {s.label.split("(")[0].trim()}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-pacer-muted">
                {SPLIT_TYPES.find((s) => s.id === splitId)?.label}
              </p>
            </div>
          )}

          {challengeKind === "exercise_focus" && (
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
                  Modality filter
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setModalityFilter(null)}
                    className={`rounded-2xl px-3 py-2 text-xs font-bold transition ${
                      modalityFilter === null ? pillActive : pillIdle
                    }`}
                  >
                    All
                  </button>
                  {MODALITIES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModalityFilter(m.id);
                        setExerciseId("");
                      }}
                      className={`rounded-2xl px-3 py-2 text-xs font-bold transition ${
                        modalityFilter === m.id ? pillActive : pillIdle
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
                  Search exercise
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pacer-muted" />
                  <input
                    type="search"
                    value={exerciseQuery}
                    onChange={(e) => setExerciseQuery(e.target.value)}
                    className={`${inputClass} pl-10`}
                    placeholder="e.g. squat, bench…"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
                  Select exercise
                </label>
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-pacer-border bg-pacer-mist/40 p-1">
                  {filteredExercises.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-pacer-muted">
                      No matches. Try another search or modality.
                    </p>
                  ) : (
                    filteredExercises.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => setExerciseId(ex.id)}
                        className={`flex w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          exerciseId === ex.id
                            ? "bg-pacer-primary font-semibold text-white"
                            : "text-pacer-ink hover:bg-white"
                        }`}
                      >
                        {ex.label}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {challengeKind === "custom_text" && (
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
                Describe your challenge
              </label>
              <textarea
                required
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={3}
                className={`${inputClass} resize-y`}
                placeholder="e.g. 10k steps after every leg day, mobility finisher each session…"
              />
              <p className="mt-1.5 text-xs text-pacer-muted">
                Honor system — the app still tracks gym attendance and session
                length.
              </p>
            </div>
          )}

          <div>
            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
              Days per week
            </label>
            <div className="flex gap-2">
              {DAY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysPerWeek(d)}
                  className={`flex h-11 flex-1 items-center justify-center rounded-2xl text-sm font-bold transition ${
                    daysPerWeek === d ? pillActive : pillIdle
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
              Session duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDurationMinutes(d)}
                  className={`flex h-12 items-center justify-center rounded-2xl text-sm font-bold transition ${
                    durationMinutes === d ? pillActive : pillIdle
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-pacer-border bg-pacer-cream/50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
              Preview
            </p>
            <p className="mt-1 text-sm text-pacer-ink">{previewSummary}</p>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
              Telegram group ID{" "}
              <span className="normal-case font-normal text-pacer-muted">
                (optional)
              </span>
            </label>
            <input
              value={telegramGroupId}
              onChange={(e) => setTelegramGroupId(e.target.value)}
              className={`${inputClass} font-mono text-sm`}
              placeholder="-1001234567890"
            />
            <p className="mt-1.5 text-xs text-pacer-muted">
              For bot announcements in your squad group.
            </p>
          </div>

          {err && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-pacer-primary py-4 text-base font-bold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50 hover:bg-pacer-primary-hover"
          >
            {loading ? "Creating…" : "Create & get invite link"}
          </button>
        </form>
      )}
    </div>
  );
}
