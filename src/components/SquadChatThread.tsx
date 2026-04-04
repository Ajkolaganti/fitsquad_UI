"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { ArrowLeft, Paperclip, Send, Smile, X } from "lucide-react";
import type { ApiChatMessage } from "@/lib/api-types";
import {
  apiGetChatMessages,
  apiSendChatMessage,
  getApiErrorMessage,
} from "@/lib/api";
import {
  buildImageMessage,
  compressImageFile,
  parseChatContent,
} from "@/lib/chat-media";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";

const POLL_MS = 8000;

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

function mockMessagesForChallenge(challengeId: string): ApiChatMessage[] {
  return MOCK_ACTIVITIES.map((a) => ({
    id: `mock-${a.id}`,
    challengeId,
    userId: null,
    type: "SYSTEM",
    content: a.message,
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
 * Full-height WhatsApp-inspired squad chat (FirSquad: brand greens + header label).
 * Used only under /squads/[challengeId].
 */
export function SquadChatThread({
  challengeId,
  challengeName,
  currentUserId,
  apiMode,
}: SquadChatThreadProps) {
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [loading, setLoading] = useState(apiMode);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
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

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!apiMode || sending) return;
    const text = draft.trim();
    if (pendingImage) {
      const payload = buildImageMessage(pendingImage, text || undefined);
      await sendPayload(payload);
      return;
    }
    if (!text) return;
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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0b6e4f]">
      {/* WhatsApp-style top bar — FirSquad tweak: mint accent strip */}
      <header className="flex shrink-0 items-center gap-3 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
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
              FirSquad · squad chat
            </p>
          </div>
        </div>
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
            messages.map((m) => {
              const isSystem = m.type === "SYSTEM";
              const isMine = m.type === "USER" && m.userId === currentUserId;

              if (isSystem) {
                return (
                  <li key={m.id} className="px-2 py-1 text-center">
                    <span className="inline-block max-w-[92%] rounded-lg border border-black/5 bg-white/90 px-2 py-1 text-[11px] leading-snug text-pacer-muted shadow-sm">
                      {m.content}
                    </span>
                    <p className="mt-1 text-[10px] text-pacer-muted/80">
                      {formatSystemTime(m.createdAt)}
                    </p>
                  </li>
                );
              }

              const parsed = parseChatContent(m.content);

              return (
                <li
                  key={m.id}
                  className={`flex px-1 ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] ${
                      isMine ? "items-end" : "items-start"
                    } flex flex-col gap-0.5`}
                  >
                    {!isMine && m.user && (
                      <span className="max-w-full truncate pl-1 text-[12px] font-medium text-pacer-primary">
                        {m.user.name}
                      </span>
                    )}
                    <div
                      className={`relative min-w-[4rem] rounded-lg px-2 pb-1.5 pt-1.5 shadow-sm ${
                        isMine
                          ? "rounded-tr-none bg-[#dcf8c6] text-pacer-ink"
                          : "rounded-tl-none border border-black/6 bg-white text-pacer-ink"
                      }`}
                    >
                      {parsed.kind === "image" ? (
                        <div className="space-y-1">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={parsed.dataUrl}
                            alt=""
                            className="max-h-48 w-full max-w-[240px] rounded-md object-cover sm:max-w-[280px]"
                            loading="lazy"
                          />
                          {parsed.caption && (
                            <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">
                              {parsed.caption}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">
                          {parsed.text}
                        </p>
                      )}
                      <div
                        className={`mt-0.5 flex justify-end gap-1 text-right ${
                          isMine ? "text-pacer-ink/55" : "text-pacer-muted"
                        }`}
                      >
                        <span className="text-[10px] tabular-nums">
                          {formatBubbleTime(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
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
