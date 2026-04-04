"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ApiChatMessage } from "@/lib/api-types";
import { apiGetChallenge, apiGetChatMessages, isApiConfigured } from "@/lib/api";
import { parseChatContent } from "@/lib/chat-media";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";
import { useAppStore } from "@/store/useAppStore";

function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  ) {
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function previewFromMessage(m: ApiChatMessage): string {
  if (m.type === "SYSTEM") return m.content;
  const p = parseChatContent(m.content);
  if (p.kind === "image") {
    const t = p.caption ? `📷 ${p.caption}` : "📷 Photo";
    return m.user?.name ? `${m.user.name}: ${t}` : t;
  }
  const prefix = m.user?.name ? `${m.user.name}: ` : "";
  return `${prefix}${p.text}`;
}

export default function SquadsPage() {
  const router = useRouter();
  const { user, hydrated, challenges } = useAppStore();
  const challengeCount = challenges.length;
  const [previews, setPreviews] = useState<
    Record<string, { text: string; time: string }>
  >({});

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
        .filter(
          (
            r
          ): r is PromiseFulfilledResult<Awaited<ReturnType<typeof apiGetChallenge>>> =>
            r.status === "fulfilled"
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

  useEffect(() => {
    if (!user || challenges.length === 0) return;

    if (!isApiConfigured()) {
      const demo = MOCK_ACTIVITIES[0]?.message ?? "Open squad chat";
      const next: Record<string, { text: string; time: string }> = {};
      for (const c of challenges) {
        next[c.id] = {
          text: demo,
          time: MOCK_ACTIVITIES[0]
            ? formatListTime(MOCK_ACTIVITIES[0].createdAt)
            : "",
        };
      }
      setPreviews(next);
      return;
    }

    let cancelled = false;
    void (async () => {
      const entries = await Promise.all(
        challenges.map(async (c) => {
          try {
            const msgs = await apiGetChatMessages(c.id, { limit: 1 });
            const last = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            if (!last) {
              return [c.id, { text: "No messages yet", time: "" }] as const;
            }
            return [
              c.id,
              {
                text: previewFromMessage(last).slice(0, 72),
                time: formatListTime(last.createdAt),
              },
            ] as const;
          } catch {
            return [c.id, { text: "Tap to open chat", time: "" }] as const;
          }
        })
      );
      if (cancelled) return;
      setPreviews(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#e7e1d6]">
      {/* WhatsApp-style app bar — FirSquad accent */}
      <header className="shrink-0 bg-[#0b6e4f] px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-md">
        <h1 className="font-display text-[22px] font-semibold tracking-tight">
          Squads
        </h1>
        <p className="text-[13px] text-white/85">FirSquad · your challenge chats</p>
      </header>

      {challenges.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <p className="font-display text-lg font-semibold text-pacer-ink">
            No squads yet
          </p>
          <p className="mt-2 text-sm text-pacer-muted">
            Join or create a challenge to start a squad chat
          </p>
          <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
            <Link
              href="/start"
              className="rounded-2xl bg-[#0d9f6e] px-6 py-3.5 text-sm font-semibold text-white shadow-md"
            >
              Start a challenge
            </Link>
          </div>
        </div>
      ) : (
        <ul
          className="flex-1 divide-y divide-black/6 overflow-y-auto bg-white"
          aria-label="Squad chats"
        >
          {challenges.map((c) => {
            const pv = previews[c.id];
            return (
              <li key={c.id}>
                <Link
                  href={`/squads/${c.id}`}
                  className="flex items-center gap-3 px-3 py-3.5 transition hover:bg-pacer-mist/60 active:bg-pacer-mint/40"
                >
                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#dfe9e3] font-display text-lg font-bold text-[#0b6e4f]">
                    {c.name.trim().charAt(0).toUpperCase() || "S"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-display text-[16px] font-semibold text-pacer-ink">
                        {c.name}
                      </p>
                      {pv?.time ? (
                        <span className="shrink-0 text-[11px] text-[#667781]">
                          {pv.time}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-[#667781]">
                      {pv?.text ?? "…"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-[#c4c4c4]" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
