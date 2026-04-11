import type { User } from "@/types";

export function numFromUnknown(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function strFromUnknown(v: unknown): string | null | undefined {
  if (typeof v === "string") return v;
  if (v === null) return null;
  return undefined;
}

function coordsFromObject(obj: Record<string, unknown>): {
  lat: number | null;
  lng: number | null;
} {
  const lat =
    numFromUnknown(obj.lat) ??
    numFromUnknown(obj.latitude) ??
    numFromUnknown(obj.gymLat) ??
    numFromUnknown(obj.gym_lat);
  const lng =
    numFromUnknown(obj.lng) ??
    numFromUnknown(obj.longitude) ??
    numFromUnknown(obj.gymLng) ??
    numFromUnknown(obj.gym_lng);
  return { lat, lng };
}

/**
 * Reads gym coordinates from API user JSON that may use camelCase, snake_case,
 * or nested `gym` / `location` objects (common ORM / serializer variants).
 */
export function extractGymFromUserPayload(
  r: Record<string, unknown>
): Pick<User, "gymLat" | "gymLng"> &
  Pick<Partial<User>, "gymName" | "gymAddress" | "gymPlaceId"> {
  let gymLat =
    numFromUnknown(r.gymLat) ??
    numFromUnknown(r.gym_lat) ??
    numFromUnknown(r.latitude);
  let gymLng =
    numFromUnknown(r.gymLng) ??
    numFromUnknown(r.gym_lng) ??
    numFromUnknown(r.longitude);

  const nestedKeys = ["gym", "gymLocation", "location", "homeGym"] as const;
  for (const key of nestedKeys) {
    if (gymLat != null && gymLng != null) break;
    const n = r[key];
    if (!n || typeof n !== "object") continue;
    const c = coordsFromObject(n as Record<string, unknown>);
    gymLat = gymLat ?? c.lat;
    gymLng = gymLng ?? c.lng;
  }

  const gymName =
    strFromUnknown(r.gymName) ??
    strFromUnknown(r.gym_name) ??
    strFromUnknown((r.gym as Record<string, unknown> | undefined)?.name);
  const gymAddress =
    strFromUnknown(r.gymAddress) ??
    strFromUnknown(r.gym_address) ??
    strFromUnknown(r.formattedAddress) ??
    strFromUnknown((r.gym as Record<string, unknown> | undefined)?.formattedAddress);
  const gymPlaceId =
    strFromUnknown(r.gymPlaceId) ??
    strFromUnknown(r.gym_place_id) ??
    strFromUnknown(r.placeId) ??
    strFromUnknown((r.gym as Record<string, unknown> | undefined)?.placeId);

  return {
    gymLat: gymLat ?? null,
    gymLng: gymLng ?? null,
    ...(gymName !== undefined ? { gymName } : {}),
    ...(gymAddress !== undefined ? { gymAddress } : {}),
    ...(gymPlaceId !== undefined ? { gymPlaceId } : {}),
  };
}

/** Merge saved coordinates from the Places form when the API omits them in `user`. */
export function mergeUserWithSubmittedGym(
  user: User,
  body: {
    lat: number;
    lng: number;
    name?: string;
    formattedAddress?: string;
    placeId?: string;
  }
): User {
  if (user.gymLat != null && user.gymLng != null) return user;
  return {
    ...user,
    gymLat: body.lat,
    gymLng: body.lng,
    gymName: body.name ?? user.gymName ?? null,
    gymAddress: body.formattedAddress ?? user.gymAddress ?? null,
    gymPlaceId: body.placeId ?? user.gymPlaceId ?? null,
  };
}

/** Supabase `raw_user_meta_data` / `user_metadata` gym keys (set by our client sync). */
export function extractGymFromSupabaseMetadata(
  meta: Record<string, unknown> | null | undefined
): Pick<User, "gymLat" | "gymLng"> &
  Pick<Partial<User>, "gymName" | "gymAddress" | "gymPlaceId"> {
  if (!meta || typeof meta !== "object") {
    return { gymLat: null, gymLng: null };
  }
  return extractGymFromUserPayload(meta);
}
