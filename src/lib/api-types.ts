/** Raw shapes from FitSquad API (see API_REFERENCE.md). */

/** Payload from Telegram Login Widget — forward as-is to `POST /auth/telegram`. */
export interface TelegramWidgetPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

export interface ApiUser {
  id: string;
  name: string;
  /** Omitted on email-only `/auth/login` profile until `/auth/me` loads. */
  telegramId?: string;
  email?: string | null;
  phone?: string | null;
  gymLat?: number | null;
  gymLng?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Participant on `GET /challenge/:id` — aligned with leaderboard row fields
 * (`ApiLeaderboardRow`) so the UI gets the same `Participant` shape everywhere.
 * Supports nested `user.name` (legacy) or top-level `name` from flattened responses.
 */
export interface ApiChallengeParticipant {
  id?: string;
  userId: string;
  /** Flattened display name (preferred when API matches leaderboard payload). */
  name?: string;
  completedDays: number;
  streak: number;
  rank?: number;
  joinedAt?: string;
  lastCheckin?: string | null;
  user?: {
    id: string;
    name: string;
    telegramId: string;
  };
}

/** Optional gym challenge metadata — server may omit until backend supports it */
export interface ApiChallengeFocus {
  splitId?: string;
  exerciseId?: string;
  modalityId?: string;
  customText?: string;
}

export interface ApiChallenge {
  id: string;
  name: string;
  daysPerWeek: number;
  durationMinutes: number;
  inviteCode?: string;
  telegramGroupId?: string | null;
  createdAt?: string;
  participants?: ApiChallengeParticipant[];
  challengeKind?: string;
  focus?: ApiChallengeFocus | null;
  goalSummary?: string | null;
  rules?: Record<string, unknown> | null;
}

export interface ApiJoinParticipant {
  id: string;
  userId: string;
  challengeId: string;
  streak: number;
  completedDays: number;
  lastCheckin?: string | null;
  joinedAt?: string;
  user: { id: string; name: string; telegramId: string };
  challenge: { id: string; name: string };
}

export interface ApiLeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  telegramId: string;
  completedDays: number;
  streak: number;
  joinedAt?: string;
  lastCheckin?: string | null;
}

export interface ApiCheckin {
  id: string;
  userId?: string;
  challengeId?: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: string;
}

export interface ApiCheckinResponse {
  success: boolean;
  message: string;
  checkin?: ApiCheckin;
  elapsedMinutes?: number;
  remainingMinutes?: number;
  inside?: boolean;
}

export type ApiChatMessageType = "USER" | "SYSTEM" | "IMAGE" | "URL";

/** `POST /chat/:challengeId/send-url` — stored as JSON on `URL` messages */
export interface ApiChatUrlContent {
  url: string;
  text?: string;
}

/** Plain text, caption string (`IMAGE`), or structured link (`URL`). */
export type ApiChatMessageContent = string | ApiChatUrlContent;

export interface ApiChatMessageUser {
  id: string;
  name: string;
  telegramId?: string;
}

/** `GET /chat/:challengeId/messages` and `POST /chat/:challengeId/send` */
export interface ApiChatMessage {
  id: string;
  challengeId: string;
  userId: string | null;
  type: ApiChatMessageType;
  content: ApiChatMessageContent;
  /** Public URL for `IMAGE` messages from Supabase Storage */
  mediaUrl?: string | null;
  createdAt: string;
  user: ApiChatMessageUser | null;
}
