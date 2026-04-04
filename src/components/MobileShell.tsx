"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Rocket, Users } from "lucide-react";

const nav = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    match: (p: string) => p === "/dashboard" || p.startsWith("/challenge"),
  },
  {
    href: "/squads",
    label: "Squads",
    icon: Users,
    match: (p: string) => p === "/squads" || p.startsWith("/squads/"),
  },
  {
    href: "/start",
    label: "Start",
    icon: Rocket,
    match: (p: string) =>
      p === "/start" ||
      p.startsWith("/create-challenge") ||
      p.startsWith("/join"),
  },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav =
    pathname === "/login" ||
    pathname === "/" ||
    /^\/squads\/[^/]+$/.test(pathname);

  return (
    <div className="relative flex min-h-[100dvh] flex-col mesh-bg">
      <main className={`relative flex-1 ${hideNav ? "" : "pb-28"}`}>
        {children}
      </main>

      {!hideNav && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <nav
            className="flex w-full max-w-md items-center justify-around gap-1 rounded-[22px] border border-pacer-border bg-white/95 p-1.5 shadow-nav backdrop-blur-3xl"
            aria-label="Main"
          >
            {nav.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex min-w-[76px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[18px] py-2.5 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                    active
                      ? "bg-pacer-mint text-pacer-leaf shadow-inner"
                      : "text-pacer-muted hover:text-pacer-ink"
                  }`}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
