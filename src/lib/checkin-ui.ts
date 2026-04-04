/** Map `/checkin` response `message` values to UI flags (see API_REFERENCE.md). */

export function checkinIndicatesCompletedToday(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already completed today") || m.includes("session already completed")
  );
}

export function checkinIndicatesSessionCompleted(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("session completed") || m.includes("completed today's workout");
}

export function checkinIndicatesNotAtGym(
  message: string,
  inside?: boolean
): boolean {
  if (inside === false) return true;
  return message.toLowerCase().includes("not at the gym");
}

export function checkinIndicatesInProgress(message: string): boolean {
  return message.toLowerCase().includes("session in progress");
}

export function checkinIndicatesStarted(message: string): boolean {
  return message.toLowerCase().includes("check-in started");
}
