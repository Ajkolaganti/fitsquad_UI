import axios, { type AxiosError } from "axios";
import type { Challenge, User } from "@/types";
import {
  mapApiChallengeToChallenge,
  mapApiUserToUser,
  mapLeaderboardRows,
  mapLoginResponseUser,
} from "@/lib/api-mappers";
import { persistBackendTokens } from "@/lib/auth-tokens";
import type {
  ApiChallenge,
  ApiChatMessage,
  ApiCheckinResponse,
  ApiJoinParticipant,
  ApiLeaderboardRow,
  ApiUser,
  TelegramWidgetPayload,
} from "@/lib/api-types";

/**
 * FitSquad HTTP API (see API_REFERENCE.md).
 *
 * Default: same-origin `/api-proxy` → Next.js rewrites to `API_PROXY_TARGET` (see
 * `next.config.mjs`). That avoids browser CORS because the browser only talks to
 * this app’s origin.
 *
 * Override: set `NEXT_PUBLIC_API_URL` to a full `http(s)://` URL to call the API
 * directly (then your API must send CORS headers for this site).
 */
function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    if (fromEnv.startsWith("http://") || fromEnv.startsWith("https://")) {
      return fromEnv;
    }
    return fromEnv;
  }
  return "/api-proxy";
}

const baseURL = getApiBaseUrl();

export const api = axios.create({
  baseURL: baseURL || undefined,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

/** Supabase access token for `Authorization: Bearer` on API requests. */
export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export function isApiConfigured(): boolean {
  return Boolean(baseURL);
}

/** Optional — Telegram Login Widget payload to `POST /auth/telegram` (if your backend enables it). */
export async function apiAuthTelegram(
  payload: TelegramWidgetPayload
): Promise<User> {
  const { data } = await api.post<{ success: boolean; user: ApiUser }>(
    "/auth/telegram",
    payload
  );
  if (!data.success || !data.user) {
    throw new Error("Invalid Telegram auth response");
  }
  return mapApiUserToUser(data.user);
}

/** Create account — sends verification email from backend (Resend). */
export async function apiRegister(body: {
  name: string;
  email: string;
  password: string;
}): Promise<{ message: string; userId: string }> {
  const { data } = await api.post<{
    success: boolean;
    message: string;
    userId: string;
  }>("/auth/register", body);
  if (!data.success || !data.userId) {
    throw new Error(data.message || "Registration failed");
  }
  return { message: data.message, userId: data.userId };
}

/** Email + password — returns Supabase JWT for `Authorization: Bearer`. */
export async function apiLogin(body: {
  email: string;
  password: string;
}): Promise<User> {
  const { data } = await api.post<{
    success: boolean;
    token: string;
    refreshToken: string;
    user: { id: string; name: string; email: string };
  }>("/auth/login", body);
  if (!data.success || !data.token || !data.user) {
    throw new Error("Invalid login response");
  }
  persistBackendTokens(data.token, data.refreshToken);
  setAuthToken(data.token);
  try {
    return await apiGetCurrentUser();
  } catch {
    return mapLoginResponseUser(data.user);
  }
}

export async function apiVerifyEmail(body: {
  token: string;
}): Promise<{ message: string }> {
  const { data } = await api.post<{
    success: boolean;
    message: string;
  }>("/auth/verify-email", body);
  if (!data.success) {
    throw new Error(data.message || "Verification failed");
  }
  return { message: data.message };
}

export async function apiResendVerification(body: {
  email: string;
}): Promise<{ message: string }> {
  const { data } = await api.post<{
    success: boolean;
    message: string;
  }>("/auth/resend-verification", body);
  if (!data.success) {
    throw new Error(data.message || "Could not resend email");
  }
  return { message: data.message };
}

/** Current profile — requires `Authorization: Bearer` (Supabase access token). */
export async function apiGetCurrentUser(): Promise<User> {
  const { data } = await api.get<{ success: boolean; user: ApiUser }>(
    "/auth/me"
  );
  if (!data.success || !data.user) {
    throw new Error("Not authenticated");
  }
  return mapApiUserToUser(data.user);
}

export async function apiGetChallenge(
  id: string,
  currentUserId?: string
): Promise<Challenge> {
  const { data } = await api.get<{ success: boolean; challenge: ApiChallenge }>(
    `/challenge/${id}`
  );
  if (!data.success || !data.challenge) {
    throw new Error("Challenge not found");
  }
  return mapApiChallengeToChallenge(data.challenge, currentUserId);
}

export async function apiCreateChallenge(body: {
  name: string;
  daysPerWeek: number;
  durationMinutes: number;
  telegramGroupId?: string;
}): Promise<Challenge> {
  const { data } = await api.post<{ success: boolean; challenge: ApiChallenge }>(
    "/challenge/create",
    body
  );
  if (!data.success || !data.challenge) {
    throw new Error("Failed to create challenge");
  }
  return mapApiChallengeToChallenge(data.challenge);
}

export async function apiJoinChallenge(
  userId: string,
  inviteCode: string
): Promise<Challenge> {
  const { data } = await api.post<{
    success: boolean;
    participant: ApiJoinParticipant;
  }>("/challenge/join", { userId, inviteCode });
  if (!data.success || !data.participant) {
    throw new Error("Join failed");
  }
  return apiGetChallenge(data.participant.challengeId, userId);
}

export async function apiPostLocation(body: {
  userId: string;
  lat: number;
  lng: number;
}): Promise<User> {
  const { data } = await api.post<{ success: boolean; user: ApiUser }>(
    "/location/update",
    body
  );
  if (!data.success || !data.user) {
    throw new Error("Failed to save gym location");
  }
  return mapApiUserToUser(data.user);
}

export async function apiPostCheckin(body: {
  userId: string;
  challengeId: string;
  lat: number;
  lng: number;
}): Promise<ApiCheckinResponse> {
  const { data } = await api.post<ApiCheckinResponse>("/checkin", body);
  return data;
}

export async function apiGetLeaderboard(
  challengeId: string
): Promise<Challenge["participants"]> {
  const { data } = await api.get<{
    success: boolean;
    leaderboard: ApiLeaderboardRow[];
  }>(`/leaderboard/${challengeId}`);
  if (!data.success || !data.leaderboard) {
    throw new Error("Leaderboard unavailable");
  }
  return mapLeaderboardRows(data.leaderboard);
}

export async function apiGetChatMessages(
  challengeId: string,
  opts?: { limit?: number; before?: string }
): Promise<ApiChatMessage[]> {
  const params = new URLSearchParams();
  if (opts?.limit != null) params.set("limit", String(opts.limit));
  if (opts?.before) params.set("before", opts.before);
  const q = params.toString();
  const path = `/chat/${challengeId}/messages${q ? `?${q}` : ""}`;
  const { data } = await api.get<{
    success: boolean;
    data: ApiChatMessage[];
  }>(path);
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error("Failed to load chat");
  }
  return data.data;
}

export async function apiSendChatMessage(
  challengeId: string,
  body: { userId: string; content: string }
): Promise<ApiChatMessage> {
  const { data } = await api.post<{
    success: boolean;
    data: ApiChatMessage;
  }>(`/chat/${challengeId}/send`, body);
  if (!data.success || !data.data) {
    throw new Error("Failed to send message");
  }
  return data.data;
}

export function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err);
}

export function getApiErrorMessage(err: unknown): string {
  const ax = err as AxiosError<{
    message?: string;
    success?: boolean;
  }>;
  const msg = ax.response?.data?.message;
  if (typeof msg === "string" && msg.length > 0) return msg;
  return ax.message || "Something went wrong";
}
