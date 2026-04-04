# FitSquad – API Reference

**Base URL (local dev):** `http://localhost:4000`  
**Content-Type:** `application/json` for all requests and responses.

---

## Table of Contents

1. [Auth](#1-auth)
2. [Challenge](#2-challenge)
3. [Location](#3-location)
4. [Check-in](#4-check-in)
5. [Leaderboard](#5-leaderboard)
6. [Chat (in-app group)](#6-chat-in-app-group)
7. [Error Format](#7-error-format)
8. [Check-in State Machine](#8-check-in-state-machine)
9. [Telegram Bot Events](#9-telegram-bot-events)

---

## 1. Auth

### Web app: Supabase email + password

The **Next.js frontend** uses [Supabase Auth](https://supabase.com/docs/guides/auth) (`signUp` / `signInWithPassword`). Configure **email confirmation** in Supabase; transactional mail (verification links) is typically sent via **SMTP** — e.g. [Resend with Supabase](https://supabase.com/docs/guides/auth/auth-smtp) or another provider under **Supabase → Project Settings → Authentication → SMTP**.

**Redirect URL for email links:** add your app origin and `/auth/callback` to **Supabase → Authentication → URL Configuration** (e.g. `https://fitsquad.fit/auth/callback`).

After the user signs in, the browser holds a Supabase session. **All API requests from the app include:**

```http
Authorization: Bearer <supabase_access_token>
```

The backend must **verify the JWT** (Supabase JWKS / `SUPABASE_JWT_SECRET`) and resolve the internal app user.

---

### GET `/auth/me` ⭐

Returns the logged-in user. Requires a valid `Authorization: Bearer` Supabase access token.

**Response `200 OK`**

```json
{
  "success": true,
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Ajay Singh",
    "telegramId": "",
    "email": "ajay@example.com",
    "phone": null,
    "gymLat": null,
    "gymLng": null,
    "createdAt": "2026-04-04T10:00:00.000Z",
    "updatedAt": "2026-04-04T10:00:00.000Z"
  }
}
```

| Status | Meaning |
|--------|---------|
| `401` | Missing, invalid, or expired token |

If the frontend cannot call `/auth/me` (e.g. not deployed yet), it can fall back to mapping the Supabase Auth user until the endpoint exists.

---

### POST `/auth/login` (legacy / internal)

Direct login without Supabase — optional for bots or tools.

**Request body**

```json
{
  "telegramId": "123456789",
  "name": "Ajay Singh",
  "phone": "+91 98765 43210"
}
```

**Response `200 OK`** — same `user` shape as `/auth/me`.

---

### POST `/auth/telegram` (legacy)

Telegram Login Widget payload — optional if you still support it server-side.

---

## 2. Challenge

### POST `/challenge/create`

Create a new challenge. Returns an `inviteCode` to share with friends.  
Set `telegramGroupId` to your Telegram group's chat ID to enable bot announcements.

**Request body**

```json
{
  "name": "April Grind",
  "daysPerWeek": 5,
  "durationMinutes": 40,
  "telegramGroupId": "-1001234567890"
}
```

| Field             | Type   | Required | Default | Notes                                       |
|-------------------|--------|----------|---------|---------------------------------------------|
| `name`            | string | ✅       | —       | Challenge display name                      |
| `daysPerWeek`     | number | ❌       | `5`     | Target gym days per week                    |
| `durationMinutes` | number | ❌       | `40`    | Minimum session duration to count as done  |
| `telegramGroupId` | string | ❌       | —       | Telegram group chat ID for bot messages     |

**Response `201 Created`**

```json
{
  "success": true,
  "challenge": {
    "id": "c1d2e3f4-0000-0000-0000-000000000001",
    "name": "April Grind",
    "daysPerWeek": 5,
    "durationMinutes": 40,
    "inviteCode": "A3FK92BX",
    "telegramGroupId": "-1001234567890",
    "createdAt": "2026-04-04T10:00:00.000Z"
  }
}
```

---

### POST `/challenge/join`

Join an existing challenge using its invite code.  
Triggers a Telegram welcome message to the group if configured.

**Request body**

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "inviteCode": "A3FK92BX"
}
```

| Field        | Type   | Required | Notes                              |
|--------------|--------|----------|------------------------------------|
| `userId`     | string | ✅       | `id` from `/auth/login`            |
| `inviteCode` | string | ✅       | 8-character code from challenge creator |

**Response `200 OK`**

```json
{
  "success": true,
  "participant": {
    "id": "p1p2p3p4-0000-0000-0000-000000000001",
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "challengeId": "c1d2e3f4-0000-0000-0000-000000000001",
    "streak": 0,
    "completedDays": 0,
    "lastCheckin": null,
    "joinedAt": "2026-04-04T10:05:00.000Z",
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Ajay Singh",
      "telegramId": "123456789"
    },
    "challenge": {
      "id": "c1d2e3f4-0000-0000-0000-000000000001",
      "name": "April Grind"
    }
  }
}
```

**Errors**

| Status | Message                              | Cause                              |
|--------|--------------------------------------|------------------------------------|
| `404`  | Invalid invite code                  | Code does not exist                |
| `409`  | User already joined this challenge   | Duplicate join attempt             |

---

### GET `/challenge/:id`

Get full challenge details including all participants ranked by completed days.

**URL parameter:** `id` — challenge UUID

**Response `200 OK`**

```json
{
  "success": true,
  "challenge": {
    "id": "c1d2e3f4-0000-0000-0000-000000000001",
    "name": "April Grind",
    "daysPerWeek": 5,
    "durationMinutes": 40,
    "inviteCode": "A3FK92BX",
    "telegramGroupId": "-1001234567890",
    "createdAt": "2026-04-04T10:00:00.000Z",
    "participants": [
      {
        "id": "p1p2p3p4-...",
        "userId": "a1b2c3d4-...",
        "completedDays": 12,
        "streak": 4,
        "joinedAt": "2026-04-04T10:05:00.000Z",
        "lastCheckin": "2026-04-04T09:00:00.000Z",
        "user": {
          "id": "a1b2c3d4-...",
          "name": "Ajay Singh",
          "telegramId": "123456789"
        }
      }
    ]
  }
}
```

---

## 3. Location

### POST `/location/update`

Save or update the user's gym GPS coordinates.  
**Must be called before the first check-in** — the app uses these coordinates as the gym's fixed location.

**Request body**

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "lat": 12.9716,
  "lng": 77.5946
}
```

| Field    | Type   | Required | Notes                         |
|----------|--------|----------|-------------------------------|
| `userId` | string | ✅       | `id` from `/auth/login`       |
| `lat`    | number | ✅       | Latitude (decimal degrees)    |
| `lng`    | number | ✅       | Longitude (decimal degrees)   |

**Response `200 OK`**

```json
{
  "success": true,
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Ajay Singh",
    "gymLat": 12.9716,
    "gymLng": 77.5946
  }
}
```

---

## 4. Check-in

### POST `/checkin`

Send the user's **current GPS coordinates**. The backend uses the Haversine formula to check if they are within **100 metres** of their saved gym location and manages the session state automatically.

> 📍 The frontend should call this endpoint repeatedly (e.g. every 5 minutes) while the user is in the gym.

**Request body**

```json
{
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "challengeId": "c1d2e3f4-0000-0000-0000-000000000001",
  "lat": 12.9716,
  "lng": 77.5946
}
```

| Field         | Type   | Required | Notes                        |
|---------------|--------|----------|------------------------------|
| `userId`      | string | ✅       | `id` from `/auth/login`      |
| `challengeId` | string | ✅       | Challenge UUID               |
| `lat`         | number | ✅       | User's current latitude      |
| `lng`         | number | ✅       | User's current longitude     |

---

**Possible responses — use the `message` field to drive UI state:**

#### ▶ Session started (user just arrived)
```json
{
  "success": true,
  "message": "Check-in started",
  "checkin": {
    "id": "ch1-...",
    "userId": "a1b2c3d4-...",
    "challengeId": "c1d2e3f4-...",
    "startTime": "2026-04-04T08:00:00.000Z",
    "endTime": null,
    "status": "ACTIVE"
  }
}
```

#### ⏳ Session in progress
```json
{
  "success": true,
  "message": "Session in progress",
  "checkin": { "...": "..." },
  "elapsedMinutes": 23,
  "remainingMinutes": 17
}
```

#### ✅ Session completed (≥ 40 min elapsed)
```json
{
  "success": true,
  "message": "Session completed! 🔥",
  "checkin": {
    "id": "ch1-...",
    "status": "COMPLETED",
    "startTime": "2026-04-04T08:00:00.000Z",
    "endTime": "2026-04-04T08:45:00.000Z"
  }
}
```

#### ⚠️ Left early (user moved outside radius)
```json
{
  "success": true,
  "message": "Session marked incomplete – you left before finishing",
  "checkin": {
    "id": "ch1-...",
    "status": "INCOMPLETE",
    "endTime": "2026-04-04T08:20:00.000Z"
  }
}
```

#### 🚫 Not at gym
```json
{
  "success": true,
  "message": "User is not at the gym",
  "inside": false
}
```

#### ✋ Already done for today
```json
{
  "success": true,
  "message": "Session already completed today",
  "checkin": { "...": "..." }
}
```

**Errors**

| Status | Message                                                          | Cause                                  |
|--------|------------------------------------------------------------------|----------------------------------------|
| `400`  | No gym location saved for this user…                            | Call `/location/update` first         |
| `403`  | User is not a participant in this challenge                      | Call `/challenge/join` first           |
| `404`  | User not found                                                   | Invalid `userId`                       |

---

## 5. Leaderboard

### GET `/leaderboard/:challengeId`

Returns participants ranked by `completedDays` (desc), with `streak` as a tiebreaker.

**URL parameter:** `challengeId` — challenge UUID

**Response `200 OK`**

```json
{
  "success": true,
  "challenge": {
    "id": "c1d2e3f4-0000-0000-0000-000000000001",
    "name": "April Grind"
  },
  "leaderboard": [
    {
      "rank": 1,
      "userId": "a1b2c3d4-...",
      "name": "Ajay Singh",
      "telegramId": "123456789",
      "completedDays": 18,
      "streak": 5,
      "joinedAt": "2026-04-01T10:00:00.000Z",
      "lastCheckin": "2026-04-04T09:00:00.000Z"
    },
    {
      "rank": 2,
      "userId": "b2c3d4e5-...",
      "name": "John",
      "telegramId": "987654321",
      "completedDays": 14,
      "streak": 3,
      "joinedAt": "2026-04-01T11:00:00.000Z",
      "lastCheckin": "2026-04-03T08:30:00.000Z"
    }
  ]
}
```

---

## 6. Chat (in-app group)

In-app group chat per challenge. The frontend talks to your API **only** — use `GET /chat/:challengeId/messages` and `POST /chat/:challengeId/send`.  
There is **no third-party realtime SDK** on the client: poll message history on an interval (e.g. every 5–10 seconds) while the chat view is open, and optionally refetch when the window regains focus.

Messages have two types:
- **`USER`** — sent by a real participant
- **`SYSTEM`** — auto-generated events (entered gym, completed, missed, joined)

---

### POST `/chat/:challengeId/send`

Send a user message to the challenge chat.

**URL parameter:** `challengeId` — challenge UUID

**Request body**

```json
{
  "userId": "a1b2c3d4-...",
  "content": "Let's crush it today! 💪"
}
```

**Response `201 Created`**

```json
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "challengeId": "c1d2e3f4-...",
    "userId": "a1b2c3d4-...",
    "type": "USER",
    "content": "Let's crush it today! 💪",
    "createdAt": "2026-04-04T09:15:00.000Z",
    "user": { "id": "a1b2c3d4-...", "name": "Ajay Singh", "telegramId": "123456789" }
  }
}
```

**Errors**

| Status | Message                                        | Cause                            |
|--------|------------------------------------------------|----------------------------------|
| `400`  | userId and content are required                | Missing fields                   |
| `400`  | Message content cannot be empty                | Blank content string             |
| `403`  | You are not a participant in this challenge     | User not joined                  |

---

### GET `/chat/:challengeId/messages`

Fetch paginated message history (most recent 50 by default).

**URL parameter:** `challengeId` — challenge UUID

**Query params**

| Param   | Type   | Default | Description                                        |
|---------|--------|---------|----------------------------------------------------|
| `limit` | number | `50`    | Max messages to return                             |
| `before`| ISO string | — | Cursor: return messages older than this timestamp  |

**Response `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "id": "msg-uuid-1",
      "challengeId": "c1d2e3f4-...",
      "userId": null,
      "type": "SYSTEM",
      "content": "👋 Ajay Singh joined the challenge!",
      "createdAt": "2026-04-01T10:00:00.000Z",
      "user": null
    },
    {
      "id": "msg-uuid-2",
      "challengeId": "c1d2e3f4-...",
      "userId": "a1b2c3d4-...",
      "type": "USER",
      "content": "Let's crush it today! 💪",
      "createdAt": "2026-04-04T09:15:00.000Z",
      "user": { "id": "a1b2c3d4-...", "name": "Ajay Singh" }
    }
  ]
}
```

To load older messages (infinite scroll), pass the `createdAt` of the oldest message as the `before` cursor:

```
GET /chat/c1d2e3f4-.../messages?limit=50&before=2026-04-04T09:15:00.000Z
```

---

### Frontend: polling (no third-party SDK)

While the chat screen is visible, call `GET /chat/:challengeId/messages` on a timer (e.g. every 5–10 s) to pick up new messages. Clear the interval on unmount. Optionally refetch when `document.visibilityState` becomes `"visible"` so returning to the tab refreshes the thread.

---

### System messages fired automatically

| Trigger                         | Message content                                         |
|---------------------------------|---------------------------------------------------------|
| User joins challenge            | 👋 *Ajay* joined the challenge!                        |
| User enters gym (ACTIVE)        | 💪 *Ajay* entered the gym!                             |
| Session COMPLETED               | 🔥 *Ajay* completed today's workout!                   |
| CRON 23:00 (missed)             | ❌ *Ajay* missed today's workout. Streak reset to 0.   |

---

## 7. Error Format

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

| HTTP Status | Meaning                                          |
|-------------|--------------------------------------------------|
| `400`       | Bad request — missing or invalid fields          |
| `403`       | Forbidden — user not a participant               |
| `404`       | Not found — resource doesn't exist               |
| `409`       | Conflict — duplicate (e.g. already joined)       |
| `500`       | Internal server error                            |

---

## 8. Check-in State Machine

```
User opens app
      │
      ▼
POST /location/update  ← (one-time setup: save gym GPS)
      │
      ▼
POST /checkin  ←──────────────────────────────────────────┐
      │                                                    │
  inside gym?                                             Poll every
   ─────────                                              5 minutes
  YES        NO
   │          │
   │     active session?
   │       ─────────
   │      YES       NO
   │       │         │
   │   INCOMPLETE   "Not at gym"
   │   (left early)
   │
  active session today?
   ─────────────────
  NO                YES
   │                 │
  ACTIVE          elapsed >= durationMinutes?
  (start timer)    ───────────────────────
                  YES              NO
                   │                │
               COMPLETED      "In progress"
               (🔥 done!)     (show timer)
```

---

## 9. Telegram Bot Events

These messages are sent **automatically** to the configured Telegram group — no API call needed from the frontend.

| Trigger                    | Message sent to group                                           |
|----------------------------|-----------------------------------------------------------------|
| User joins challenge       | 🎉 *Ajay* just joined the *April Grind* challenge!             |
| `/checkin` → session start | 💪 *Ajay* just entered the gym!                                |
| `/checkin` → COMPLETED     | 🔥 *Ajay* completed today's workout!                           |
| CRON at 23:00 (missed)     | 😴 *John* skipped today…                                       |

To enable bot messages, pass `telegramGroupId` (the group's chat ID, e.g. `-1001234567890`) when calling `POST /challenge/create`.

---

## Quick-Start Flow (frontend integration order)

```
1. Supabase Auth (email + password) → verification email (SMTP e.g. Resend) → session
   GET /auth/me                      → Bearer token → userId for other calls

2. POST /location/update         → save gym GPS (once, or when user changes gym)

3. POST /challenge/create        → get inviteCode  (challenge creator)
   POST /challenge/join          → join with inviteCode (members)

4. Poll POST /checkin            → every 5 min while user is active

5. GET  /leaderboard/:id         → show rankings on leaderboard screen
6. GET  /challenge/:id           → show challenge details + participant list

7. GET  /chat/:id/messages       → load message history when chat screen opens
   POST /chat/:id/send           → send a message
   Poll GET /chat/:id/messages   → while chat is open (no third-party realtime client)
```
