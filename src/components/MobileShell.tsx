"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Link2, PlusCircle } from "lucide-react";

const nav = [
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    match: (p: string) => p === "/dashboard" || p.startsWith("/challenge"),
  },
  {
    href: "/create-challenge",
    label: "New",
    icon: PlusCircle,
    match: (p: string) => p === "/create-challenge",
  },
  {
    href: "/join",
    label: "Join",
    icon: Link2,
    match: (p: string) => p.startsWith("/join"),
  },
];

export function MobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname === "/login";

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-black mesh-bg">
      <main className={`relative flex-1 ${hideNav ? "" : "pb-28"}`}>
        {children}
      </main>

      {!hideNav && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-5"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <nav
            className="flex w-full max-w-md items-center justify-around gap-1 rounded-[22px] border border-white/[0.1] bg-zinc-900/75 p-1.5 shadow-nav backdrop-blur-3xl"
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
                      ? "bg-white/[0.12] text-white shadow-inner"
                      : "text-zinc-500 hover:text-zinc-300"
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
