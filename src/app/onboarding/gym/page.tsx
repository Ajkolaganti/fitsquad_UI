"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin } from "lucide-react";
import { GymPlaceAutocomplete, type SelectedGymPlace } from "@/components/GymPlaceAutocomplete";
import { AppLogo } from "@/components/AppLogo";
import { authSignOut } from "@/lib/auth-session";
import {
  apiPostLocation,
  getApiErrorMessage,
  isApiConfigured,
} from "@/lib/api";
import { getSafeInternalNextPath } from "@/lib/safe-next-path";
import { useAppStore } from "@/store/useAppStore";
import { userNeedsGymOnboarding } from "@/lib/gym-onboarding";

function getMapsKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

function OnboardingGymInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hydrated, setUser } = useAppStore();
  const [selected, setSelected] = useState<SelectedGymPlace | null>(null);
  const [validationErr, setValidationErr] = useState("");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  const mapsKey = getMapsKey();
  const apiMode = isApiConfigured();
  const nextRaw = searchParams.get("next");
  const nextPath = getSafeInternalNextPath(nextRaw);
  const changeMode = searchParams.get("change") === "1";

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  if (!changeMode && !userNeedsGymOnboarding(user)) {
    router.replace(nextPath ?? "/dashboard");
    return null;
  }

  const inputClass =
    "w-full rounded-2xl border border-pacer-border bg-white px-4 py-3.5 text-base text-pacer-ink placeholder-zinc-400 shadow-sm transition focus:border-pacer-primary/50 focus:ring-2 focus:ring-pacer-primary/15";

  async function onConfirm() {
    if (!user || !selected) return;
    setSubmitErr(null);
    setBusy(true);
    try {
      if (apiMode) {
        const u = await apiPostLocation({
          userId: user.id,
          lat: selected.lat,
          lng: selected.lng,
          placeId: selected.placeId,
          name: selected.name,
          formattedAddress: selected.formattedAddress,
        });
        setUser(u);
      } else {
        useAppStore.getState().setGymLocation(selected.lat, selected.lng, {
          gymName: selected.name,
          gymAddress: selected.formattedAddress,
          gymPlaceId: selected.placeId,
        });
      }
      router.replace(nextPath ?? "/dashboard");
    } catch (e: unknown) {
      setSubmitErr(getApiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onDemoGymFromGps() {
    if (!user || typeof navigator === "undefined" || !navigator.geolocation) {
      setSubmitErr("GPS isn’t available in this browser.");
      return;
    }
    setSubmitErr(null);
    setDemoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        useAppStore.getState().setGymLocation(lat, lng, {
          gymName: "Demo gym (GPS)",
          gymAddress: null,
          gymPlaceId: null,
        });
        setDemoBusy(false);
        router.replace(nextPath ?? "/dashboard");
      },
      () => {
        setSubmitErr("Could not read your location. Allow location or use Google search above.");
        setDemoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col px-6 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))] text-pacer-ink">
      <div className="mx-auto w-full max-w-md py-6">
        <div className="mb-8 flex flex-col items-center text-center">
          <AppLogo variant="hero" priority />
          <h1 className="mt-8 font-display text-2xl font-bold text-pacer-ink">
            {changeMode ? "Update your gym" : "Set your gym"}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-pacer-muted">
            Search Google Maps for your gym. This location is used for every
            challenge you join.
          </p>
        </div>

        <div className="rounded-[22px] border border-pacer-border bg-white p-5 shadow-glass-sm backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pacer-cream">
              <MapPin className="h-5 w-5 text-pacer-primary" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-pacer-ink">
                Gym in Google Maps
              </p>
              <p className="mt-1 text-xs leading-relaxed text-pacer-muted">
                Pick a fitness center or studio from the suggestions.
              </p>
            </div>
          </div>

          {mapsKey ? (
            <div className="mt-4">
              <GymPlaceAutocomplete
                apiKey={mapsKey}
                disabled={busy}
                inputClassName={inputClass}
                onSelect={(p) => {
                  setSelected(p);
                  setValidationErr("");
                }}
                onValidationError={(msg) => {
                  setValidationErr(msg);
                  if (msg) setSelected(null);
                }}
              />
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              Add{" "}
              <code className="rounded bg-amber-100/80 px-1 font-mono text-xs">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
              </code>{" "}
              to your env (Maps JavaScript API + Places enabled).
            </p>
          )}

          {validationErr ? (
            <p className="mt-3 text-sm text-ember-500">{validationErr}</p>
          ) : null}

          {selected ? (
            <div className="mt-4 rounded-2xl border border-pacer-border/80 bg-pacer-mist/40 px-3 py-3 text-sm">
              <p className="font-semibold text-pacer-ink">{selected.name}</p>
              {selected.formattedAddress ? (
                <p className="mt-1 text-xs text-pacer-muted">{selected.formattedAddress}</p>
              ) : null}
            </div>
          ) : null}

          {submitErr ? (
            <p className="mt-3 text-sm text-ember-500">{submitErr}</p>
          ) : null}

          <button
            type="button"
            disabled={!selected || busy || !mapsKey}
            onClick={() => void onConfirm()}
            className="mt-5 flex w-full items-center justify-center rounded-2xl bg-pacer-primary py-3.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.99] hover:bg-pacer-primary-hover disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save gym"}
          </button>

          {!apiMode && !mapsKey ? (
            <button
              type="button"
              disabled={demoBusy}
              onClick={() => void onDemoGymFromGps()}
              className="mt-3 flex w-full items-center justify-center rounded-2xl border border-pacer-border bg-pacer-mist py-3.5 text-sm font-semibold text-pacer-ink transition hover:bg-white disabled:opacity-50"
            >
              {demoBusy ? "Locating…" : "Demo: use current GPS as gym"}
            </button>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-pacer-muted">
          <button
            type="button"
            onClick={() => void authSignOut().then(() => router.replace("/login"))}
            className="font-medium text-pacer-primary underline-offset-2 hover:underline"
          >
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}

export default function OnboardingGymPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center">
          <div className="h-11 w-11 animate-spin rounded-full border-2 border-pacer-primary border-t-transparent" />
        </div>
      }
    >
      <OnboardingGymInner />
    </Suspense>
  );
}
