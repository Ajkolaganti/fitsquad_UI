"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { syncSessionToApp } from "@/lib/auth-session";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import {
  apiForgotPassword,
  apiLogin,
  apiRegister,
  apiResendVerification,
  getApiErrorMessage,
  isApiConfigured,
} from "@/lib/api";
import { postAuthNavigate } from "@/lib/gym-onboarding";
import { refreshChallengesFromServer } from "@/lib/user-challenges";
import type { User } from "@/types";

function mockLogin(name: string): User {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `user-${Date.now()}`;
  return {
    id,
    name: name.trim() || "Athlete",
    telegramId: "",
    email: null,
    phone: null,
    gymLat: null,
    gymLng: null,
  };
}

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [demoName, setDemoName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifiedHint, setVerifiedHint] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setVerifiedHint(q.get("verified") === "0");
  }, []);

  const apiMode = isApiConfigured();
  const supabaseMode = hasSupabaseConfig();

  async function onApiSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    const em = email.trim();
    const pw = password;
    if (!em || !pw) {
      setErr("Email and password are required.");
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      setErr("Name, email, and password are required.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { message } = await apiRegister({
          name: displayName.trim(),
          email: em,
          password: pw,
        });
        setInfo(message);
        setPassword("");
        return;
      }
      const user = await apiLogin({ email: em, password: pw });
      setUser(user);
      await refreshChallengesFromServer(user.id);
      postAuthNavigate(router, user);
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function onApiForgotPassword() {
    const em = email.trim();
    if (!em) {
      setErr("Enter your email address first.");
      return;
    }
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const { message } = await apiForgotPassword({ email: em });
      setInfo(message);
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSupabaseForgotPassword() {
    const em = email.trim();
    if (!em) {
      setErr("Enter your email address first.");
      return;
    }
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(em, {
        redirectTo: `${origin}/auth/update-password`,
      });
      if (error) throw error;
      setInfo("Check your inbox for a link to reset your password.");
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Could not send reset email.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onResendVerification() {
    const em = email.trim();
    if (!em) {
      setErr("Enter your email address above first.");
      return;
    }
    setErr(null);
    setInfo(null);
    setLoading(true);
    try {
      const { message } = await apiResendVerification({ email: em });
      setInfo(message);
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSupabaseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    const em = email.trim();
    const pw = password;
    if (!em || !pw) {
      setErr("Email and password are required.");
      return;
    }
    if (mode === "signup" && !displayName.trim()) {
      setErr("Add your name for your profile.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: em,
          password: pw,
          options: {
            emailRedirectTo: `${origin}/auth/callback`,
            data: { name: displayName.trim() },
          },
        });
        if (error) throw error;

        if (data.user && !data.session) {
          setInfo(
            "Check your inbox for a verification link. After you confirm, you can sign in here."
          );
          setPassword("");
          return;
        }
        if (data.session) {
          const u = await syncSessionToApp(data.session);
          postAuthNavigate(router, u);
          return;
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });
      if (error) throw error;
      if (data.session) {
        const u = await syncSessionToApp(data.session);
        postAuthNavigate(router, u);
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Sign-in failed.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const u = mockLogin(demoName);
      setUser(u);
      postAuthNavigate(router, u);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-pacer-border bg-white px-4 py-3.5 text-base text-pacer-ink placeholder-zinc-400 shadow-sm transition focus:border-pacer-primary/50 focus:ring-2 focus:ring-pacer-primary/15";

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center px-6 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] text-pacer-ink">
      <div className="relative w-full max-w-sm py-8">
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-2 flex justify-center">
            <AppLogo variant="hero" priority />
          </div>
          <p className="mt-6 max-w-[280px] text-[15px] leading-relaxed text-pacer-muted">
            Your squad. Your gym.{" "}
            <span className="font-medium text-pacer-leaf">Stay consistent.</span>
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {["Streaks", "Leaderboard", "GPS check-in"].map((b) => (
            <span
              key={b}
              className="rounded-full border border-pacer-border bg-white px-3.5 py-1.5 text-xs font-medium text-pacer-muted shadow-sm"
            >
              {b}
            </span>
          ))}
        </div>

        {verifiedHint && (
          <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
            That link could not complete sign-in. Request a new one or sign in
            below.
          </p>
        )}

        {apiMode ? (
          <form
            method="post"
            onSubmit={(e) => void onApiSubmit(e)}
            className="space-y-4"
          >
            <div className="flex rounded-2xl border border-pacer-border bg-pacer-mist/50 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErr(null);
                  setInfo(null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === "signin"
                    ? "bg-white text-pacer-ink shadow-sm"
                    : "text-pacer-muted hover:text-pacer-ink"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErr(null);
                  setInfo(null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-pacer-ink shadow-sm"
                    : "text-pacer-muted hover:text-pacer-ink"
                }`}
              >
                Create account
              </button>
            </div>

            {mode === "signup" && (
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted"
                >
                  Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted"
                >
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onApiForgotPassword()}
                    className="shrink-0 text-[11px] font-medium text-pacer-primary hover:text-pacer-primary-hover disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {info && (
              <p className="rounded-2xl border border-pacer-mint bg-pacer-mint/60 px-4 py-3 text-center text-sm text-pacer-ink">
                {info}
              </p>
            )}
            {err && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-pacer-primary py-4 text-base font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50 hover:bg-pacer-primary-hover"
            >
              {loading
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>

            {mode === "signin" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => void onResendVerification()}
                className="w-full text-center text-sm text-pacer-muted hover:text-pacer-ink disabled:opacity-50"
              >
                Resend verification email
              </button>
            )}
          </form>
        ) : supabaseMode ? (
          <form
            method="post"
            onSubmit={(e) => void onSupabaseSubmit(e)}
            className="space-y-4"
          >
            <div className="flex rounded-2xl border border-pacer-border bg-pacer-mist/50 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErr(null);
                  setInfo(null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === "signin"
                    ? "bg-white text-pacer-ink shadow-sm"
                    : "text-pacer-muted hover:text-pacer-ink"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErr(null);
                  setInfo(null);
                }}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                  mode === "signup"
                    ? "bg-white text-pacer-ink shadow-sm"
                    : "text-pacer-muted hover:text-pacer-ink"
                }`}
              >
                Create account
              </button>
            </div>

            {mode === "signup" && (
              <div>
                <label
                  htmlFor="displayName"
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted"
                >
                  Display name
                </label>
                <input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex"
                  className={inputClass}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted"
                >
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onSupabaseForgotPassword()}
                    className="shrink-0 text-[11px] font-medium text-pacer-primary hover:text-pacer-primary-hover disabled:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            {info && (
              <p className="rounded-2xl border border-pacer-mint bg-pacer-mint/60 px-4 py-3 text-center text-sm text-pacer-ink">
                {info}
              </p>
            )}
            {err && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-pacer-primary py-4 text-base font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50 hover:bg-pacer-primary-hover"
            >
              {loading
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        ) : (
          <form onSubmit={onDemoSubmit} className="space-y-4">
            <p className="text-center text-sm text-pacer-muted">
              Offline demo — no API configured
            </p>
            <div>
              <label
                htmlFor="demoName"
                className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-pacer-muted"
              >
                Your name
              </label>
              <input
                id="demoName"
                type="text"
                required
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                className={inputClass}
                placeholder="e.g. Alex"
              />
            </div>
            {err && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {err}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-pacer-primary py-4 text-base font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50 hover:bg-pacer-primary-hover"
            >
              {loading ? "Getting ready…" : "Continue"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
