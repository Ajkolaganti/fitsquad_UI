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
6. [Chat (Realtime)](#6-chat-realtime)
7. [Error Format](#7-error-format)
8. [Check-in State Machine](#8-check-in-state-machine)
9. [Telegram Bot Events](#9-telegram-bot-events)

---

## 1. Auth

Authentication uses **email + password**. FitSquad owns the entire email flow — Supabase Auth is used only as a credential store and JWT issuer. All verification and password-reset emails are sent by **our backend** via Resend SMTP with custom HTML templates.

**Email flow overview:**

| Event | Email sent | Template |
|-------|-----------|----------|
| Register | Verification email (24 h link) | `verifyEmail` |
| Verify email | Welcome email | `welcomeEmail` |
| Forgot password | Reset link (1 h) | `forgotPassword` |
| Workout completed | Workout stats notification | `workoutComplete` |
| Missed workout (cron) | Missed workout warning | `missedWorkout` |
| Joined challenge | Invite code card | `joinedChallenge` |

---

### POST `/auth/register`

Create a new account. The backend:
1. Creates the Supabase Auth user with `email_confirm: true` (so Supabase sends **no** email).
2. Saves the user row in the `users` table (same UUID as Supabase Auth).
3. Generates a 64-byte random verification token (24 h expiry), stores it in the DB.
4. Sends a beautiful HTML verification email via Resend SMTP.

**Request body**

```json
{
  "name": "Ajay Singh",
  "email": "ajay@example.com",
  "password": "supersecret123"
}
```

**Response `201 Created`**

```json
{
  "success": true,
  "message": "Registration successful. Check your email to verify your account.",
  "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Errors**

| Status | Message | Cause |
|--------|---------|-------|
| `400`  | name, email and password are required | Missing field |
| `409`  | Email already registered | Duplicate account |

---

### POST `/auth/login`

Sign in with email and password. Returns a Supabase JWT you can use as `Authorization: Bearer <token>`.  
**Login is blocked** until the user clicks the verification link in their email.

**Request body**

```json
{
  "email": "ajay@example.com",
  "password": "supersecret123"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "v1.xxxxx...",
  "user": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Ajay Singh",
    "email": "ajay@example.com"
  }
}
```

**Errors**

| Status | Message | Cause |
|--------|---------|-------|
| `400`  | email and password are required | Missing field |
| `401`  | Invalid email or password | Wrong credentials |
| `403`  | Email not verified. Please check your inbox… | `emailVerifiedAt` is null |

---

### POST `/auth/verify-email`

Called by the frontend after the user clicks the link in the verification email.  
The frontend extracts `?token=` from the URL and POSTs it here.

**Request body**

```json
{ "token": "a3f9e2c1..." }
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Email verified! Welcome to FitSquad."
}
```

**Errors**

| Status | Message | Cause |
|--------|---------|-------|
| `400`  | Invalid or already-used verification token | Token not found |
| `410`  | Verification link has expired | Token past 24 h |

> After verification a **Welcome email** is automatically sent to the user.

---

### POST `/auth/resend-verification`

Regenerates and resends the verification email if the link expired or was lost.

**Request body**

```json
{ "email": "ajay@example.com" }
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Verification email resent. Check your inbox."
}
```

**Errors**

| Status | Message | Cause |
|--------|---------|-------|
| `404`  | No account found with that email | Unknown email |
| `409`  | This email is already verified | Already done |

---

### POST `/auth/forgot-password`

Sends a password-reset email with a 1-hour token link.  
Always returns the same message to prevent user enumeration.

**Request body**

```json
{ "email": "ajay@example.com" }
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "If an account exists for that email, a reset link has been sent."
}
```

---

### POST `/auth/reset-password`

Validates the reset token and updates the password in Supabase Auth.  
The frontend extracts `?token=` from the reset URL and POSTs it here along with the new password.

**Request body**

```json
{
  "token": "b7d2f143...",
  "newPassword": "mynewpassword99"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Password updated successfully. You can now log in."
}
```

**Errors**

| Status | Message | Cause |
|--------|---------|-------|
| `400`  | token and newPassword are required | Missing field |
| `400`  | Password must be at least 8 characters | Too short |
| `400`  | Invalid or already-used reset token | Token not found |
| `410`  | Reset link has expired | Token past 1 h |

---

### Email setup (one-time)

Add to `.env`:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
MAIL_FROM_ONBOARDING=FitSquad <onboarding@fitsquad.fit>
MAIL_FROM_NOTIFICATIONS=FitSquad <notifications@fitsquad.fit>
MAIL_FROM_SUPPORT=FitSquad <support@fitsquad.fit>
FRONTEND_URL=http://localhost:3000
```

> Verify `fitsquad.fit` (or your domain) at [resend.com/domains](https://resend.com/domains) so the `@fitsquad.fit` senders work. In dev you can temporarily use `onboarding@resend.dev` (delivers only to your Resend-verified email).

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
  "telegramGroupId": "-1001234567890",
  "challengeKind": "split_focus",
  "focus": { "splitId": "push" },
  "goalSummary": "Push (chest, shoulders, triceps) · 5×/week · 40 min"
}
```

| Field             | Type   | Required | Default | Notes                                       |
|-------------------|--------|----------|---------|---------------------------------------------|
| `name`            | string | ✅       | —       | Challenge display name                      |
| `daysPerWeek`     | number | ❌       | `5`     | Target gym days per week                    |
| `durationMinutes` | number | ❌       | `40`    | Minimum session duration to count as done  |
| `telegramGroupId` | string | ❌       | —       | Telegram group chat ID for bot messages     |
| `challengeKind`   | string | ❌       | —       | `attendance` \| `split_focus` \| `exercise_focus` \| `custom_text` — how the squad frames the challenge (attendance rules unchanged) |
| `focus`           | object | ❌       | —       | Optional structured focus; e.g. `{ "splitId" }`, `{ "exerciseId", "modalityId" }`, `{ "customText" }` |
| `goalSummary`     | string | ❌       | —       | Human-readable one-liner for UI cards       |
| `rules`           | object | ❌       | —       | Reserved for future rule payloads (volume targets, etc.) |

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
    "challengeKind": "split_focus",
    "focus": { "splitId": "push" },
    "goalSummary": "Push (chest, shoulders, triceps) · 5×/week · 40 min",
    "createdAt": "2026-04-04T10:00:00.000Z"
  }
}
```

> **Gym challenge metadata:** `challengeKind`, `focus`, `goalSummary`, and `rules` are optional. The backend may ignore unknown fields until persisted. Check-in and completion logic remains GPS + minimum session duration unless workout logging is added later.

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
    "challengeKind": "split_focus",
    "focus": { "splitId": "push" },
    "goalSummary": "Push (chest, shoulders, triceps) · 5×/week · 40 min",
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

## 6. Chat (Realtime)

In-app group chat per challenge, powered by **Supabase Realtime**.  
Every insert into the `messages` table is broadcast instantly to all subscribed frontend clients — no websocket server needed on your backend.

**HTTP endpoints (this section)**

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/chat/:challengeId/send` | Plain text (`USER`) |
| `POST` | `/chat/:challengeId/send-image` | Image upload — `multipart/form-data` (`IMAGE`) |
| `POST` | `/chat/:challengeId/send-url` | Link share — JSON body (`URL`) |
| `GET` | `/chat/:challengeId/messages` | Paginated history (decrypted) |

Messages have four types:
- **`USER`** — plain text sent by a participant
- **`IMAGE`** — image shared by a participant (`mediaUrl` = Supabase Storage URL, `content` = optional caption)
- **`URL`** — link shared by a participant (`content` = `{ url, text }` object)
- **`SYSTEM`** — auto-generated events (entered gym, completed, missed, joined)

> **Encryption:** All `content` and `mediaUrl` values are AES-256-GCM encrypted in the database.
> The backend decrypts them before sending API responses — the frontend always receives plaintext.
> However, **Supabase Realtime `payload.new` carries raw DB rows (still encrypted)**,
> so always fetch decrypted messages through the REST API (see Realtime section below).

---

### POST `/chat/:challengeId/send`

Send a plain-text message.

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
    "mediaUrl": null,
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

### POST `/chat/:challengeId/send-image`

Upload and share an image. Use `multipart/form-data`.

**URL parameter:** `challengeId` — challenge UUID

**Form fields**

| Field     | Type   | Required | Notes                                          |
|-----------|--------|----------|------------------------------------------------|
| `userId`  | string | ✅       | Sender's user UUID                             |
| `image`   | file   | ✅       | JPEG / PNG / GIF / WebP, max **10 MB**         |
| `caption` | string | ❌       | Optional text caption for the image            |

**Example (fetch)**

```js
const form = new FormData();
form.append('userId', userId);
form.append('image', imageFile);       // File/Blob object
form.append('caption', 'Post-workout!'); // optional

const res = await fetch(`/chat/${challengeId}/send-image`, {
  method: 'POST',
  body: form,
  // Do NOT set Content-Type — the browser sets it with the correct boundary
});
const { data } = await res.json();
```

**Response `201 Created`**

```json
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "challengeId": "c1d2e3f4-...",
    "userId": "a1b2c3d4-...",
    "type": "IMAGE",
    "content": "Post-workout!",
    "mediaUrl": "https://bjinxlathsbgwydncaob.supabase.co/storage/v1/object/public/chat-media/c1d2e3f4-.../abc123.jpeg",
    "createdAt": "2026-04-04T09:20:00.000Z",
    "user": { "id": "a1b2c3d4-...", "name": "Ajay Singh", "telegramId": "123456789" }
  }
}
```

**Errors**

| Status | Message                                        | Cause                              |
|--------|------------------------------------------------|------------------------------------|
| `400`  | userId is required                             | Missing userId                     |
| `400`  | Image file is required                         | No file attached                   |
| `400`  | Unsupported file type…                         | Not JPEG/PNG/GIF/WebP              |
| `400`  | Image exceeds the 10 MB size limit             | File too large                     |
| `403`  | You are not a participant in this challenge     | User not joined                    |

---

### POST `/chat/:challengeId/send-url`

Share a URL (link preview style, like WhatsApp).

**URL parameter:** `challengeId` — challenge UUID

**Request body**

```json
{
  "userId": "a1b2c3d4-...",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "text": "Great warm-up video!"
}
```

| Field    | Type   | Required | Notes                                         |
|----------|--------|----------|-----------------------------------------------|
| `userId` | string | ✅       | Sender's user UUID                            |
| `url`    | string | ✅       | Must be `http://` or `https://`               |
| `text`   | string | ❌       | Optional display note / title                 |

**Response `201 Created`**

```json
{
  "success": true,
  "data": {
    "id": "msg-uuid",
    "challengeId": "c1d2e3f4-...",
    "userId": "a1b2c3d4-...",
    "type": "URL",
    "content": {
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "text": "Great warm-up video!"
    },
    "mediaUrl": null,
    "createdAt": "2026-04-04T09:25:00.000Z",
    "user": { "id": "a1b2c3d4-...", "name": "Ajay Singh", "telegramId": "123456789" }
  }
}
```

**Errors**

| Status | Message                                        | Cause                                     |
|--------|------------------------------------------------|-------------------------------------------|
| `400`  | userId and url are required                    | Missing fields                            |
| `400`  | Invalid URL. Only http:// and https://…        | Bad URL or non-http protocol              |
| `403`  | You are not a participant in this challenge     | User not joined                           |

---

### GET `/chat/:challengeId/messages`

Fetch paginated message history (most recent 50 by default). All fields are **decrypted**.

**URL parameter:** `challengeId` — challenge UUID

**Query params**

| Param   | Type       | Default | Description                                        |
|---------|------------|---------|----------------------------------------------------|
| `limit` | number     | `50`    | Max messages to return                             |
| `before`| ISO string | —       | Cursor: return messages older than this timestamp  |

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
      "mediaUrl": null,
      "createdAt": "2026-04-01T10:00:00.000Z",
      "user": null
    },
    {
      "id": "msg-uuid-2",
      "challengeId": "c1d2e3f4-...",
      "userId": "a1b2c3d4-...",
      "type": "USER",
      "content": "Let's crush it today! 💪",
      "mediaUrl": null,
      "createdAt": "2026-04-04T09:15:00.000Z",
      "user": { "id": "a1b2c3d4-...", "name": "Ajay Singh" }
    },
    {
      "id": "msg-uuid-3",
      "challengeId": "c1d2e3f4-...",
      "userId": "a1b2c3d4-...",
      "type": "IMAGE",
      "content": "Post-workout!",
      "mediaUrl": "https://bjinxlathsbgwydncaob.supabase.co/storage/v1/object/public/chat-media/c1d2-.../abc.jpeg",
      "createdAt": "2026-04-04T09:20:00.000Z",
      "user": { "id": "a1b2c3d4-...", "name": "Ajay Singh" }
    },
    {
      "id": "msg-uuid-4",
      "challengeId": "c1d2e3f4-...",
      "userId": "a1b2c3d4-...",
      "type": "URL",
      "content": { "url": "https://youtube.com/...", "text": "Great warm-up video!" },
      "mediaUrl": null,
      "createdAt": "2026-04-04T09:25:00.000Z",
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

### Frontend: Supabase Realtime subscription

The JS client uses the **Postgres Changes** API (`postgres_changes`), which streams WAL events over a websocket.

> ⚠️ **Important — encryption:** Supabase Realtime sends the raw DB row in `payload.new`,
> which contains **encrypted** `content` and `mediaUrl` values. The frontend must **not** render
> `payload.new` directly. Instead, use the Realtime event as a signal and fetch the decrypted
> message from the REST API (demonstrated below).

**One-time SQL setup (run in Supabase SQL Editor):**

```sql
-- 1. Add the messages table to the Supabase Realtime publication so
--    WAL changes are streamed to connected clients.
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 2. If Row Level Security is enabled on your project, add a read policy
--    so the anon/authenticated role can receive the streamed rows.
--    (Skip if RLS is OFF on the messages table.)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenge participants can read messages"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM participants
    WHERE participants."challengeId" = messages."challengeId"
  )
);
```

> **Note:** The backend inserts messages using the `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS).  
> The frontend subscribes using the public `SUPABASE_ANON_KEY`, so the SELECT policy above  
> controls what change events are forwarded to subscribers.

Install the Supabase JS client in your frontend:

```bash
npm install @supabase/supabase-js
```

Subscribe to new messages and fetch decrypted data via the API:

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bjinxlathsbgwydncaob.supabase.co',
  'YOUR_ANON_PUBLIC_KEY'  // safe to expose — RLS is enforced server-side
);

/**
 * Subscribe to new messages for a challenge.
 * On each INSERT we fetch the decrypted message from the REST API
 * (Realtime payload.new holds encrypted DB values).
 *
 * @param {string}   challengeId
 * @param {function} onMessage  - called with the decrypted message object
 * @returns {function} cleanup – call on unmount
 */
function subscribeToChallengeChat(challengeId, onMessage) {
  const channel = supabase
    .channel(`chat:${challengeId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `challengeId=eq.${challengeId}`,
      },
      async (payload) => {
        // payload.new.content is encrypted – fetch decrypted version via API
        try {
          const res = await fetch(
            `/chat/${challengeId}/messages?limit=1`
          );
          const { data } = await res.json();
          // data[0] is the most recent message; verify it's the one that just arrived
          if (data.length > 0 && data[data.length - 1].id === payload.new.id) {
            onMessage(data[data.length - 1]);
          } else {
            // Fallback: re-fetch slightly broader window and filter by id
            const res2 = await fetch(`/chat/${challengeId}/messages?limit=5`);
            const { data: msgs } = await res2.json();
            const found = msgs.find(m => m.id === payload.new.id);
            if (found) onMessage(found);
          }
        } catch (err) {
          console.error('[chat] Failed to fetch decrypted message:', err);
        }
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ── React example ──────────────────────────────────────────────────────────
import { useEffect, useState, useRef } from 'react';

function ChatScreen({ challengeId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const seenIds = useRef(new Set());   // dedup guard

  function addMessage(msg) {
    if (seenIds.current.has(msg.id)) return;
    seenIds.current.add(msg.id);
    setMessages(prev => [...prev, msg]);
  }

  // Load history on mount
  useEffect(() => {
    fetch(`/chat/${challengeId}/messages`)
      .then(r => r.json())
      .then(({ data }) => {
        data.forEach(m => seenIds.current.add(m.id));
        setMessages(data);
      });
  }, [challengeId]);

  // Subscribe to live updates
  useEffect(() => {
    const unsubscribe = subscribeToChallengeChat(challengeId, addMessage);
    return unsubscribe;
  }, [challengeId]);

  // ── send helpers ──────────────────────────────────────────────────────────

  async function handleSendText(text) {
    await fetch(`/chat/${challengeId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, content: text }),
    });
    // Realtime will deliver the new message via the subscription above
  }

  async function handleSendImage(file, caption) {
    const form = new FormData();
    form.append('userId', currentUserId);
    form.append('image', file);
    if (caption) form.append('caption', caption);
    await fetch(`/chat/${challengeId}/send-image`, { method: 'POST', body: form });
  }

  async function handleSendUrl(url, text) {
    await fetch(`/chat/${challengeId}/send-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, url, text }),
    });
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="chat">
      {messages.map(m => <ChatBubble key={m.id} message={m} />)}
    </div>
  );
}

/** Renders a single message bubble based on its type. */
function ChatBubble({ message: m }) {
  if (m.type === 'SYSTEM') {
    return <div className="system-msg">{m.content}</div>;
  }

  return (
    <div className="user-msg">
      <strong>{m.user?.name}: </strong>

      {m.type === 'USER' && (
        <span>{m.content}</span>
      )}

      {m.type === 'IMAGE' && (
        <div>
          <img
            src={m.mediaUrl}
            alt={m.content || 'shared image'}
            style={{ maxWidth: 300, borderRadius: 8 }}
          />
          {m.content && <p style={{ marginTop: 4 }}>{m.content}</p>}
        </div>
      )}

      {m.type === 'URL' && (
        <div className="url-preview">
          <a href={m.content.url} target="_blank" rel="noopener noreferrer">
            {m.content.url}
          </a>
          {m.content.text && <p>{m.content.text}</p>}
        </div>
      )}
    </div>
  );
}
```

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
1. POST /auth/register           → creates account; user gets a verification email

2. POST /auth/verify-email       → { token } from ?token= in the email link
   (backend sets emailVerifiedAt; sends welcome email)

3. POST /auth/login              → returns JWT token + userId + refreshToken

4. POST /location/update         → save gym GPS (once, or when user changes gym)

5. POST /challenge/create        → get inviteCode  (challenge creator)
   POST /challenge/join          → join with inviteCode (members)
   (backend sends joinedChallenge email automatically)

6. Poll POST /checkin            → every 5 min while user is active
   (backend sends workoutComplete email when session closes)

7. GET  /leaderboard/:id         → show rankings on leaderboard screen
8. GET  /challenge/:id           → show challenge details + participant list

9. GET  /chat/:id/messages       → load message history when chat screen opens
   POST /chat/:id/send           → send a plain-text message
   POST /chat/:id/send-image     → upload & share an image (multipart/form-data: userId, image, caption?)
   POST /chat/:id/send-url       → share a URL (body: { userId, url, text? })
   supabase.channel()            → subscribe for live messages (Realtime signal → fetch via API to decrypt)

── Password reset flow ──────────────────────────────────────────────────────────
POST /auth/forgot-password       → { email }  → sends reset email
(user clicks link in email)      → frontend shows new-password form
POST /auth/reset-password        → { token, newPassword }  → updates password
```
