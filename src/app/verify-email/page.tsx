"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLogo } from "@/components/AppLogo";
import { apiVerifyEmail, getApiErrorMessage, isApiConfigured } from "@/lib/api";

function VerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isApiConfigured()) {
      setStatus("err");
      setMessage("API is not configured.");
      return;
    }
    if (!token) {
      setStatus("err");
      setMessage("Missing verification token. Open the link from your email.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { message: msg } = await apiVerifyEmail({ token });
        if (cancelled) return;
        setMessage(msg);
        setStatus("ok");
        setTimeout(() => router.replace("/login"), 2200);
      } catch (e) {
        if (cancelled) return;
        setMessage(getApiErrorMessage(e));
        setStatus("err");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6">
      <AppLogo variant="header" className="mb-8 opacity-90" />
      {status === "loading" && (
        <>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
          <p className="mt-6 text-center text-sm text-zinc-400">
            Verifying your email…
          </p>
        </>
      )}
      {status === "ok" && (
        <p className="max-w-sm text-center text-sm text-zinc-200">{message}</p>
      )}
      {status === "err" && (
        <div className="max-w-sm space-y-4 text-center">
          <p className="text-sm text-red-200">{message}</p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-apple-blue hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40dvh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-apple-blue border-t-transparent" />
        </div>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
