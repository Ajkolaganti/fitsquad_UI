"use client";

import { Activity, Zap } from "lucide-react";
import type { ActivityItem } from "@/types";

interface ActivityFeedProps {
  items: ActivityItem[];
  /** When a parent provides a sticky section title (e.g. dashboard). */
  hideHeader?: boolean;
}

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

function getItemAccent(message: string): { dot: string; rowBg: string } {
  const m = message.toLowerCase();
  if (m.includes("complet") || m.includes("done") || m.includes("finish")) {
    return { dot: "bg-pacer-primary", rowBg: "hover:bg-pacer-mint/50" };
  }
  if (m.includes("entered") || m.includes("checked in") || m.includes("started")) {
    return { dot: "bg-sky-500", rowBg: "hover:bg-sky-50" };
  }
  if (m.includes("missed") || m.includes("skip")) {
    return { dot: "bg-apple-red", rowBg: "hover:bg-red-50" };
  }
  return { dot: "bg-pacer-muted", rowBg: "hover:bg-pacer-cream/80" };
}

export function ActivityFeed({ items, hideHeader }: ActivityFeedProps) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-pacer-border bg-white shadow-glass-sm backdrop-blur-xl">
      {!hideHeader && (
        <div className="border-b border-pacer-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pacer-mint text-pacer-primary">
              <Zap className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-pacer-ink">
                Squad activity
              </h3>
              <p className="text-xs text-pacer-muted">Recent updates from your crew</p>
            </div>
          </div>
        </div>
      )}

      <ul className="max-h-72 divide-y divide-pacer-border/60 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-5 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-pacer-cream text-pacer-muted">
              <Activity className="h-7 w-7" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="mt-4 text-sm font-medium text-pacer-ink">No activity yet</p>
            <p className="mt-1 text-sm text-pacer-muted">
              Check in at the gym to see your squad here.
            </p>
          </li>
        ) : (
          items.map((item) => {
            const { dot, rowBg } = getItemAccent(item.message);
            return (
              <li
                key={item.id}
                className={`flex items-start gap-3 px-5 py-3.5 transition ${rowBg}`}
              >
                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-pacer-ink">
                    {item.message}
                  </p>
                  <p className="mt-1 text-[11px] text-pacer-muted">
                    {formatTime(item.createdAt)}
                  </p>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
