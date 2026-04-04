"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { syncSessionToApp } from "@/lib/auth-session";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";

/**
 * Supabase password recovery landing page — linked from reset email
 * (`resetPasswordForEmail` redirectTo). Session is established from the URL hash.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const inputClass =
    "w-full rounded-2xl border border-white/[0.1] bg-white/[0.06] px-4 py-3.5 text-base text-white placeholder-zinc-500 transition focus:border-apple-blue/50 focus:ring-2 focus:ring-apple-blue/20";

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setErr("Supabase is not configured.");
      setReady(true);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      if (!session) {
        setErr(
          "This link is invalid or expired. Request a new reset from the login page."
        );
      }
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    if (password.length < 6) {
      setErr("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setErr("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });
      if (error) throw error;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        await syncSessionToApp(session);
      }
      setInfo("Password updated. Redirecting…");
      setTimeout(() => router.replace("/dashboard"), 1500);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: string }).message)
          : "Could not update password.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6">
        <AppLogo variant="header" className="mb-8 opacity-90" />
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center px-6 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div className="relative w-full max-w-sm py-8">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-2 flex justify-center">
            <AppLogo variant="hero" priority />
          </div>
          <h1 className="mt-4 text-lg font-semibold text-white">
            Set a new password
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="newPassword"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-zinc-500"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          {info && (
            <p className="rounded-2xl border border-apple-blue/25 bg-apple-blue/10 px-4 py-3 text-center text-sm text-zinc-200">
              {info}
            </p>
          )}
          {err && (
            <p className="rounded-2xl border border-apple-red/30 bg-apple-red/10 px-4 py-3 text-center text-sm text-red-200">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !hasSession}
            className="w-full rounded-2xl bg-apple-blue py-4 text-base font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-50 hover:bg-apple-blue-hover"
          >
            {loading ? "Updating…" : "Update password"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300"
          >
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}
