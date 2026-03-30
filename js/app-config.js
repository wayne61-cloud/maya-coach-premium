function mergeDeep(base, override) {
  const result = { ...(base || {}) };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = mergeDeep(result[key] || {}, value);
      return;
    }
    result[key] = value;
  });
  return result;
}

function isLocalRuntimeHost() {
  if (typeof window === "undefined") return true;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

const DEFAULT_APP_CONFIG = {
  product: {
    name: "MAYA Fitness",
    supportEmail: "support@maya.fitness"
  },
  auth: {
    previewEnabled: true,
    adminEmails: []
  },
  services: {
    supabase: {
      enabled: true,
      url: "",
      anonKey: "",
      avatarBucket: "avatars",
      progressBucket: "progress-photos"
    },
    flowise: {
      enabled: true,
      apiHost: "",
      chatflowId: "",
      version: "latest"
    }
  }
};

const runtimeConfig = typeof window !== "undefined" && window.__MAYA_CONFIG__
  ? window.__MAYA_CONFIG__
  : {};

export const APP_CONFIG = mergeDeep(DEFAULT_APP_CONFIG, runtimeConfig);

export function getSupabaseProductConfig() {
  return APP_CONFIG.services?.supabase || DEFAULT_APP_CONFIG.services.supabase;
}

export function hasSupabaseProductConfig() {
  const config = getSupabaseProductConfig();
  return Boolean(config.enabled && config.url && config.anonKey);
}

export function getFlowiseProductConfig() {
  return APP_CONFIG.services?.flowise || DEFAULT_APP_CONFIG.services.flowise;
}

export function hasFlowiseProductConfig() {
  const config = getFlowiseProductConfig();
  return Boolean(config.enabled && config.apiHost && config.chatflowId);
}

export function isPreviewAuthEnabled() {
  return Boolean(APP_CONFIG.auth?.previewEnabled) && isLocalRuntimeHost();
}

export function getAdminEmails() {
  return Array.isArray(APP_CONFIG.auth?.adminEmails) ? APP_CONFIG.auth.adminEmails : [];
}
