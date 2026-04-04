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

## 6. Chat (Realtime)

In-app group chat per challenge, powered by **Supabase Realtime**.  
Every insert into the `messages` table is broadcast instantly to all subscribed frontend clients — no websocket server needed on your backend.

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

### Frontend: Supabase Realtime subscription

The JS client uses the **Postgres Changes** API (`postgres_changes`), which streams WAL events over a websocket.

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

Subscribe to new messages for a specific challenge (add this when the chat screen mounts):

```js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://bjinxlathsbgwydncaob.supabase.co',
  'YOUR_ANON_PUBLIC_KEY'  // safe to expose — RLS is enforced server-side
);

function subscribeToChallengeChat(challengeId, onMessage) {
  const channel = supabase
    .channel(`chat:${challengeId}`)
    .on(
      'postgres_changes',        // Postgres Changes (WAL → websocket)
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `challengeId=eq.${challengeId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  // Call the returned cleanup function when the screen unmounts
  return () => supabase.removeChannel(channel);
}

// ── React example ──────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';

function ChatScreen({ challengeId }) {
  const [messages, setMessages] = useState([]);

  // Load history on mount
  useEffect(() => {
    fetch(`/chat/${challengeId}/messages`)
      .then(r => r.json())
      .then(({ data }) => setMessages(data));
  }, [challengeId]);

  // Subscribe to live updates
  useEffect(() => {
    const unsubscribe = subscribeToChallengeChat(challengeId, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    });
    return unsubscribe;
  }, [challengeId]);

  return (
    <div>
      {messages.map(m => (
        <div key={m.id} className={m.type === 'SYSTEM' ? 'system-msg' : 'user-msg'}>
          {m.type === 'USER' && <strong>{m.user?.name}: </strong>}
          {m.content}
        </div>
      ))}
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
   POST /chat/:id/send           → send a message
   supabase.channel()            → subscribe for live messages (Realtime)

── Password reset flow ──────────────────────────────────────────────────────────
POST /auth/forgot-password       → { email }  → sends reset email
(user clicks link in email)      → frontend shows new-password form
POST /auth/reset-password        → { token, newPassword }  → updates password
```
