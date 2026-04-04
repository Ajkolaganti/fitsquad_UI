"use client";

import { useEffect } from "react";
import { setAuthToken } from "@/lib/api";
import { syncSessionToApp } from "@/lib/auth-session";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase/client";
import { hydrateUserFromStorage, useAppStore } from "@/store/useAppStore";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (hasSupabaseConfig()) {
        try {
          const supabase = getSupabaseBrowserClient();
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (cancelled) return;
          if (session) {
            await syncSessionToApp(session);
            useAppStore.getState().setHydrated(true);
            return;
          }
        } catch {
          /* fall through to local storage */
        }
      }
      hydrateUserFromStorage();
    }

    void bootstrap();

    if (!hasSupabaseConfig()) return () => {
      cancelled = true;
    };

    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (session) {
        await syncSessionToApp(session);
      } else if (event === "SIGNED_OUT") {
        setAuthToken(null);
        useAppStore.getState().logout();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
