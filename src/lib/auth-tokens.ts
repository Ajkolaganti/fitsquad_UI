const ACCESS_KEY = "firsquad_access_token";
const REFRESH_KEY = "firsquad_refresh_token";

export function persistBackendTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function getStoredBackendAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function clearBackendTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
