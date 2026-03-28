import { pushRemoteState, pullRemoteState } from "./storage.js";
import {
  defaultProfile,
  persistAIConfig,
  persistFavorites,
  persistHistory,
  persistNotificationConfig,
  persistNutritionProfile,
  persistNutritionHistory,
  persistProfile,
  persistProfileSnapshots,
  persistSyncConfig,
  sanitizeAIConfig,
  sanitizeNotificationConfig,
  sanitizeProfile,
  sanitizeSyncConfig,
  state
} from "./state.js";

function buildSyncPayload() {
  return {
    profile: state.profile || null,
    profileSnapshots: state.profileSnapshots || [],
    history: state.history || [],
    favorites: [...(state.favorites || [])],
    nutritionProfile: state.nutritionProfile || null,
    nutritionHistory: state.nutritionHistory || [],
    aiConfig: state.aiConfig || null,
    notificationConfig: state.notificationConfig || null
  };
}

export function updateSyncConfig(nextConfig) {
  state.syncConfig = sanitizeSyncConfig({
    ...(state.syncConfig || {}),
    ...(nextConfig || {})
  });
  persistSyncConfig();
  return state.syncConfig;
}

export async function requestMagicLink() {
  if (!state.syncConfig.endpoint || !state.syncConfig.email) {
    throw new Error("Endpoint et email requis pour la magic link");
  }

  state.syncRuntime = { ...state.syncRuntime, status: "auth", error: "" };
  try {
    const response = await fetch(`${state.syncConfig.endpoint.replace(/\/$/, "")}/api/auth/magic-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: state.syncConfig.email })
    });
    if (!response.ok) {
      throw new Error(`Magic link HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.token) {
      state.syncConfig = sanitizeSyncConfig({
        ...(state.syncConfig || {}),
        token: json.token
      });
      persistSyncConfig();
    }
    state.syncRuntime = {
      status: "ready",
      error: "",
      lastSyncAt: new Date().toISOString()
    };
    return json;
  } catch (error) {
    state.syncRuntime = {
      ...state.syncRuntime,
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    };
    throw error;
  }
}

export async function pushSyncSnapshot() {
  state.syncRuntime = { ...state.syncRuntime, status: "push", error: "" };
  try {
    const result = await pushRemoteState(state.syncConfig, buildSyncPayload());
    state.syncRuntime = {
      status: result?.synced === false ? "idle" : "ready",
      error: "",
      lastSyncAt: result?.updatedAt || new Date().toISOString()
    };
    return result;
  } catch (error) {
    state.syncRuntime = {
      ...state.syncRuntime,
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    };
    throw error;
  }
}

export async function pullSyncSnapshot() {
  state.syncRuntime = { ...state.syncRuntime, status: "pull", error: "" };
  try {
    const remote = await pullRemoteState(state.syncConfig);
    if (!remote) {
      state.syncRuntime = { ...state.syncRuntime, status: "idle" };
      return null;
    }

    state.profile = remote.profile ? sanitizeProfile({ ...defaultProfile, ...remote.profile }) : state.profile;
    state.profileSnapshots = Array.isArray(remote.profileSnapshots) ? remote.profileSnapshots : state.profileSnapshots;
    state.history = Array.isArray(remote.history) ? remote.history : state.history;
    state.favorites = new Set(Array.isArray(remote.favorites) ? remote.favorites : [...state.favorites]);
    state.nutritionProfile = remote.nutritionProfile ?? state.nutritionProfile;
    state.nutritionHistory = Array.isArray(remote.nutritionHistory) ? remote.nutritionHistory : state.nutritionHistory;
    state.aiConfig = remote.aiConfig ? sanitizeAIConfig(remote.aiConfig) : state.aiConfig;
    state.notificationConfig = remote.notificationConfig ? sanitizeNotificationConfig(remote.notificationConfig) : state.notificationConfig;

    persistProfile();
    persistProfileSnapshots();
    persistHistory();
    persistFavorites();
    persistNutritionProfile();
    persistNutritionHistory();
    persistAIConfig();
    persistNotificationConfig();

    state.syncRuntime = {
      status: "ready",
      error: "",
      lastSyncAt: remote.updatedAt || new Date().toISOString()
    };
    return remote;
  } catch (error) {
    state.syncRuntime = {
      ...state.syncRuntime,
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    };
    throw error;
  }
}

export function scheduleAutoSync() {
  if (!state.syncConfig.autoSync || !state.syncConfig.endpoint || !state.syncConfig.token) return;
  clearTimeout(scheduleAutoSync.timer);
  scheduleAutoSync.timer = setTimeout(async () => {
    try {
      await pushSyncSnapshot();
    } catch (error) {
      state.syncRuntime = {
        ...state.syncRuntime,
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }, 1200);
}
