"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SquadChatThread } from "@/components/SquadChatThread";
import {
  apiGetChallenge,
  getApiErrorMessage,
  isApiConfigured,
} from "@/lib/api";
import { getMockChallenge } from "@/lib/mock-data";
import { useAppStore } from "@/store/useAppStore";

export default function SquadChatPage() {
  const params = useParams();
  const challengeId = params.challengeId as string;
  const router = useRouter();
  const { user, hydrated, upsertChallenge } = useAppStore();
  const challenge = useAppStore((s) =>
    s.challenges.find((c) => c.id === challengeId)
  );
  const [err, setErr] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  useEffect(() => {
    if (challenge) {
      setErr(null);
      setResolved(true);
    }
  }, [challenge]);

  useEffect(() => {
    if (!hydrated || !user || !challengeId) return;
    if (challenge) return;
    let cancelled = false;
    void (async () => {
      try {
        if (isApiConfigured()) {
          const ch = await apiGetChallenge(challengeId, user.id);
          if (!cancelled) {
            upsertChallenge(ch);
            setErr(null);
          }
        } else {
          const mock = getMockChallenge(challengeId);
          if (mock && !cancelled) {
            upsertChallenge(mock);
            setErr(null);
          } else if (!cancelled) {
            setErr("Challenge not found.");
          }
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(getApiErrorMessage(e));
      } finally {
        if (!cancelled) setResolved(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, user, challengeId, challenge, upsertChallenge]);

  if (!hydrated || !user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b6e4f]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (challenge) {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden">
        <SquadChatThread
          challengeId={challenge.id}
          challengeName={challenge.name}
          currentUserId={user.id}
          apiMode={isApiConfigured()}
        />
      </div>
    );
  }

  if (!resolved) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b6e4f]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mesh-bg min-h-[100dvh] px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Link
        href="/squads"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-pacer-muted"
      >
        <ArrowLeft className="h-4 w-4" />
        Squads
      </Link>
      <p className="text-apple-red">
        {err || "Challenge not found or you’re not in this squad."}
      </p>
    </div>
  );
}
