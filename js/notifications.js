import { persistNotificationConfig, state } from "./state.js";
import { getTopRecommendation } from "./recommendations.js";

function getNotificationPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function refreshNotificationPermission() {
  state.notificationConfig = {
    ...(state.notificationConfig || {}),
    permission: getNotificationPermission()
  };
  persistNotificationConfig();
  return state.notificationConfig.permission;
}

export async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const registration = await navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
    await registration.update().catch(() => {});
    state.notificationConfig = {
      ...(state.notificationConfig || {}),
      serviceWorkerReady: true
    };
    persistNotificationConfig();
    return { ok: true, scope: registration.scope };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function requestNotificationPermission() {
  if (typeof Notification === "undefined") {
    throw new Error("Notifications non supportées sur ce navigateur");
  }

  const permission = await Notification.requestPermission();
  state.notificationConfig = {
    ...(state.notificationConfig || {}),
    enabled: permission === "granted",
    permission
  };
  persistNotificationConfig();
  return permission;
}

async function showNotification(title, body, data = {}) {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: "./maya-coach-ui/web-opt/logo/maya-app-icon.jpg",
      badge: "./maya-coach-ui/web-opt/logo/maya-app-icon.jpg",
      data
    });
    return true;
  }
  if (typeof Notification !== "undefined") {
    // Fallback for browsers where service worker notifications are not ready yet.
    new Notification(title, { body });
    return true;
  }
  return false;
}

export async function notifyTopRecommendation(force = false) {
  if (!state.notificationConfig.enabled || state.notificationConfig.permission !== "granted") {
    return { sent: false, reason: "disabled" };
  }

  const top = getTopRecommendation();
  if (!top) return { sent: false, reason: "no-recommendation" };

  const lastSentAt = state.notificationConfig.lastSentAt ? new Date(state.notificationConfig.lastSentAt).getTime() : 0;
  const cooldownMs = 6 * 60 * 60 * 1000;
  if (!force && lastSentAt && Date.now() - lastSentAt < cooldownMs) {
    return { sent: false, reason: "cooldown" };
  }

  await showNotification("MAYA Coach", top.body, { action: top.action, page: top.actionPayload?.page || "" });
  state.notificationConfig = {
    ...(state.notificationConfig || {}),
    lastSentAt: new Date().toISOString()
  };
  persistNotificationConfig();
  return { sent: true };
}

export function startNotificationPulse() {
  if (typeof window === "undefined") return;
  clearInterval(startNotificationPulse.timer);
  startNotificationPulse.timer = setInterval(() => {
    if (document.hidden) return;
    notifyTopRecommendation(false).catch(() => {});
  }, 15 * 60 * 1000);
}
