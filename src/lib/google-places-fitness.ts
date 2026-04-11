/**
 * Client-side guard: only allow Places that look like a gym / fitness venue.
 * The backend should still validate via Place Details when `placeId` is stored.
 */
const FITNESS_TYPES = new Set([
  "gym",
  "health",
  "physiotherapist",
  "spa",
  "stadium",
]);

const FITNESS_NAME_RE =
  /\b(gym|fitness|crossfit|barbell|iron|workout|athletic|sports club|yoga|pilates|planet fitness|equinox|24\s*hour|anytime)\b/i;

export function isLikelyFitnessPlace(place: google.maps.places.PlaceResult): boolean {
  const types = place.types ?? [];
  if (types.some((t) => FITNESS_TYPES.has(t))) return true;
  const label = `${place.name ?? ""} ${place.formatted_address ?? ""}`;
  if (FITNESS_NAME_RE.test(label)) {
    return (
      types.includes("establishment") ||
      types.includes("point_of_interest") ||
      types.includes("gym")
    );
  }
  return false;
}
