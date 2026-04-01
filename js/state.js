import { STORAGE_KEYS, loadJSON, saveJSON } from "./storage.js";
import { dayKey } from "./utils.js";

function isLocalHostEnvironment() {
  if (typeof window === "undefined") return true;
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function isLoopbackEndpoint(endpoint) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(String(endpoint || "").trim());
}

export function sanitizeAIConfig(raw) {
  const config = raw || {};
  const localHost = isLocalHostEnvironment();
  const requestedMode = ["local", "proxy", "direct"].includes(config.mode)
    ? config.mode
    : (localHost ? "proxy" : "local");
  const proxyEndpoint = typeof config.proxyEndpoint === "string" && config.proxyEndpoint.trim()
    ? config.proxyEndpoint.trim()
    : (localHost ? "http://localhost:8787/api/maya-coach" : "");
  const mode = requestedMode === "proxy" && !localHost && (!proxyEndpoint || isLoopbackEndpoint(proxyEndpoint))
    ? "local"
    : requestedMode;
  return {
    mode,
    model: typeof config.model === "string" && config.model.trim() ? config.model.trim() : "gpt-4.1-mini",
    proxyEndpoint,
    apiKey: typeof config.apiKey === "string" ? config.apiKey.trim() : "",
    webSearch: Boolean(config.webSearch)
  };
}

function sanitizeFlowiseVersion(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "latest") return "latest";
  return /^[a-zA-Z0-9._-]+$/.test(raw) ? raw : "latest";
}

export const defaultProfile = {
  name: "",
  age: "",
  weightKg: "",
  bio: "",
  photoDataUrl: "",
  role: "user",
  accountStatus: "active",
  moderationReason: "",
  deletedAt: "",
  goal: "muscle",
  level: "2",
  frequency: "3",
  place: "mixte",
  sessionTime: "35",
  equipment: ["aucun", "elastique"],
  preferredSplit: "adaptive",
  foodPreference: "omnivore",
  recoveryPreference: "equilibre",
  coachTone: "direct"
};

export const defaultCustomWorkoutDraft = {
  id: "session_default",
  title: "Séance personnalisée",
  objective: "muscle",
  place: "mixte",
  targetExerciseCount: "4",
  blocks: [
    { id: "block_1", exerciseId: "pushup_classic", sets: "3", reps: "10-12", restSec: "60" },
    { id: "block_2", exerciseId: "squat_bodyweight", sets: "3", reps: "10-12", restSec: "75" }
  ]
};

export function buildDefaultPhotoProgressDraft(seed = {}) {
  return {
    date: dayKey(new Date()),
    zone: "haut du corps",
    weightKg: "",
    heightCm: "",
    context: "",
    note: "",
    photoDataUrl: "",
    ...seed
  };
}

function sanitizeNumericText(value, { min = 0, max = 999, decimals = false } = {}) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return "";
  const parsed = decimals ? parseFloat(raw) : parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return "";
  const clamped = Math.max(min, Math.min(max, parsed));
  return decimals ? String(Math.round(clamped * 10) / 10) : String(clamped);
}

function sanitizeImageReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (
    raw.startsWith("data:image/")
    || /^https?:\/\//i.test(raw)
    || raw.startsWith("/")
    || raw.startsWith("./")
  ) {
    return raw;
  }
  return "";
}

export function sanitizeProfile(raw) {
  const profile = { ...defaultProfile, ...(raw || {}) };
  return {
    ...profile,
    name: String(profile.name || "").trim().slice(0, 40),
    age: sanitizeNumericText(profile.age, { min: 10, max: 99 }),
    weightKg: sanitizeNumericText(profile.weightKg, { min: 35, max: 220, decimals: true }),
    bio: String(profile.bio || "").trim().slice(0, 280),
    photoDataUrl: sanitizeImageReference(profile.photoDataUrl),
    role: ["user", "admin"].includes(profile.role) ? profile.role : defaultProfile.role,
    accountStatus: ["pending", "active", "suspended", "banned"].includes(profile.accountStatus)
      ? profile.accountStatus
      : defaultProfile.accountStatus,
    moderationReason: String(profile.moderationReason || "").trim().slice(0, 240),
    deletedAt: typeof profile.deletedAt === "string" ? profile.deletedAt : "",
    equipment: Array.isArray(profile.equipment) && profile.equipment.length ? profile.equipment : [...defaultProfile.equipment]
  };
}

export function sanitizeCustomWorkoutDraft(raw) {
  const draft = { ...defaultCustomWorkoutDraft, ...(raw || {}) };
  return {
    id: String(draft.id || `session_${Date.now().toString(36)}`),
    title: String(draft.title || defaultCustomWorkoutDraft.title).trim().slice(0, 60) || defaultCustomWorkoutDraft.title,
    objective: String(draft.objective || defaultCustomWorkoutDraft.objective).trim() || defaultCustomWorkoutDraft.objective,
    place: ["maison", "salle", "mixte"].includes(draft.place) ? draft.place : defaultCustomWorkoutDraft.place,
    targetExerciseCount: sanitizeNumericText(draft.targetExerciseCount, { min: 1, max: 12 }) || defaultCustomWorkoutDraft.targetExerciseCount,
    blocks: Array.isArray(draft.blocks) && draft.blocks.length
      ? draft.blocks.slice(0, 12).map((block, index) => ({
          id: String(block?.id || `block_${index + 1}`),
          exerciseId: String(block?.exerciseId || ""),
          sets: sanitizeNumericText(block?.sets, { min: 1, max: 8 }) || "3",
          reps: String(block?.reps || "10-12").trim().slice(0, 16) || "10-12",
          restSec: sanitizeNumericText(block?.restSec, { min: 20, max: 240 }) || "60"
        }))
      : structuredClone(defaultCustomWorkoutDraft.blocks)
  };
}

export function sanitizeVisualProgressEntry(raw) {
  const entry = buildDefaultPhotoProgressDraft(raw);
  return {
    id: String(raw?.id || `progress_${Date.now()}`),
    remoteId: raw?.remoteId ? String(raw.remoteId) : "",
    profileId: raw?.profileId ? String(raw.profileId) : "",
    date: dayKey(entry.date) || dayKey(new Date()),
    zone: String(entry.zone || "haut du corps").trim().slice(0, 60) || "haut du corps",
    weightKg: sanitizeNumericText(entry.weightKg, { min: 35, max: 240, decimals: true }),
    heightCm: sanitizeNumericText(entry.heightCm, { min: 120, max: 240 }),
    context: String(entry.context || "").trim().slice(0, 80),
    note: String(entry.note || "").trim().slice(0, 180),
    photoDataUrl: sanitizeImageReference(entry.photoDataUrl),
    photoStoragePath: typeof entry.photoStoragePath === "string" ? entry.photoStoragePath.trim() : ""
  };
}

export function sanitizePhotoProgressDraft(raw) {
  const draft = sanitizeVisualProgressEntry({ ...buildDefaultPhotoProgressDraft(), ...(raw || {}), id: "draft" });
  return {
    ...draft,
    id: "draft"
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

export function sanitizeSupabaseConfig(raw) {
  const config = raw || {};
  return {
    enabled: Boolean(config.enabled),
    url: typeof config.url === "string" ? config.url.trim() : "",
    anonKey: typeof config.anonKey === "string" ? config.anonKey.trim() : "",
    schemaReady: Boolean(config.schemaReady),
    status: typeof config.status === "string" ? config.status : "idle",
    lastCheckedAt: typeof config.lastCheckedAt === "string" ? config.lastCheckedAt : "",
    error: typeof config.error === "string" ? config.error : ""
  };
}

export function sanitizeFlowiseConfig(raw) {
  const config = raw || {};
  return {
    enabled: Boolean(config.enabled),
    apiHost: typeof config.apiHost === "string" ? config.apiHost.trim().replace(/\/+$/, "") : "",
    chatflowId: typeof config.chatflowId === "string" ? config.chatflowId.trim() : "",
    sessionId: typeof config.sessionId === "string" ? config.sessionId.trim() : "",
    version: sanitizeFlowiseVersion(config.version),
    status: typeof config.status === "string" ? config.status : "idle",
    lastMountedAt: typeof config.lastMountedAt === "string" ? config.lastMountedAt : "",
    error: typeof config.error === "string" ? config.error : ""
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

export function sanitizeTheme(raw) {
  const valid = ["dark", "light", "auto"];
  return valid.includes(raw) ? raw : "dark";
}

export function sanitizeAuthState(raw) {
  const auth = raw || {};
  return {
    status: typeof auth.status === "string" ? auth.status : "signed_out",
    mode: typeof auth.mode === "string" ? auth.mode : "preview",
    error: typeof auth.error === "string" ? auth.error : "",
    notice: typeof auth.notice === "string" ? auth.notice : "",
    lastSyncAt: typeof auth.lastSyncAt === "string" ? auth.lastSyncAt : "",
    initialized: Boolean(auth.initialized)
  };
}

const storedProfile = loadJSON(STORAGE_KEYS.profile, null);
const storedProfileSnapshots = loadJSON(STORAGE_KEYS.profileSnapshots, []);
const storedAuthState = loadJSON(STORAGE_KEYS.authState, null);
const storedCustomWorkoutDraft = loadJSON(STORAGE_KEYS.customWorkoutDraft, null);
const storedVisualProgressEntries = loadJSON(STORAGE_KEYS.visualProgressEntries, []);

function resolveStoredCustomWorkoutState(raw) {
  const candidateSessions = Array.isArray(raw?.sessions)
    ? raw.sessions
    : raw
      ? [raw]
      : [];
  const sessions = (candidateSessions.length ? candidateSessions : [defaultCustomWorkoutDraft])
    .map((session) => sanitizeCustomWorkoutDraft(session));
  const activeId = String(raw?.activeId || raw?.activeCustomWorkoutId || sessions[0]?.id || defaultCustomWorkoutDraft.id);
  const activeSession = sessions.find((session) => session.id === activeId) || sessions[0];
  return {
    activeId: activeSession.id,
    sessions
  };
}

const storedCustomWorkoutState = resolveStoredCustomWorkoutState(storedCustomWorkoutDraft);

export const state = {
  theme: sanitizeTheme(loadJSON(STORAGE_KEYS.theme, "dark")),
  page: "auth",
  pageHistory: [],
  navExpanded: false,
  settingsTab: "identity",
  launchDismissed: false,
  profile: storedProfile ? sanitizeProfile(storedProfile) : null,
  profilePhotoPreview: "",
  profileSnapshots: Array.isArray(storedProfileSnapshots) ? storedProfileSnapshots : [],
  showOnboarding: !storedProfile,
  exoFilter: { search: "", mode: "all", muscle: "all", similarTo: "" },
  noushiFilter: { place: "mixte" },
  nutritionFilter: { search: "", category: "all", goal: "all", tag: "all" },
  nutritionView: "plan",
  nutritionDetailRecipeId: "",
  nutritionVideoRecipeId: "",
  nutritionFeedLimit: 8,
  runnerState: {
    goal: "semi",
    focus: "all",
    readiness: "stable"
  },
  runs: loadJSON(STORAGE_KEYS.runs, []),
  activeRun: loadJSON(STORAGE_KEYS.activeRun, null),
  favorites: new Set(loadJSON(STORAGE_KEYS.favorites, [])),
  history: loadJSON(STORAGE_KEYS.history, []),
  nutritionProfile: loadJSON(STORAGE_KEYS.nutritionProfile, null),
  nutritionHistory: loadJSON(STORAGE_KEYS.nutritionHistory, []),
  feedbackTrend: loadJSON(STORAGE_KEYS.feedbackTrend, { loadAdjust: 0, history: [] }),
  aiConfig: sanitizeAIConfig(loadJSON(STORAGE_KEYS.aiConfig, null)),
  flowiseConfig: sanitizeFlowiseConfig(loadJSON(STORAGE_KEYS.flowiseConfig, null)),
  cycleState: loadJSON(STORAGE_KEYS.cycleState, { cycleWeek: 1, sessionsInWeek: 0, cycleLength: 4 }),
  syncConfig: sanitizeSyncConfig(loadJSON(STORAGE_KEYS.syncConfig, null)),
  notificationConfig: sanitizeNotificationConfig(loadJSON(STORAGE_KEYS.notificationConfig, null)),
  supabaseConfig: sanitizeSupabaseConfig(loadJSON(STORAGE_KEYS.supabaseConfig, null)),
  authState: sanitizeAuthState(storedAuthState),
  session: null,
  currentUser: null,
  authScreenMode: "login",
  authDraft: {
    displayName: storedProfile?.name || "",
    email: "",
    password: "",
    confirmPassword: ""
  },
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
    preferredGoal: "",
    time: "",
    place: "",
    zone: "",
    energy: "",
    goal: "",
    level: ""
  },
  protocolDraft: null,
  customWorkoutLibrary: storedCustomWorkoutState.sessions,
  activeCustomWorkoutId: storedCustomWorkoutState.activeId,
  customWorkoutDraft: storedCustomWorkoutState.sessions.find((session) => session.id === storedCustomWorkoutState.activeId)
    || storedCustomWorkoutState.sessions[0],
  customWorkoutSearch: "",
  customWorkoutPendingExerciseId: "",
  visualProgressEntries: Array.isArray(storedVisualProgressEntries)
    ? storedVisualProgressEntries.map((entry) => sanitizeVisualProgressEntry(entry)).filter((entry) => entry.photoDataUrl)
    : [],
  photoProgressDraft: sanitizePhotoProgressDraft({ weightKg: storedProfile?.weightKg || "" }),
  customCoachRuntime: {
    lastAlertSignature: ""
  },
  adminRuntime: {
    section: "profiles",
    users: [],
    photos: [],
    filter: "",
    selectedProfileId: "",
    statusFilter: "all",
    loading: false,
    error: "",
    lastFetchedAt: "",
    detailOpen: false,
    detailTab: "photos",
    detailLoading: false,
    detailError: "",
    detailUser: null,
    detailPhotos: [],
    detailNotes: [],
    deleteDialogOpen: false,
    deleteTargetId: "",
    deleteTargetName: "",
    deleteReason: "",
    deleteError: "",
    deleteSubmitting: false
  },
  photoViewer: {
    open: false,
    source: "progress",
    sourceId: "",
    imageUrl: "",
    date: "",
    zone: "",
    context: "",
    note: "",
    weightKg: "",
    heightCm: "",
    ownerName: "",
    ownerEmail: "",
    sessions: [],
    dayNotes: []
  },
  coachSheetOpen: false,
  nutritionSheetOpen: false
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

export function persistFlowiseConfig() {
  saveJSON(STORAGE_KEYS.flowiseConfig, state.flowiseConfig);
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

export function persistCustomWorkoutDraft() {
  saveJSON(STORAGE_KEYS.customWorkoutDraft, {
    activeId: state.activeCustomWorkoutId,
    sessions: state.customWorkoutLibrary || []
  });
}

export function persistVisualProgressEntries() {
  saveJSON(STORAGE_KEYS.visualProgressEntries, state.visualProgressEntries);
}

export function persistTheme() {
  saveJSON(STORAGE_KEYS.theme, state.theme);
  applyThemeToDOM(state.theme);
}

export function applyThemeToDOM(theme) {
  const resolved = theme === "auto"
    ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export function persistRuns() {
  saveJSON(STORAGE_KEYS.runs, state.runs);
}

export function persistActiveRun() {
  if (!state.activeRun) {
    saveJSON(STORAGE_KEYS.activeRun, null);
    return;
  }
  const { gpsWatchId, timerHandle, ...persistable } = state.activeRun;
  saveJSON(STORAGE_KEYS.activeRun, persistable);
}

export function persistSyncConfig() {
  saveJSON(STORAGE_KEYS.syncConfig, state.syncConfig);
}

export function persistNotificationConfig() {
  saveJSON(STORAGE_KEYS.notificationConfig, state.notificationConfig);
}

export function persistSupabaseConfig() {
  saveJSON(STORAGE_KEYS.supabaseConfig, state.supabaseConfig);
}

export function persistAuthState() {
  saveJSON(STORAGE_KEYS.authState, state.authState);
}

export function setCustomWorkoutLibraryState({ sessions, activeId } = {}) {
  const sanitizedSessions = (Array.isArray(sessions) && sessions.length ? sessions : [defaultCustomWorkoutDraft])
    .map((session) => sanitizeCustomWorkoutDraft(session));
  const resolvedActive = sanitizedSessions.find((session) => session.id === activeId) || sanitizedSessions[0];
  state.customWorkoutLibrary = sanitizedSessions;
  state.activeCustomWorkoutId = resolvedActive.id;
  state.customWorkoutDraft = resolvedActive;
  persistCustomWorkoutDraft();
  return resolvedActive;
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

export function resetPhotoProgressDraft(seed = {}) {
  state.photoProgressDraft = sanitizePhotoProgressDraft({
    ...buildDefaultPhotoProgressDraft({
      weightKg: state.profile?.weightKg || "",
      ...seed
    })
  });
  return state.photoProgressDraft;
}
