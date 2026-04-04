"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { MessageSquare, Send } from "lucide-react";
import type { ApiChatMessage } from "@/lib/api-types";
import {
  apiGetChatMessages,
  apiSendChatMessage,
  getApiErrorMessage,
} from "@/lib/api";
import { MOCK_ACTIVITIES } from "@/lib/mock-data";

const POLL_MS = 8000;

function formatTime(iso: string) {
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
  const listRef = useRef<HTMLUListElement>(null);

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
  }, [messages]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !apiMode || sending) return;
    setSending(true);
    setErr(null);
    try {
      await apiSendChatMessage(challengeId, {
        userId: currentUserId,
        content: text,
      });
      setDraft("");
      await loadMessages();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.04] shadow-glass-sm backdrop-blur-xl">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-apple-blue" aria-hidden />
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Squad chat
            </h3>
            <p className="text-xs text-zinc-500">
              {apiMode
                ? "Messages sync from the challenge group"
                : "Demo feed — connect the API to send messages"}
            </p>
          </div>
        </div>
      </div>

      {err && (
        <p className="border-b border-white/[0.06] px-5 py-2 text-xs text-apple-red">
          {err}
        </p>
      )}

      <ul
        ref={listRef}
        className="max-h-80 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {loading ? (
          <li className="py-8 text-center text-sm text-zinc-500">Loading…</li>
        ) : messages.length === 0 ? (
          <li className="py-10 text-center">
            <p className="text-3xl">💬</p>
            <p className="mt-2 text-sm text-zinc-500">
              No messages yet. Say hi to the squad.
            </p>
          </li>
        ) : (
          messages.map((m) => {
            const isSystem = m.type === "SYSTEM";
            const isMine =
              m.type === "USER" && m.userId === currentUserId;

            if (isSystem) {
              return (
                <li key={m.id} className="text-center">
                  <p className="mx-auto max-w-[95%] text-xs leading-relaxed text-zinc-400">
                    {m.content}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    {formatTime(m.createdAt)}
                  </p>
                </li>
              );
            }

            return (
              <li
                key={m.id}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-snug ${
                    isMine
                      ? "bg-apple-blue/25 text-zinc-100"
                      : "bg-white/[0.08] text-zinc-200"
                  }`}
                >
                  {!isMine && m.user && (
                    <span className="mb-0.5 block text-[11px] font-semibold text-apple-blue">
                      {m.user.name}
                    </span>
                  )}
                  {m.content}
                </div>
                <p className="mt-1 px-1 text-[10px] text-zinc-600">
                  {formatTime(m.createdAt)}
                </p>
              </li>
            );
          })
        )}
      </ul>

      <form
        onSubmit={(e) => void onSend(e)}
        className="border-t border-white/[0.06] p-3"
      >
        <div className="flex gap-2">
          <label htmlFor="squad-chat-input" className="sr-only">
            Message
          </label>
          <input
            id="squad-chat-input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              apiMode ? "Message the squad…" : "API required to send"
            }
            disabled={!apiMode || sending}
            className="min-h-[44px] flex-1 rounded-xl border border-white/[0.08] bg-white/[0.06] px-3.5 text-sm text-white placeholder:text-zinc-600 focus:border-apple-blue/50 focus:outline-none focus:ring-1 focus:ring-apple-blue/30 disabled:opacity-50"
            autoComplete="off"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!apiMode || sending || !draft.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-apple-blue text-white transition hover:bg-apple-blue/90 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
