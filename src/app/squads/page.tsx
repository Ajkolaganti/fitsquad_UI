"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ApiChatMessage } from "@/lib/api-types";
import { apiGetChallenge, apiGetChatMessages, isApiConfigured } from "@/lib/api";
import {
  countUnreadMessages,
  getLastReadCreatedAt,
} from "@/lib/chatReadState";
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
  if (m.type === "SYSTEM") {
    return typeof m.content === "string" ? m.content : "";
  }
  if (m.type === "IMAGE") {
    const cap =
      typeof m.content === "string" && m.content.trim()
        ? m.content.trim()
        : "";
    const t = cap ? `📷 ${cap}` : "📷 Photo";
    return m.user?.name ? `${m.user.name}: ${t}` : t;
  }
  if (m.type === "URL") {
    const c = m.content;
    const text =
      typeof c === "object" && c && "text" in c && c.text
        ? String(c.text)
        : "";
    const url =
      typeof c === "object" && c && "url" in c ? String(c.url) : "";
    const label = text || url || "Link";
    const t = `🔗 ${label}`;
    return m.user?.name ? `${m.user.name}: ${t}` : t;
  }
  const raw = typeof m.content === "string" ? m.content : "";
  const p = parseChatContent(raw);
  if (p.kind === "image") {
    const t = p.caption ? `📷 ${p.caption}` : "📷 Photo";
    return m.user?.name ? `${m.user.name}: ${t}` : t;
  }
  const prefix = m.user?.name ? `${m.user.name}: ` : "";
  return `${prefix}${p.text}`;
}

type SquadPreview = { text: string; time: string; unread: number };

export default function SquadsPage() {
  const router = useRouter();
  const { user, hydrated, challenges } = useAppStore();
  const challengeCount = challenges.length;
  const [previews, setPreviews] = useState<Record<string, SquadPreview>>({});
  const [listRefresh, setListRefresh] = useState(0);

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
    const bump = () => setListRefresh((n) => n + 1);
    window.addEventListener("fitsquad-chat-read", bump);
    window.addEventListener("focus", bump);
    return () => {
      window.removeEventListener("fitsquad-chat-read", bump);
      window.removeEventListener("focus", bump);
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !user || !isApiConfigured()) return;
    const id = window.setInterval(() => {
      setListRefresh((n) => n + 1);
    }, 45_000);
    return () => clearInterval(id);
  }, [hydrated, user]);

  useEffect(() => {
    if (!user || challenges.length === 0) return;

    if (!isApiConfigured()) {
      const sorted = [...MOCK_ACTIVITIES].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const lastAct = sorted[sorted.length - 1];
      const demo = lastAct?.message ?? "Open squad chat";
      const demoTime = lastAct ? formatListTime(lastAct.createdAt) : "";
      const mockMsgs: { createdAt: string }[] = sorted.map((a) => ({
        createdAt: a.createdAt,
      }));
      const next: Record<string, SquadPreview> = {};
      for (const c of challenges) {
        const lastRead = getLastReadCreatedAt(user.id, c.id);
        const unread = Math.min(99, countUnreadMessages(mockMsgs, lastRead));
        next[c.id] = {
          text: demo,
          time: demoTime,
          unread,
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
            const lastRead = getLastReadCreatedAt(user.id, c.id);
            const msgs1 = await apiGetChatMessages(c.id, { limit: 1 });
            const last =
              msgs1.length > 0 ? msgs1[msgs1.length - 1]! : null;
            if (!last) {
              return [
                c.id,
                { text: "No messages yet", time: "", unread: 0 },
              ] as const;
            }
            const previewText = previewFromMessage(last).slice(0, 72);
            const time = formatListTime(last.createdAt);
            const lastT = new Date(last.createdAt).getTime();
            const readT = lastRead ? new Date(lastRead).getTime() : NaN;
            if (lastRead && Number.isFinite(readT) && lastT <= readT) {
              return [c.id, { text: previewText, time, unread: 0 }] as const;
            }
            const batch = await apiGetChatMessages(c.id, { limit: 80 });
            const unread = Math.min(99, countUnreadMessages(batch, lastRead));
            return [c.id, { text: previewText, time, unread }] as const;
          } catch {
            return [
              c.id,
              { text: "Tap to open chat", time: "", unread: 0 },
            ] as const;
          }
        })
      );
      if (cancelled) return;
      setPreviews(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [challenges, user, listRefresh]);

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

  const totalUnread = challenges.reduce(
    (sum, c) => sum + (previews[c.id]?.unread ?? 0),
    0
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#e7e1d6]">
      {/* WhatsApp-style app bar — fitsquad accent */}
      <header className="shrink-0 bg-[#0b6e4f] px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-white shadow-md">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-[22px] font-semibold tracking-tight">
            Squads
          </h1>
          {totalUnread > 0 ? (
            <span
              className="flex min-w-[22px] items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-[12px] font-bold leading-none text-[#0b6e4f]"
              aria-label={`${totalUnread} unread messages across squads`}
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          ) : null}
        </div>
        <p className="text-[13px] text-white/85">fitsquad · your challenge chats</p>
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
            const unread = pv?.unread ?? 0;
            const hasUnread = unread > 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/squads/${c.id}`}
                  aria-label={
                    hasUnread
                      ? `${c.name}, ${unread} unread`
                      : `${c.name}, open chat`
                  }
                  className="flex items-center gap-3 px-3 py-3.5 transition hover:bg-pacer-mist/60 active:bg-pacer-mint/40"
                >
                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#dfe9e3] font-display text-lg font-bold text-[#0b6e4f]">
                    {c.name.trim().charAt(0).toUpperCase() || "S"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`truncate font-display text-[16px] text-pacer-ink ${
                          hasUnread ? "font-bold" : "font-semibold"
                        }`}
                      >
                        {c.name}
                      </p>
                      {pv?.time ? (
                        <span
                          className={`shrink-0 text-[11px] ${
                            hasUnread
                              ? "font-semibold text-[#0d9f6e]"
                              : "text-[#667781]"
                          }`}
                        >
                          {pv.time}
                        </span>
                      ) : null}
                    </div>
                    <p
                      className={`mt-0.5 line-clamp-2 text-[14px] leading-snug ${
                        hasUnread
                          ? "font-medium text-pacer-ink"
                          : "text-[#667781]"
                      }`}
                    >
                      {pv?.text ?? "…"}
                    </p>
                  </div>
                  {hasUnread ? (
                    <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[12px] font-bold leading-none text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-[#c4c4c4]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
