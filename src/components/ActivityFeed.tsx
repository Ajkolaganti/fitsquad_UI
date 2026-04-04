"use client";

import type { ActivityItem } from "@/types";

interface ActivityFeedProps {
  items: ActivityItem[];
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
    return { dot: "bg-apple-green", rowBg: "hover:bg-apple-green/[0.06]" };
  }
  if (m.includes("entered") || m.includes("checked in") || m.includes("started")) {
    return { dot: "bg-apple-blue", rowBg: "hover:bg-apple-blue/[0.06]" };
  }
  if (m.includes("missed") || m.includes("skip")) {
    return { dot: "bg-apple-red", rowBg: "hover:bg-apple-red/[0.06]" };
  }
  return { dot: "bg-zinc-500", rowBg: "hover:bg-white/[0.04]" };
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-white/[0.04] shadow-glass-sm backdrop-blur-xl">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚡</span>
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Squad Activity
            </h3>
            <p className="text-xs text-zinc-500">Recent from your crew</p>
          </div>
        </div>
      </div>

      <ul className="max-h-72 divide-y divide-white/[0.04] overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-5 py-10 text-center">
            <p className="text-3xl">🏋️</p>
            <p className="mt-2 text-sm text-zinc-500">
              No activity yet. Check in to get started.
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
                  <p className="text-sm leading-snug text-zinc-200">
                    {item.message}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-600">
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
