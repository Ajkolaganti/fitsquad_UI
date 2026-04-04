"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { syncSessionToApp } from "@/lib/auth-session";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Email verification / magic-link return URL (configure the same path in Supabase
 * Auth → URL Configuration → Redirect URLs).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session) {
          await syncSessionToApp(session);
          router.replace("/dashboard");
        } else {
          setMessage("Could not complete sign-in. Try the link again.");
          setTimeout(() => router.replace("/login"), 2500);
        }
      })
      .catch(() => {
        setMessage("Something went wrong.");
        setTimeout(() => router.replace("/login"), 2500);
      });
  }, [router]);

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6">
      <AppLogo variant="header" className="mb-8 opacity-90" />
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
      <p className="mt-6 text-center text-sm text-zinc-400">{message}</p>
    </div>
  );
}
