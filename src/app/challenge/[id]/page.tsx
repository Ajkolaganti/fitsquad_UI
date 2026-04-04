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
import { ArrowLeft, Copy, Flame, Users } from "lucide-react";
import { Leaderboard } from "@/components/Leaderboard";
import { ChallengeChat } from "@/components/ChallengeChat";
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
import { getMockChallenge } from "@/lib/mock-data";
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

  const challenge = useAppStore((s) =>
    s.challenges.find((c) => c.id === id)
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCompletedToday(sessionStorage.getItem(storageCompleteKey(id)) === "1");
  }, [id]);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

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
    isInside:
      useMockTimer && location.isWithinGym && !completedToday,
    requiredMinutes: challenge?.durationMinutes ?? 40,
    onGoalReached,
  });

  const gymStatus: GymStatus = completedToday
    ? "completed_today"
    : location.isWithinGym
      ? "at_gym"
      : "not_at_gym";

  const goalSecs = (challenge?.durationMinutes ?? 40) * 60;

  const displaySeconds = useMemo(() => {
    if (completedToday) return goalSecs;
    if (apiMode && serverElapsedMinutes != null) {
      return Math.min(Math.floor(serverElapsedMinutes * 60), goalSecs);
    }
    if (useMockTimer) {
      return timer.isComplete
        ? Math.min(timer.elapsedSeconds, goalSecs)
        : timer.elapsedSeconds;
    }
    return serverElapsedMinutes != null
      ? Math.min(Math.floor(serverElapsedMinutes * 60), goalSecs)
      : 0;
  }, [
    completedToday,
    goalSecs,
    apiMode,
    serverElapsedMinutes,
    useMockTimer,
    timer.isComplete,
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

  const inviteUrl =
    typeof window !== "undefined" && challenge?.inviteCode
      ? `${window.location.origin}/join?code=${challenge.inviteCode}`
      : "";

  async function copyInviteLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
      </div>
    );
  }

  if (loadErr || !challenge) {
    return (
      <div className="px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-400"
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
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Challenge header */}
      <div className="mb-6 overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
        <div className="h-1 w-full bg-gradient-to-r from-apple-blue to-apple-purple" />
        <div className="p-5">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            {challenge.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {challenge.daysPerWeek}× / week · {challenge.durationMinutes} min goal
          </p>

          {prog && (
            <div className="mt-4 flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-300">
                <Flame className="h-3.5 w-3.5 text-apple-orange" />
                {prog.streak} day streak
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-zinc-300">
                <Users className="h-3.5 w-3.5 text-apple-blue" />
                {challenge.participants.length} in squad
              </span>
            </div>
          )}

          {prog && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-zinc-500">This week</span>
                <span className="font-semibold text-zinc-300">
                  {prog.completedDaysThisWeek}/{prog.weeklyGoal} days
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-apple-blue to-apple-purple transition-all duration-700"
                  style={{
                    width: `${Math.round((prog.completedDaysThisWeek / prog.weeklyGoal) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {challenge.inviteCode && inviteUrl ? (
        <div className="mb-5 rounded-[22px] border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Invite link
          </p>
          <p className="break-all rounded-xl bg-black/40 px-3 py-2.5 font-mono text-xs text-zinc-300">
            {inviteUrl}
          </p>
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-apple-green py-3.5 text-sm font-semibold text-black transition active:scale-[0.99] hover:opacity-90"
          >
            <Copy className="h-4 w-4" />
            {inviteCopied ? "Copied!" : "Copy link"}
          </button>
          <p className="mt-3 text-center text-xs text-zinc-500">
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

      {/* Leaderboard */}
      <div className="mb-5">
        <Leaderboard
          participants={leaderboardData}
          currentUserId={user.id}
        />
      </div>

      {/* Squad chat (HTTP + polling — no third-party realtime) */}
      <ChallengeChat
        challengeId={challenge.id}
        currentUserId={user.id}
        apiMode={apiMode}
      />
    </div>
  );
}
