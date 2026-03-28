import { STORAGE_KEYS, loadJSON, saveJSON } from "./storage.js";
import { dayKey } from "./utils.js";

export function sanitizeAIConfig(raw) {
  const config = raw || {};
  const mode = ["local", "proxy", "direct"].includes(config.mode) ? config.mode : "proxy";
  return {
    mode,
    model: typeof config.model === "string" && config.model.trim() ? config.model.trim() : "gpt-4.1-mini",
    proxyEndpoint: typeof config.proxyEndpoint === "string" && config.proxyEndpoint.trim()
      ? config.proxyEndpoint.trim()
      : "http://localhost:8787/api/maya-coach",
    apiKey: typeof config.apiKey === "string" ? config.apiKey.trim() : "",
    webSearch: Boolean(config.webSearch)
  };
}

export const defaultProfile = {
  name: "",
  age: "",
  weightKg: "",
  goal: "muscle",
  level: "2",
  frequency: "3",
  place: "mixte",
  sessionTime: "35",
  equipment: ["aucun", "elastique"]
};

function sanitizeNumericText(value, { min = 0, max = 999, decimals = false } = {}) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return "";
  const parsed = decimals ? parseFloat(raw) : parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return "";
  const clamped = Math.max(min, Math.min(max, parsed));
  return decimals ? String(Math.round(clamped * 10) / 10) : String(clamped);
}

export function sanitizeProfile(raw) {
  const profile = { ...defaultProfile, ...(raw || {}) };
  return {
    ...profile,
    name: String(profile.name || "").trim().slice(0, 40),
    age: sanitizeNumericText(profile.age, { min: 10, max: 99 }),
    weightKg: sanitizeNumericText(profile.weightKg, { min: 35, max: 220, decimals: true }),
    equipment: Array.isArray(profile.equipment) && profile.equipment.length ? profile.equipment : [...defaultProfile.equipment]
  };
}

export function sanitizeSyncConfig(raw) {
  const config = raw || {};
  return {
    endpoint: typeof config.endpoint === "string" && config.endpoint.trim()
      ? config.endpoint.trim()
      : "http://localhost:8788",
    token: typeof config.token === "string" ? config.token.trim() : "",
    email: typeof config.email === "string" ? config.email.trim() : "",
    autoSync: Boolean(config.autoSync)
  };
}

export function sanitizeNotificationConfig(raw) {
  const config = raw || {};
  return {
    enabled: Boolean(config.enabled),
    permission: typeof config.permission === "string" ? config.permission : "default",
    lastSentAt: typeof config.lastSentAt === "string" ? config.lastSentAt : "",
    serviceWorkerReady: Boolean(config.serviceWorkerReady)
  };
}

const storedProfile = loadJSON(STORAGE_KEYS.profile, null);
const storedProfileSnapshots = loadJSON(STORAGE_KEYS.profileSnapshots, []);

export const state = {
  page: "home",
  settingsTab: "profile",
  launchDismissed: false,
  profile: storedProfile ? sanitizeProfile(storedProfile) : null,
  profileSnapshots: Array.isArray(storedProfileSnapshots) ? storedProfileSnapshots : [],
  showOnboarding: !storedProfile,
  exoFilter: { search: "", mode: "all", muscle: "all", similarTo: "" },
  nutritionFilter: { search: "", category: "all", goal: "all", tag: "all" },
  favorites: new Set(loadJSON(STORAGE_KEYS.favorites, [])),
  history: loadJSON(STORAGE_KEYS.history, []),
  nutritionProfile: loadJSON(STORAGE_KEYS.nutritionProfile, null),
  nutritionHistory: loadJSON(STORAGE_KEYS.nutritionHistory, []),
  feedbackTrend: loadJSON(STORAGE_KEYS.feedbackTrend, { loadAdjust: 0, history: [] }),
  aiConfig: sanitizeAIConfig(loadJSON(STORAGE_KEYS.aiConfig, null)),
  cycleState: loadJSON(STORAGE_KEYS.cycleState, { cycleWeek: 1, sessionsInWeek: 0, cycleLength: 4 }),
  syncConfig: sanitizeSyncConfig(loadJSON(STORAGE_KEYS.syncConfig, null)),
  notificationConfig: sanitizeNotificationConfig(loadJSON(STORAGE_KEYS.notificationConfig, null)),
  aiRuntime: { source: "local", latencyMs: 0, error: "", status: "idle", lastCheckedAt: "", internetEnabled: false },
  syncRuntime: { status: "idle", lastSyncAt: "", error: "" },
  currentPlan: null,
  workout: null,
  postWorkoutId: null,
  globalSearch: "",
  onboardingStep: 0,
  onboardingDraft: { ...defaultProfile },
  aiDraft: {
    preferredExerciseId: "",
    previousEntryId: "",
    previousFeedback: "",
    preferredZone: "",
    preferredGoal: ""
  },
  protocolDraft: null
};

export function saveStateSlice(key, value) {
  saveJSON(STORAGE_KEYS[key], value);
}

export function persistFavorites() {
  saveJSON(STORAGE_KEYS.favorites, [...state.favorites]);
}

export function persistHistory() {
  saveJSON(STORAGE_KEYS.history, state.history);
}

export function persistNutritionProfile() {
  saveJSON(STORAGE_KEYS.nutritionProfile, state.nutritionProfile);
}

export function persistNutritionHistory() {
  saveJSON(STORAGE_KEYS.nutritionHistory, state.nutritionHistory);
}

export function persistFeedbackTrend() {
  saveJSON(STORAGE_KEYS.feedbackTrend, state.feedbackTrend);
}

export function persistAIConfig() {
  saveJSON(STORAGE_KEYS.aiConfig, state.aiConfig);
}

export function persistProfile() {
  saveJSON(STORAGE_KEYS.profile, state.profile);
}

export function persistProfileSnapshots() {
  saveJSON(STORAGE_KEYS.profileSnapshots, state.profileSnapshots);
}

export function persistCycleState() {
  saveJSON(STORAGE_KEYS.cycleState, state.cycleState);
}

export function persistSyncConfig() {
  saveJSON(STORAGE_KEYS.syncConfig, state.syncConfig);
}

export function persistNotificationConfig() {
  saveJSON(STORAGE_KEYS.notificationConfig, state.notificationConfig);
}

export function updateProfile(partialProfile) {
  const nextProfile = sanitizeProfile({
    ...(state.profile || defaultProfile),
    ...(partialProfile || {})
  });
  state.profile = nextProfile;
  persistProfile();
  maybeRecordProfileSnapshot(nextProfile);
  return nextProfile;
}

function maybeRecordProfileSnapshot(profile) {
  const weightKg = parseFloat(profile.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0) return false;

  const today = dayKey(new Date());
  const snapshots = Array.isArray(state.profileSnapshots) ? [...state.profileSnapshots] : [];
  const existingIndex = snapshots.findIndex((snapshot) => dayKey(snapshot.date) === today);
  const snapshot = {
    date: new Date().toISOString(),
    weightKg,
    age: profile.age ? parseInt(profile.age, 10) : null,
    name: profile.name || ""
  };

  if (existingIndex >= 0) {
    snapshots[existingIndex] = { ...snapshots[existingIndex], ...snapshot };
  } else {
    snapshots.unshift(snapshot);
  }

  state.profileSnapshots = snapshots.slice(0, 180);
  persistProfileSnapshots();
  return true;
}
