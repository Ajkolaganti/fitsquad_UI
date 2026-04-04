"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Sparkles,
  Trophy,
  Users,
  ChevronRight,
  Star,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { useAppStore } from "@/store/useAppStore";

const features = [
  {
    icon: Users,
    title: "Squad challenges",
    body: "Create or join challenges and keep each other accountable all week.",
  },
  {
    icon: MapPin,
    title: "GPS check-in",
    body: "Save your gym and let the app know when you show up — no extra hardware.",
  },
  {
    icon: Trophy,
    title: "Leaderboards & streaks",
    body: "See who’s on top and celebrate every day you hit your goal.",
  },
];

export function LandingPage() {
  const router = useRouter();
  const { user, hydrated } = useAppStore();

  useEffect(() => {
    if (hydrated && user) router.replace("/dashboard");
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
          <p className="text-sm text-pacer-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex justify-center">
          <AppLogo variant="hero" priority />
        </div>

        <p className="text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-pacer-primary">
          Gym accountability
        </p>
        <h1 className="mt-3 text-center font-display text-[2rem] font-bold leading-[1.15] tracking-tight text-pacer-ink">
          Your daily move,
          <br />
          <span className="text-pacer-leaf">made joyful</span>
        </h1>
        <p className="mx-auto mt-4 max-w-[320px] text-center text-[15px] leading-relaxed text-pacer-muted">
          A simple way to track gym time with friends — challenges, streaks, and
          squad energy in one place.
        </p>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-amber-500">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="h-5 w-5 fill-current" strokeWidth={0} />
          ))}
          <span className="ml-2 text-sm font-medium text-pacer-muted">
            Built for consistency
          </span>
        </div>

        <div className="mt-10 space-y-3">
          <Link
            href="/login"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pacer-primary py-4 text-base font-semibold text-white shadow-lg transition hover:bg-pacer-primary-hover active:scale-[0.99]"
          >
            Get started free
            <ChevronRight className="h-5 w-5 opacity-90" strokeWidth={2.25} />
          </Link>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-2xl border border-pacer-border bg-white py-4 text-base font-semibold text-pacer-ink shadow-sm transition hover:bg-pacer-mist/80"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-14 rounded-[28px] border border-pacer-border bg-white/90 p-6 shadow-glass-sm backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pacer-mint">
              <Sparkles className="h-5 w-5 text-pacer-leaf" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-pacer-ink">
                Everything you need
              </h2>
              <p className="text-xs text-pacer-muted">
                Like a fitness landing page — clear, friendly, focused.
              </p>
            </div>
          </div>
          <ul className="space-y-5">
            {features.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pacer-cream">
                  <Icon className="h-5 w-5 text-pacer-primary" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-display font-semibold text-pacer-ink">
                    {title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-pacer-muted">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 text-center text-xs text-pacer-muted">
          fitsquad — inspired by friendly fitness apps like{" "}
          <a
            href="https://www.mypacer.com/"
            className="font-medium text-pacer-leaf underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Pacer
          </a>
        </p>
      </div>
    </div>
  );
}
