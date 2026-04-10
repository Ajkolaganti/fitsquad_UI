"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Flame, LogOut, Users } from "lucide-react";
import { ChallengeGymFeed } from "@/components/ChallengeGymFeed";
import { LocationTracker } from "@/components/LocationTracker";
import { Timer } from "@/components/Timer";
import { useLocation } from "@/hooks/useLocation";
import { useGymSessionTimer } from "@/hooks/useGymSessionTimer";
import { useAppStore } from "@/store/useAppStore";
import {
  apiGetChallenge,
  apiGetLeaderboard,
  apiPostCheckin,
  apiPostLocation,
  getApiErrorMessage,
  isApiConfigured,
} from "@/lib/api";
import {
  checkinIndicatesCompletedToday,
  checkinIndicatesNotAtGym,
  checkinIndicatesSessionCompleted,
} from "@/lib/checkin-ui";
import {
  buildInviteJoinUrl,
  buildInviteScheduleDetail,
  buildInviteShareMessage,
} from "@/lib/invite-share";
import { leaveChallengeForUser } from "@/lib/leave-challenge";
import { getMockChallenge } from "@/lib/mock-data";
import { getSafeInternalNextPath } from "@/lib/safe-next-path";
import type { GymStatus, Participant } from "@/types";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function storageCompleteKey(challengeId: string) {
  return `firsquad_done_${challengeId}_${todayKey()}`;
}

export default function ChallengeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { user, hydrated, upsertChallenge, setUser } = useAppStore();
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [completedToday, setCompletedToday] = useState(false);
  const [leaderboardRows, setLeaderboardRows] = useState<Participant[]>([]);
  const [serverElapsedMinutes, setServerElapsedMinutes] = useState<
    number | null
  >(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [leaveUi, setLeaveUi] = useState<"idle" | "confirm">("idle");
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveErr, setLeaveErr] = useState<string | null>(null);

  const challenge = useAppStore((s) =>
    s.challenges.find((c) => c.id === id)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCompletedToday(sessionStorage.getItem(storageCompleteKey(id)) === "1");
  }, [id]);

  useEffect(() => {
    if (!hydrated || user) return;
    const path = `/challenge/${id}`;
    const next = getSafeInternalNextPath(path);
    router.replace(
      next ? `/login?next=${encodeURIComponent(next)}` : "/login"
    );
  }, [hydrated, user, router, id]);

  useEffect(() => {
    if (!hydrated || !user) return;
    let cancelled = false;
    (async () => {
      if (!isApiConfigured()) {
        const mock = getMockChallenge(id);
        if (mock) upsertChallenge(mock);
        else if (!cancelled) setLoadErr("Challenge not found.");
        return;
      }
      try {
        const [ch, board] = await Promise.all([
          apiGetChallenge(id, user.id),
          apiGetLeaderboard(id),
        ]);
        if (!cancelled) {
          upsertChallenge(ch);
          setLeaderboardRows(board);
        }
      } catch (e: unknown) {
        if (!cancelled) setLoadErr(getApiErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user, id, upsertChallenge]);

  const gym =
    user?.gymLat != null && user?.gymLng != null
      ? { lat: user.gymLat, lng: user.gymLng }
      : null;

  const location = useLocation({ gym });

  const apiMode = isApiConfigured();
  const useMockTimer = !apiMode;

  const coordsRef = useRef(location.coords);
  coordsRef.current = location.coords;

  const runCheckin = useCallback(async () => {
    if (!user || !challenge || !apiMode) return;
    const coords = coordsRef.current;
    if (!coords) return;
    try {
      const res = await apiPostCheckin({
        userId: user.id,
        challengeId: challenge.id,
        lat: coords.lat,
        lng: coords.lng,
      });
      if (res.elapsedMinutes != null) {
        setServerElapsedMinutes(res.elapsedMinutes);
      }
      if (
        checkinIndicatesCompletedToday(res.message) ||
        checkinIndicatesSessionCompleted(res.message)
      ) {
        setCompletedToday(true);
        sessionStorage.setItem(storageCompleteKey(id), "1");
      }
      if (checkinIndicatesNotAtGym(res.message, res.inside)) {
        setServerElapsedMinutes(null);
      }
    } catch {
      /* transient errors — next poll retries */
    }
  }, [user, challenge, apiMode, id]);

  useEffect(() => {
    if (!apiMode || !user || !challenge) return;
    const t = setInterval(runCheckin, 5 * 60 * 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiMode, user?.id, challenge?.id, runCheckin]);

  useEffect(() => {
    if (!apiMode || !user || !challenge || !location.coords) return;
    const debounce = setTimeout(() => {
      void runCheckin();
    }, 4000);
    return () => clearTimeout(debounce);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apiMode,
    location.coords?.lat,
    location.coords?.lng,
    user?.id,
    challenge?.id,
    runCheckin,
  ]);

  const onGoalReached = useCallback(() => {
    setCompletedToday(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageCompleteKey(id), "1");
    }
  }, [id]);

  const timer = useGymSessionTimer({
    isInside: location.isWithinGym && !completedToday,
    requiredMinutes: challenge?.durationMinutes ?? 40,
    /** In API mode completion comes from check-in / server; local timer is display-only. */
    onGoalReached: useMockTimer ? onGoalReached : undefined,
  });

  const gymStatus: GymStatus = completedToday
    ? "completed_today"
    : location.isWithinGym
      ? "at_gym"
      : "not_at_gym";

  const goalSecs = (challenge?.durationMinutes ?? 40) * 60;

  const displaySeconds = useMemo(() => {
    if (completedToday) return goalSecs;
    const serverSecs =
      serverElapsedMinutes != null
        ? Math.min(Math.floor(serverElapsedMinutes * 60), goalSecs)
        : 0;
    const localSecs = Math.min(timer.elapsedSeconds, goalSecs);
    return Math.min(goalSecs, Math.max(serverSecs, localSecs));
  }, [
    completedToday,
    goalSecs,
    serverElapsedMinutes,
    timer.elapsedSeconds,
  ]);

  const m = Math.floor(displaySeconds / 60);
  const s = displaySeconds % 60;
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;

  const saveGymHere = async () => {
    if (!location.coords || !user) return;
    if (apiMode) {
      try {
        const u = await apiPostLocation({
          userId: user.id,
          lat: location.coords.lat,
          lng: location.coords.lng,
        });
        setUser({ ...user, ...u });
      } catch (e: unknown) {
        setLoadErr(getApiErrorMessage(e));
      }
    } else {
      useAppStore.getState().setGymLocation(
        location.coords.lat,
        location.coords.lng
      );
    }
  };

  const leaderboardData =
    leaderboardRows.length > 0
      ? leaderboardRows
      : challenge?.participants ?? [];

  const { inviteUrl, inviteShareText } = useMemo(() => {
    if (typeof window === "undefined" || !challenge?.inviteCode || !user) {
      return { inviteUrl: "", inviteShareText: "" };
    }
    const detail = buildInviteScheduleDetail(challenge);
    const url = buildInviteJoinUrl(window.location.origin, challenge.inviteCode, {
      challengeName: challenge.name,
      inviterName: user.name,
      detail,
    });
    return {
      inviteUrl: url,
      inviteShareText: buildInviteShareMessage({
        inviteUrl: url,
        challengeName: challenge.name,
        inviterName: user.name,
        detail,
      }),
    };
  }, [challenge, user]);

  async function copyInviteLink() {
    if (!inviteShareText) return;
    await navigator.clipboard.writeText(inviteShareText);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  async function onConfirmLeave() {
    if (!user || !challenge) return;
    setLeaveErr(null);
    setLeaveBusy(true);
    try {
      await leaveChallengeForUser(challenge.id, user.id);
      router.replace("/challenges");
    } catch (e: unknown) {
      setLeaveErr(getApiErrorMessage(e));
    } finally {
      setLeaveBusy(false);
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
      </div>
    );
  }

  if (loadErr || !challenge) {
    return (
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-pacer-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <p className="text-apple-red">{loadErr || "Loading…"}</p>
      </div>
    );
  }

  const prog = challenge.myProgress;

  return (
    <div className="px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-pacer-muted transition hover:text-pacer-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Challenge header */}
      <div className="mb-6 overflow-hidden rounded-[22px] border border-pacer-border bg-white shadow-glass-sm backdrop-blur-xl">
        <div className="h-1 w-full bg-gradient-to-r from-pacer-primary to-teal-400" />
        <div className="p-5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-pacer-ink">
            {challenge.name}
          </h1>
          <p className="mt-1 text-sm text-pacer-muted">
            {challenge.goalSummary ??
              `${challenge.daysPerWeek}× / week · ${challenge.durationMinutes} min goal`}
          </p>

          {prog && (
            <div className="mt-4 flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-pacer-cream px-3 py-1.5 text-xs font-semibold text-pacer-ink">
                <Flame className="h-3.5 w-3.5 text-ember-500" />
                {prog.streak} day streak
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-pacer-cream px-3 py-1.5 text-xs font-semibold text-pacer-ink">
                <Users className="h-3.5 w-3.5 text-pacer-primary" />
                {challenge.participants.length} in squad
              </span>
            </div>
          )}

          {prog && (
            <div className="mt-4 rounded-xl border border-pacer-border/80 bg-pacer-cream/50 px-4 py-3">
              <p className="text-xs font-medium text-pacer-muted">
                Your totals in this squad
              </p>
              <p className="mt-1 text-sm font-semibold text-pacer-ink">
                <span className="tabular-nums">{prog.completedDaysTotal}</span> gym
                days logged · target{" "}
                <span className="tabular-nums">{prog.weeklyGoal}</span>× / week
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-pacer-muted">
                Streak is per this challenge and comes from the server (usually
                consecutive days with a completed session).
              </p>
            </div>
          )}
        </div>
      </div>

      {challenge.inviteCode && inviteUrl ? (
        <div className="mb-5 rounded-[22px] border border-pacer-border bg-white p-5 shadow-sm backdrop-blur-xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-pacer-muted">
            Invite message
          </p>
          <p className="whitespace-pre-wrap rounded-xl bg-pacer-cream px-3 py-2.5 text-sm leading-relaxed text-pacer-ink">
            {inviteShareText}
          </p>
          <p className="mt-2 break-all text-[11px] text-pacer-muted">
            Link only:{" "}
            <span className="font-mono text-pacer-ink">{inviteUrl}</span>
          </p>
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-pacer-primary py-3.5 text-sm font-semibold text-white transition active:scale-[0.99] hover:bg-pacer-primary-hover"
          >
            <Copy className="h-4 w-4" />
            {inviteCopied ? "Copied!" : "Copy invite"}
          </button>
          <p className="mt-3 text-center text-xs text-pacer-muted">
            Share this link anytime so friends can join this challenge.
          </p>
        </div>
      ) : null}

      {/* Timer */}
      <div className="mb-5">
        <Timer
          status={gymStatus}
          formattedTime={formatted}
          requiredMinutes={challenge.durationMinutes}
          goalReached={completedToday || (useMockTimer && timer.isComplete)}
          elapsedSeconds={displaySeconds}
        />
      </div>

      {/* Location */}
      <div className="mb-5">
        <LocationTracker
          gym={gym}
          location={location}
          canSaveGym={Boolean(location.coords && !gym)}
          onSaveGymHere={() => void saveGymHere()}
        />
      </div>

      {/* Gym activity — who trained today & session context (squad chat lives under Squads) */}
      <div className="mb-5">
        <ChallengeGymFeed
          participants={leaderboardData}
          goalMinutes={challenge.durationMinutes}
          weeklyDayTarget={challenge.daysPerWeek}
          currentUserId={user.id}
          myGym={{
            minutesToday:
              displaySeconds > 0
                ? Math.max(1, Math.round(displaySeconds / 60))
                : null,
            status:
              gymStatus === "at_gym"
                ? "at_gym"
                : gymStatus === "completed_today"
                  ? "completed_today"
                  : "not_at_gym",
          }}
        />
        <p className="mt-3 text-center text-[13px] text-pacer-muted">
          Squad chat is in the{" "}
          <Link
            href={`/squads/${challenge.id}`}
            className="font-semibold text-pacer-primary underline-offset-2 hover:underline"
          >
            Squads
          </Link>{" "}
          tab.
        </p>
      </div>

      <div className="rounded-[22px] border border-pacer-border bg-white p-5 shadow-sm backdrop-blur-xl">
        {leaveUi === "idle" ? (
          <button
            type="button"
            onClick={() => {
              setLeaveErr(null);
              setLeaveUi("confirm");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50/80 py-3.5 text-sm font-semibold text-red-800 transition hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            Leave squad
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-center text-sm text-pacer-ink">
              Leave &quot;{challenge.name}&quot;? You won&apos;t see this squad in
              your list until you join again with an invite code.
            </p>
            {leaveErr ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-800">
                {leaveErr}
              </p>
            ) : null}
            <div className="flex gap-3">
              <button
                type="button"
                disabled={leaveBusy}
                onClick={() => {
                  setLeaveUi("idle");
                  setLeaveErr(null);
                }}
                className="flex-1 rounded-2xl border border-pacer-border bg-pacer-mist py-3.5 text-sm font-semibold text-pacer-ink transition hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={leaveBusy}
                onClick={() => void onConfirmLeave()}
                className="flex-1 rounded-2xl bg-red-600 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {leaveBusy ? "Leaving…" : "Leave"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
