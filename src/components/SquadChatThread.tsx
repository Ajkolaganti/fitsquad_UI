"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, Paperclip, Send, Smile, X } from "lucide-react";
import type { ApiChatMessage } from "@/lib/api-types";
import {
  apiFetchChatMessageDecrypted,
  apiGetChatMessages,
  apiSendChatImage,
  apiSendChatMessage,
  apiSendChatUrl,
  getApiErrorMessage,
} from "@/lib/api";
import { leaveChallengeForUser } from "@/lib/leave-challenge";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/chat-media";
import { SquadChatBubble } from "@/components/SquadChatBubble";
import { markChatRead } from "@/lib/chatReadState";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";

/** Backup refresh if Realtime is unavailable; live updates use Supabase + re-fetch. */
const POLL_MS = 30_000;

function formatBubbleTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatSystemTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** First line `https://…` + optional body → `POST …/send-url`; otherwise plain text send. */
function parseUrlDraft(draft: string): { url: string; text?: string } | null {
  const t = draft.trim();
  if (!t) return null;
  const lines = t.split(/\r?\n/);
  if (lines.length === 1) {
    try {
      const u = new URL(t);
      if (u.protocol === "http:" || u.protocol === "https:") return { url: t };
    } catch {
      return null;
    }
    return null;
  }
  const first = lines[0]!.trim();
  try {
    const u = new URL(first);
    if (u.protocol === "http:" || u.protocol === "https:") {
      const rest = lines.slice(1).join("\n").trim();
      return { url: first, text: rest || undefined };
    }
  } catch {
    return null;
  }
  return null;
}

function mockMessagesForChallenge(challengeId: string): ApiChatMessage[] {
  return MOCK_ACTIVITIES.map((a) => ({
    id: `mock-${a.id}`,
    challengeId,
    userId: null,
    type: "SYSTEM",
    content: a.message,
    mediaUrl: null,
    createdAt: a.createdAt,
    user: null,
  }));
}

const EMOJI_ROWS: string[][] = [
  ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊"],
  ["😍", "🥰", "😘", "😎", "🤩", "🙌", "👏", "💪"],
  ["🔥", "💯", "✨", "⭐", "🎯", "🏋️", "🚴", "🏃"],
  ["❤️", "💙", "💚", "💛", "🙏", "👍", "👎", "✌️"],
  ["😴", "🤔", "😮", "😢", "😭", "🎉", "📸", "☀️"],
];

export interface SquadChatThreadProps {
  challengeId: string;
  challengeName: string;
  currentUserId: string;
  apiMode: boolean;
}

/**
 * Full-height WhatsApp-inspired squad chat (fitsquad: brand greens + header label).
 * Used only under /squads/[challengeId].
 */
export function SquadChatThread({
  challengeId,
  challengeName,
  currentUserId,
  apiMode,
}: SquadChatThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [loading, setLoading] = useState(apiMode);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPanelRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    if (!apiMode) {
      setMessages(mockMessagesForChallenge(challengeId));
      setLoading(false);
      return;
    }
    try {
      const data = await apiGetChatMessages(challengeId, { limit: 80 });
      setMessages(data);
      setErr(null);
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [apiMode, challengeId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!apiMode) return;
    const id = window.setInterval(() => {
      void loadMessages();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [apiMode, loadMessages]);

  /**
   * Realtime only signals new rows; `payload.new.content` is encrypted — fetch decrypted
   * message by `payload.new.id` from the REST API (never render Realtime row fields).
   */
  useEffect(() => {
    if (!apiMode || !hasSupabaseConfig()) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`chat:${challengeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `challengeId=eq.${challengeId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const id = typeof payload.new?.id === "string" ? payload.new.id : null;
          if (!id) {
            void loadMessages();
            return;
          }
          void (async () => {
            try {
              const msg = await apiFetchChatMessageDecrypted(challengeId, id);
              if (msg) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === msg.id)) return prev;
                  const next = [...prev, msg];
                  next.sort(
                    (a, b) =>
                      new Date(a.createdAt).getTime() -
                      new Date(b.createdAt).getTime()
                  );
                  return next;
                });
              } else {
                void loadMessages();
              }
            } catch {
              void loadMessages();
            }
          })();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [apiMode, challengeId, loadMessages]);

  useEffect(() => {
    if (!apiMode) return;
    const onVis = () => {
      if (document.visibilityState === "visible") void loadMessages();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [apiMode, loadMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, pendingImage, emojiOpen]);

  /** Mark thread read for squads-list badges (latest message seen). */
  useEffect(() => {
    if (loading || messages.length === 0) return;
    let latest = messages[0]!;
    let latestT = new Date(latest.createdAt).getTime();
    for (let i = 1; i < messages.length; i++) {
      const m = messages[i]!;
      const t = new Date(m.createdAt).getTime();
      if (t >= latestT) {
        latestT = t;
        latest = m;
      }
    }
    markChatRead(currentUserId, challengeId, latest.createdAt);
  }, [loading, messages, currentUserId, challengeId]);

  useEffect(() => {
    if (!emojiOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (emojiPanelRef.current?.contains(t)) return;
      const btn = (e.target as HTMLElement)?.closest?.("[data-emoji-toggle]");
      if (btn) return;
      setEmojiOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [emojiOpen]);

  const sendPayload = useCallback(
    async (content: string) => {
      if (!apiMode || sending) return;
      setSending(true);
      setErr(null);
      try {
        await apiSendChatMessage(challengeId, {
          userId: currentUserId,
          content,
        });
        setDraft("");
        setPendingImage(null);
        await loadMessages();
      } catch (e: unknown) {
        setErr(getApiErrorMessage(e));
      } finally {
        setSending(false);
      }
    },
    [apiMode, sending, challengeId, currentUserId, loadMessages]
  );

  const sendUrlPayload = useCallback(
    async (url: string, text?: string) => {
      if (!apiMode || sending) return;
      setSending(true);
      setErr(null);
      try {
        await apiSendChatUrl(challengeId, {
          userId: currentUserId,
          url,
          text,
        });
        setDraft("");
        setPendingImage(null);
        await loadMessages();
      } catch (e: unknown) {
        setErr(getApiErrorMessage(e));
      } finally {
        setSending(false);
      }
    },
    [apiMode, sending, challengeId, currentUserId, loadMessages]
  );

  const sendImageFromDataUrl = useCallback(
    async (dataUrl: string, caption: string) => {
      if (!apiMode || sending) return;
      setSending(true);
      setErr(null);
      try {
        const blob = await (await fetch(dataUrl)).blob();
        await apiSendChatImage(challengeId, {
          userId: currentUserId,
          image: blob,
          caption: caption || undefined,
        });
        setDraft("");
        setPendingImage(null);
        await loadMessages();
      } catch (e: unknown) {
        setErr(getApiErrorMessage(e));
      } finally {
        setSending(false);
      }
    },
    [apiMode, sending, challengeId, currentUserId, loadMessages]
  );

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!apiMode || sending) return;
    const text = draft.trim();
    if (pendingImage) {
      await sendImageFromDataUrl(pendingImage, text);
      return;
    }
    if (!text) return;
    const urlSend = parseUrlDraft(draft);
    if (urlSend) {
      await sendUrlPayload(urlSend.url, urlSend.text);
      return;
    }
    await sendPayload(text);
  }

  function appendEmoji(ch: string) {
    setDraft((d) => d + ch);
    setEmojiOpen(false);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const dataUrl = await compressImageFile(file);
      setPendingImage(dataUrl);
      setErr(null);
    } catch (er: unknown) {
      setErr(er instanceof Error ? er.message : "Could not add image");
    }
  }

  async function onConfirmLeaveSquad() {
    setLeaveBusy(true);
    setErr(null);
    try {
      await leaveChallengeForUser(challengeId, currentUserId);
      router.replace("/squads");
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLeaveBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0b6e4f]">
      {/* WhatsApp-style top bar — fitsquad tweak: mint accent strip */}
      <header className="shrink-0 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-center gap-3 pb-2">
          <Link
            href="/squads"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Back to squads"
          >
            <ArrowLeft className="h-6 w-6" strokeWidth={2} />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-semibold">
              {challengeName.trim().charAt(0).toUpperCase() || "S"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-[17px] font-semibold leading-tight">
                {challengeName}
              </h1>
              <p className="truncate text-[12px] text-white/85">
                fitsquad · squad chat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setLeaveOpen((o) => !o);
              setErr(null);
            }}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-white/95 hover:bg-white/10"
            aria-expanded={leaveOpen}
            aria-label={leaveOpen ? "Close leave options" : "Leave squad"}
          >
            <LogOut className="h-5 w-5" />
            <span className="max-w-[4.5rem] truncate text-left">Leave</span>
          </button>
        </div>
        {leaveOpen ? (
          <div className="border-t border-white/15 pb-3 pt-3">
            <p className="text-[13px] leading-snug text-white/90">
              Leave this squad? You can rejoin with an invite link if someone
              shares one.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={leaveBusy}
                onClick={() => setLeaveOpen(false)}
                className="flex-1 rounded-xl bg-white/15 py-2.5 text-[13px] font-semibold text-white hover:bg-white/25 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={leaveBusy}
                onClick={() => void onConfirmLeaveSquad()}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-[13px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                {leaveBusy ? "Leaving…" : "Leave squad"}
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {/* Chat body — classic WA wallpaper + bubbles */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[20px] bg-[#e7e1d6] shadow-[0_-4px_24px_rgba(0,0,0,0.12)]">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.35]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23000' fill-opacity='0.04'%3E%3Cpath d='M0 0h40v40H0zm40 40h40v40H40z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
          aria-hidden
        />

        {err && (
          <p className="relative z-10 border-b border-black/5 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
            {err}
          </p>
        )}

        <ul
          ref={listRef}
          className="relative z-[1] min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3 sm:px-3"
          aria-live="polite"
        >
          {loading ? (
            <li className="py-16 text-center text-[13px] text-pacer-muted">
              Loading…
            </li>
          ) : messages.length === 0 ? (
            <li className="py-16 text-center">
              <p className="text-3xl opacity-90">💬</p>
              <p className="mt-2 text-[13px] text-pacer-muted">
                No messages yet. Say hi to the squad.
              </p>
            </li>
          ) : (
            messages.map((m) => (
              <SquadChatBubble
                key={m.id}
                message={m}
                currentUserId={currentUserId}
                formatBubbleTime={formatBubbleTime}
                formatSystemTime={formatSystemTime}
              />
            ))
          )}
        </ul>

        <form
          onSubmit={(e) => void onSend(e)}
          className="relative z-[2] border-t border-black/10 bg-[#f0f0f0] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => void onPickImage(e)}
          />

          {pendingImage && (
            <div className="relative mb-2 inline-block rounded-lg border border-pacer-border bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingImage}
                alt="Attachment preview"
                className="h-24 max-w-[200px] rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => setPendingImage(null)}
                className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-pacer-ink shadow-md ring-1 ring-pacer-border"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="mt-1 px-1 text-[10px] text-pacer-muted">
                Add a caption below, then send
              </p>
            </div>
          )}

          <div className="flex items-end gap-1.5">
            <div className="relative flex min-h-[44px] flex-1 items-end rounded-3xl border border-black/10 bg-white px-1 py-1 shadow-sm">
              <button
                type="button"
                data-emoji-toggle
                onClick={() => setEmojiOpen((o) => !o)}
                disabled={!apiMode || sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-pacer-muted transition hover:bg-pacer-mist hover:text-pacer-ink disabled:opacity-40"
                aria-label="Emoji"
              >
                <Smile className="h-[22px] w-[22px]" />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!apiMode || sending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-pacer-muted transition hover:bg-pacer-mist hover:text-pacer-ink disabled:opacity-40"
                aria-label="Attach image"
              >
                <Paperclip className="h-[20px] w-[20px]" />
              </button>
              <label htmlFor="squad-thread-input" className="sr-only">
                Message
              </label>
              <input
                id="squad-thread-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={
                  apiMode
                    ? pendingImage
                      ? "Caption (optional)…"
                      : "Message"
                    : "API required to send"
                }
                disabled={!apiMode || sending}
                className="max-h-32 min-h-[40px] flex-1 bg-transparent px-2 py-2 text-[15px] text-pacer-ink placeholder:text-pacer-muted disabled:opacity-50"
                autoComplete="off"
                maxLength={4000}
              />
              {emojiOpen && (
                <div
                  ref={emojiPanelRef}
                  className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-52 overflow-y-auto rounded-xl border border-pacer-border bg-white p-2 shadow-xl"
                >
                  <div className="space-y-2">
                    {EMOJI_ROWS.map((row, ri) => (
                      <div
                        key={ri}
                        className="flex flex-wrap justify-center gap-1.5"
                      >
                        {row.map((em) => (
                          <button
                            key={em}
                            type="button"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-pacer-mint"
                            onClick={() => appendEmoji(em)}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={
                !apiMode || sending || (!draft.trim() && !pendingImage)
              }
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0d9f6e] text-white shadow-md transition hover:bg-pacer-primary-hover disabled:cursor-not-allowed disabled:bg-pacer-border disabled:text-pacer-muted"
              aria-label="Send message"
            >
              <Send className="ml-0.5 h-[18px] w-[18px]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
