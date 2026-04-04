/* eslint-disable no-restricted-globals */
self.addEventListener("push", (event) => {
  let title = "FirSquad";
  let body = "";
  let data = {};

  try {
    if (event.data) {
      const payload = event.data.json();
      if (payload && typeof payload === "object") {
        if (typeof payload.title === "string") title = payload.title;
        if (typeof payload.body === "string") body = payload.body;
        if (payload.data != null && typeof payload.data === "object") {
          data = payload.data;
        }
      }
    }
  } catch {
    /* ignore malformed payload */
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data,
      icon: "/Logo.png",
    })
  );
});
