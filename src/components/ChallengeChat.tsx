"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Paperclip, Send, Smile, X } from "lucide-react";
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

/** WhatsApp-style short time inside bubbles */
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

interface ChallengeChatProps {
  challengeId: string;
  currentUserId: string;
  apiMode: boolean;
}

export function ChallengeChat({
  challengeId,
  currentUserId,
  apiMode,
}: ChallengeChatProps) {
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
      const data = await apiGetChatMessages(challengeId, { limit: 50 });
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
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : "Could not add image");
    }
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#2a3942] bg-[#0b141a] shadow-glass-sm">
      {/* Header — WhatsApp-like bar */}
      <div className="flex items-center gap-3 border-b border-[#2a3942] bg-[#202c33] px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2a3942] text-xl">
          💬
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[15px] font-semibold text-[#e9edef]">
            Squad chat
          </h3>
          <p className="truncate text-[12px] text-[#8696a0]">
            {apiMode
              ? "End-to-end style messaging"
              : "Demo — connect the API to send"}
          </p>
        </div>
      </div>

      {err && (
        <p className="border-b border-[#2a3942] px-4 py-2 text-[12px] text-apple-red">
          {err}
        </p>
      )}

      {/* Message area — patterned wallpaper */}
      <ul
        ref={listRef}
        className="max-h-[min(22rem,55dvh)] space-y-1 overflow-y-auto px-2 py-3 sm:px-3"
        aria-live="polite"
        style={{
          backgroundColor: "#0b141a",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23182229' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {loading ? (
          <li className="py-10 text-center text-[13px] text-[#8696a0]">
            Loading…
          </li>
        ) : messages.length === 0 ? (
          <li className="py-12 text-center">
            <p className="text-3xl opacity-90">💬</p>
            <p className="mt-2 text-[13px] text-[#8696a0]">
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
                  <span className="inline-block max-w-[92%] rounded-lg bg-[#182229]/90 px-2 py-1 text-[11px] leading-snug text-[#8696a0] shadow-sm">
                    {m.content}
                  </span>
                  <p className="mt-1 text-[10px] text-[#667781]">
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
                    <span className="max-w-full truncate pl-1 text-[12px] font-medium text-[#53bdeb]">
                      {m.user.name}
                    </span>
                  )}
                  <div
                    className={`relative min-w-[4rem] rounded-lg px-2 pb-1.5 pt-1.5 shadow-sm ${
                      isMine
                        ? "rounded-tr-none bg-[#005c4b] text-[#e9edef]"
                        : "rounded-tl-none bg-[#202c33] text-[#e9edef]"
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
                        isMine ? "text-[#99beb8]" : "text-[#8696a0]"
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

      {/* Composer */}
      <form
        onSubmit={(e) => void onSend(e)}
        className="border-t border-[#2a3942] bg-[#202c33] p-2 pb-safe"
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
          <div className="relative mb-2 inline-block rounded-lg border border-[#2a3942] bg-[#2a3942]/50 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage}
              alt="Attachment preview"
              className="h-24 max-w-[200px] rounded-md object-cover"
            />
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#202c33] text-[#e9edef] shadow-md ring-1 ring-[#2a3942]"
              aria-label="Remove image"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="mt-1 px-1 text-[10px] text-[#8696a0]">
              Add a caption below, then send
            </p>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          <div className="relative flex min-h-[42px] flex-1 items-end rounded-full bg-[#2a3942] px-1 py-1">
            <button
              type="button"
              data-emoji-toggle
              onClick={() => setEmojiOpen((o) => !o)}
              disabled={!apiMode || sending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8696a0] transition hover:bg-[#3b4a54] hover:text-[#e9edef] disabled:opacity-40"
              aria-label="Emoji"
            >
              <Smile className="h-[22px] w-[22px]" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={!apiMode || sending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#8696a0] transition hover:bg-[#3b4a54] hover:text-[#e9edef] disabled:opacity-40"
              aria-label="Attach image"
            >
              <Paperclip className="h-[20px] w-[20px]" />
            </button>
            <label htmlFor="squad-chat-input" className="sr-only">
              Message
            </label>
            <input
              id="squad-chat-input"
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
              className="max-h-32 min-h-[38px] flex-1 bg-transparent px-2 py-2 text-[15px] text-[#e9edef] placeholder:text-[#8696a0] disabled:opacity-50"
              autoComplete="off"
              maxLength={4000}
            />
            {emojiOpen && (
              <div
                ref={emojiPanelRef}
                className="absolute bottom-full left-0 right-0 z-20 mb-2 max-h-52 overflow-y-auto rounded-xl border border-[#2a3942] bg-[#0b141a] p-2 shadow-xl"
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
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-[#2a3942]"
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
              !apiMode ||
              sending ||
              (!draft.trim() && !pendingImage)
            }
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#00a884] text-[#111b21] transition hover:bg-[#06cf9c] disabled:cursor-not-allowed disabled:bg-[#2a3942] disabled:text-[#54656f]"
            aria-label="Send message"
          >
            <Send className="ml-0.5 h-[18px] w-[18px]" />
          </button>
        </div>
      </form>
    </div>
  );
}
