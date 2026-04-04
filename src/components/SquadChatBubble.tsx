"use client";

import type { ApiChatMessage, ApiChatUrlContent } from "@/lib/api-types";
import { parseChatContent } from "@/lib/chat-media";

function urlPayloadFromContent(
  content: ApiChatMessage["content"]
): ApiChatUrlContent | null {
  if (content && typeof content === "object" && "url" in content) {
    const u = (content as ApiChatUrlContent).url;
    if (typeof u === "string" && u.length > 0) return content as ApiChatUrlContent;
  }
  return null;
}

export interface SquadChatBubbleProps {
  message: ApiChatMessage;
  currentUserId: string;
  formatBubbleTime: (iso: string) => string;
  formatSystemTime: (iso: string) => string;
}

/**
 * Renders one squad chat row: SYSTEM, USER, IMAGE, or URL (decrypted API shapes only).
 */
export function SquadChatBubble({
  message: m,
  currentUserId,
  formatBubbleTime,
  formatSystemTime,
}: SquadChatBubbleProps) {
  if (m.type === "SYSTEM") {
    return (
      <li className="px-2 py-1 text-center">
        <div className="system-msg inline-block max-w-[92%] rounded-lg border border-black/5 bg-white/90 px-2 py-1 text-[11px] leading-snug text-pacer-muted shadow-sm">
          {typeof m.content === "string" ? m.content : ""}
        </div>
        <p className="mt-1 text-[10px] text-pacer-muted/80">
          {formatSystemTime(m.createdAt)}
        </p>
      </li>
    );
  }

  const isMine =
    (m.type === "USER" || m.type === "IMAGE" || m.type === "URL") &&
    m.userId === currentUserId;

  const urlPayload = m.type === "URL" ? urlPayloadFromContent(m.content) : null;
  const imageCaption =
    m.type === "IMAGE" && typeof m.content === "string" ? m.content.trim() : "";
  const userParsed =
    m.type === "USER"
      ? parseChatContent(typeof m.content === "string" ? m.content : "")
      : null;

  return (
    <li
      className={`flex px-1 ${isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`user-msg max-w-[85%] sm:max-w-[75%] ${
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
          {m.type === "USER" && (
            <>
              <strong className="sr-only">{m.user?.name ?? "User"}: </strong>
              {userParsed?.kind === "image" ? (
                <div className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={userParsed.dataUrl}
                    alt=""
                    className="max-h-48 w-full max-w-[240px] rounded-md object-cover sm:max-w-[280px]"
                    loading="lazy"
                  />
                  {userParsed.caption && (
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">
                      {userParsed.caption}
                    </p>
                  )}
                </div>
              ) : (
                <span className="whitespace-pre-wrap break-words text-[14px] leading-snug">
                  {userParsed?.text ?? ""}
                </span>
              )}
            </>
          )}

          {m.type === "IMAGE" && (
            <>
              <strong className="sr-only">{m.user?.name ?? "User"}: </strong>
              {m.mediaUrl ? (
                <div className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.mediaUrl}
                    alt={imageCaption || "Shared image"}
                    className="max-h-48 w-full max-w-[240px] rounded-md object-cover sm:max-w-[280px]"
                    loading="lazy"
                  />
                  {imageCaption ? (
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-snug">
                      {imageCaption}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-pacer-muted">
                  {imageCaption || "Photo unavailable"}
                </p>
              )}
            </>
          )}

          {m.type === "URL" && (
            <>
              <strong className="sr-only">{m.user?.name ?? "User"}: </strong>
              {urlPayload ? (
                <a
                  href={urlPayload.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-words text-[14px] font-medium leading-snug text-[#0b6e4f] underline decoration-[#0b6e4f]/40 underline-offset-2 hover:decoration-[#0b6e4f]"
                >
                  {urlPayload.text || urlPayload.url}
                </a>
              ) : (
                <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-pacer-muted">
                  Invalid link
                </p>
              )}
            </>
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
}
