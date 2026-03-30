export const STORAGE_KEYS = {
  favorites: "maya_favorites_v3",
  history: "maya_history_v3",
  nutritionProfile: "maya_nutrition_profile_v2",
  nutritionHistory: "maya_nutrition_history_v1",
  feedbackTrend: "maya_feedback_trend_v2",
  aiConfig: "maya_ai_config_v2",
  flowiseConfig: "maya_flowise_config_v1",
  profile: "maya_profile_v1",
  profileSnapshots: "maya_profile_snapshots_v1",
  cycleState: "maya_cycle_state_v1",
  syncConfig: "maya_sync_config_v2",
  notificationConfig: "maya_notification_config_v1",
  supabaseConfig: "maya_supabase_config_v1",
  authState: "maya_auth_state_v1",
  customWorkoutDraft: "maya_custom_workout_draft_v1",
  visualProgressEntries: "maya_visual_progress_entries_v1",
  previewUsers: "maya_preview_users_v1",
  previewSession: "maya_preview_session_v1"
};

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeJSON(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function storageAvailable() {
  try {
    const probeKey = "__maya_storage_probe__";
    localStorage.setItem(probeKey, "ok");
    localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export async function pushRemoteState(syncConfig, payload) {
  if (!syncConfig?.endpoint || !syncConfig?.token) return { synced: false };
  const response = await fetch(`${syncConfig.endpoint.replace(/\/$/, "")}/api/sync/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${syncConfig.token}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Sync push HTTP ${response.status}`);
  }
  return response.json();
}

export async function pullRemoteState(syncConfig) {
  if (!syncConfig?.endpoint || !syncConfig?.token) return null;
  const response = await fetch(`${syncConfig.endpoint.replace(/\/$/, "")}/api/sync/pull`, {
    headers: { Authorization: `Bearer ${syncConfig.token}` }
  });
  if (!response.ok) {
    throw new Error(`Sync pull HTTP ${response.status}`);
  }
  return response.json();
}
