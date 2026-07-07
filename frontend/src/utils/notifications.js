import api from "../services/api";

// Helper to convert base64 url-safe VAPID key to Uint8Array for push manager subscription
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

/**
 * Request permission for showing system/browser notifications.
 */
export const requestNotificationPermission = () => {
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }
};

/**
 * Display a local browser notification if permission is granted.
 * @param {string} title
 * @param {string} body
 */
export const pushBrowserNotification = (title, body) => {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      const n = new Notification(title, {
        body: body || "",
        icon: "/favicon.svg",
      });
      n.onclick = () => {
        window.focus();
      };
      return n;
    } catch (e) {
      console.warn("Could not display notification:", e);
    }
  }
  return null;
};

/**
 * Register service worker and subscribe to real background Web Push notifications.
 */
export const setupPushNotifications = async () => {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    console.warn("Push messaging is not supported in this browser.");
    return;
  }

  try {
    // 1. Register service worker
    const registration = await navigator.serviceWorker.register("/sw.js");

    // 2. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    // 3. Fetch VAPID public key
    const { data } = await api.get("/notifications/vapid-key");
    if (!data.publicKey) return;

    // 4. Subscribe
    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    };

    const subscription = await registration.pushManager.subscribe(subscribeOptions);

    // 5. Send to backend
    await api.post("/notifications/subscribe", { subscription });
    console.log("🔔 Push notification sync registered successfully!");
  } catch (err) {
    if (err.name === "AbortError") {
      console.log("ℹ️ Push subscription aborted by browser push service. This is expected in offline or sandboxed dev environments.");
    } else {
      console.warn("Could not register background push notifications:", err);
    }
  }
};
