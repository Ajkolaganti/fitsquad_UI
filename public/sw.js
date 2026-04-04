/* eslint-disable no-restricted-globals */
/**
 * Web Push: `PushMessageData.json()` returns a Promise — it must be awaited.
 * Otherwise title/body are never read and Android shows "Notification from [site name]".
 */

function normalizePushPayload(raw) {
  if (raw == null || typeof raw !== "object") {
    return { title: "", body: "", data: {} };
  }
  const nested =
    raw.notification != null && typeof raw.notification === "object"
      ? raw.notification
      : null;
  const title =
    (typeof raw.title === "string" && raw.title) ||
    (nested && typeof nested.title === "string" && nested.title) ||
    "";
  const body =
    (typeof raw.body === "string" && raw.body) ||
    (nested && typeof nested.body === "string" && nested.body) ||
    "";
  let data = {};
  if (raw.data != null && typeof raw.data === "object") {
    data = raw.data;
  } else if (nested && nested.data != null && typeof nested.data === "object") {
    data = nested.data;
  }
  return { title, body, data };
}

async function readPushPayload(pushEvent) {
  if (!pushEvent.data) {
    return { title: "", body: "", data: {} };
  }
  try {
    const raw = await pushEvent.data.json();
    return normalizePushPayload(raw);
  } catch {
    try {
      const text = await pushEvent.data.text();
      const trimmed = text.trim();
      if (!trimmed) return { title: "", body: "", data: {} };
      try {
        const parsed = JSON.parse(trimmed);
        return normalizePushPayload(parsed);
      } catch {
        return { title: "FitSquad", body: trimmed, data: {} };
      }
    } catch {
      return { title: "", body: "", data: {} };
    }
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      const parsed = await readPushPayload(event);
      const title = parsed.title.trim() || "FitSquad";
      const body = parsed.body.trim() || "Open the app for details.";
      const data = parsed.data && typeof parsed.data === "object" ? parsed.data : {};

      await self.registration.showNotification(title, {
        body,
        data,
        icon: "/Logo.png",
        badge: "/Logo.png",
        tag: typeof data.tag === "string" ? data.tag : "fitsquad-default",
        renotify: true,
        vibrate: [120, 80, 120],
      });
    })()
  );
});
