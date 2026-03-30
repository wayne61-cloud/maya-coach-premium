import { hasFlowiseProductConfig, hasSupabaseProductConfig } from "./app-config.js";
import { storageAvailable } from "./storage.js";
import { state } from "./state.js";

function isLocalHostEnvironment() {
  if (typeof window === "undefined") return true;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function isLoopbackEndpoint(endpoint) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(endpoint || "").trim());
}

export function getAppDiagnostics() {
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const notificationSupported = typeof window !== "undefined" && "Notification" in window;
  const serviceWorkerSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const localHost = isLocalHostEnvironment();
  const proxyPublicBlocked = state.aiConfig.mode === "proxy"
    && !localHost
    && isLoopbackEndpoint(state.aiConfig.proxyEndpoint);
  const cloudConfigured = state.aiConfig.mode === "proxy"
    ? Boolean(state.aiConfig.proxyEndpoint) && !proxyPublicBlocked
    : state.aiConfig.mode === "direct"
      ? Boolean(state.aiConfig.apiKey)
      : false;

  return {
    storageOk: storageAvailable(),
    online,
    notificationSupported,
    serviceWorkerSupported,
    cloudConfigured,
    proxyPublicBlocked,
    localHost,
    syncConfigured: Boolean(state.syncConfig.endpoint && state.syncConfig.token),
    supabaseConfigured: hasSupabaseProductConfig(),
    flowiseConfigured: hasFlowiseProductConfig(),
    aiMode: state.aiConfig.mode,
    aiRuntime: state.aiRuntime,
    syncRuntime: state.syncRuntime,
    notificationConfig: state.notificationConfig,
    authState: state.authState,
    supabaseConfig: state.supabaseConfig,
    flowiseConfig: state.flowiseConfig
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
