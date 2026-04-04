import { api } from "@/lib/api";

function getBearerForFetch(): string | null {
  const auth = api.defaults.headers.common.Authorization;
  return typeof auth === "string" && auth.startsWith("Bearer ") ? auth : null;
}

/**
 * On app load when authenticated: ensure SW is active, then only subscribe + POST
 * if there is no existing PushSubscription. If already subscribed, no-op.
 * Logout does not call pushManager.unsubscribe — JWT is cleared elsewhere.
 */
export async function trySubscribePushNotifications(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const bearer = getBearerForFetch();
  if (!bearer) return;

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const reg = await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (sub) return;

    if (Notification.permission === "denied") return;
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    }

    const { publicKey } = await fetch("/push/vapid-public-key").then((r) =>
      r.json()
    ) as { publicKey?: string };
    if (!publicKey || typeof publicKey !== "string") return;

    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: publicKey,
    });

    await fetch("/push/register-subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: bearer,
      },
      body: JSON.stringify({ userId, subscription: sub.toJSON() }),
    });
  } catch {
    /* network, missing routes, or permission denied */
  }
}
