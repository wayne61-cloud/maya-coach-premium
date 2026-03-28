import { storageAvailable } from "./storage.js";
import { state } from "./state.js";

export function getAppDiagnostics() {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const serviceWorkerSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const cloudConfigured = state.aiConfig.mode === "proxy"
    ? Boolean(state.aiConfig.proxyEndpoint)
    : state.aiConfig.mode === "direct"
      ? Boolean(state.aiConfig.apiKey)
      : false;

  return {
    storageOk: storageAvailable(),
    online,
    notificationSupported,
    serviceWorkerSupported,
    cloudConfigured,
    syncConfigured: Boolean(state.syncConfig.endpoint && state.syncConfig.token),
    aiMode: state.aiConfig.mode,
    aiRuntime: state.aiRuntime,
    syncRuntime: state.syncRuntime,
    notificationConfig: state.notificationConfig
  };
}

export function getCloudModeLabel() {
  const labels = {
    local: "Local",
    proxy: "Internet sécurisé",
    direct: "Internet direct"
  };
  return labels[state.aiConfig.mode] || "Local";
}
