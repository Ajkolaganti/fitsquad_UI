"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GYM_RADIUS_METERS, haversineMeters } from "@/lib/geo";
import type { Coordinates } from "@/types";

export type LocationPermissionState =
  | "unknown"
  | "granted"
  | "denied"
  | "unsupported";

export interface UseLocationOptions {
  gym: Coordinates | null;
  enableHighAccuracy?: boolean;
}

export interface UseLocationResult {
  coords: Coordinates | null;
  accuracyMeters: number | null;
  distanceToGymMeters: number | null;
  isWithinGym: boolean;
  permission: LocationPermissionState;
  error: string | null;
  loading: boolean;
  refresh: () => void;
}

export function useLocation(options: UseLocationOptions): UseLocationResult {
  const { gym, enableHighAccuracy = true } = options;
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [permission, setPermission] =
    useState<LocationPermissionState>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const watchId = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchId.current != null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);

  const applyPosition = useCallback((pos: GeolocationPosition) => {
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setAccuracyMeters(
      pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null
    );
    setError(null);
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      setError("Geolocation is not supported in this browser.");
      setLoading(false);
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermission("granted");
        applyPosition(pos);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setError("Location permission denied. Enable it in browser settings.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Position unavailable. Try again or move to an open area.");
        } else {
          setError(err.message || "Could not read location.");
        }
      },
      { enableHighAccuracy, maximumAge: 5000, timeout: 25000 }
    );
  }, [applyPosition, enableHighAccuracy]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      setError("Geolocation is not supported.");
      setLoading(false);
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermission("granted");
        applyPosition(pos);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setError("Location permission denied.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Position temporarily unavailable.");
        }
      },
      { enableHighAccuracy, maximumAge: 8000, timeout: 40000 }
    );

    return () => clearWatch();
  }, [applyPosition, clearWatch, enableHighAccuracy]);

  let distanceToGymMeters: number | null = null;
  let isWithinGym = false;
  if (coords && gym) {
    distanceToGymMeters = Math.round(haversineMeters(coords, gym));
    isWithinGym = distanceToGymMeters <= GYM_RADIUS_METERS;
  }

  return {
    coords,
    accuracyMeters,
    distanceToGymMeters,
    isWithinGym,
    permission,
    error,
    loading,
    refresh,
  };
}
