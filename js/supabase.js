import {
  getManagedBackendProductConfig,
  getAdminEmails,
  hasCloudProductConfig,
  hasManagedBackendProductConfig,
  getSupabaseProductConfig,
  hasSupabaseProductConfig,
  isPreviewAuthEnabled
} from "./app-config.js";
import { buildBadgeCollection, getSharedDashboardData } from "./insights.js";
import {
  STORAGE_KEYS,
  loadJSON,
  removeJSON,
  saveJSON
} from "./storage.js";
import {
  persistAIConfig,
  defaultCustomWorkoutDraft,
  defaultProfile,
  persistAuthState,
  persistCustomWorkoutDraft,
  persistCycleState,
  persistFavorites,
  persistFeedbackTrend,
  persistHistory,
  persistNotificationConfig,
  persistNutritionHistory,
  persistNutritionProfile,
  persistProfile,
  persistProfileSnapshots,
  persistSupabaseConfig,
  persistSyncConfig,
  persistVisualProgressEntries,
  resetPhotoProgressDraft,
  setCustomWorkoutLibraryState,
  sanitizeAIConfig,
  sanitizeAuthState,
  sanitizeCustomWorkoutDraft,
  sanitizeNotificationConfig,
  sanitizeProfile,
  sanitizeSupabaseConfig,
  sanitizeSyncConfig,
  sanitizeVisualProgressEntry,
  state
} from "./state.js";
import { dayKey, readErrorMessage } from "./utils.js";

const SUPABASE_BROWSER_MODULE = "https://esm.sh/@supabase/supabase-js@2?bundle";

let supabaseClientPromise = null;
let authListenerBound = false;
let suppressSupabaseAuthListener = false;
let profileRowCache = null;

function isConfiguredAdminEmail(email) {
  const safeEmail = String(email || "").trim().toLowerCase();
  return getAdminEmails().map((item) => String(item || "").trim().toLowerCase()).includes(safeEmail);
}

function getCloudMode() {
  if (hasSupabaseProductConfig()) return "supabase";
  if (hasManagedBackendProductConfig()) return "backend";
  return "preview";
}

function isManagedBackendMode() {
  return !hasSupabaseProductConfig() && hasManagedBackendProductConfig();
}

function publicSupabaseState(partialConfig = {}) {
  const productConfig = hasSupabaseProductConfig()
    ? getSupabaseProductConfig()
    : hasManagedBackendProductConfig()
      ? getManagedBackendProductConfig()
      : { enabled: false };
  state.supabaseConfig = sanitizeSupabaseConfig({
    ...(state.supabaseConfig || {}),
    enabled: Boolean(productConfig.enabled),
    schemaReady: true,
    ...partialConfig
  });
  persistSupabaseConfig();
  return state.supabaseConfig;
}

function setAuthState(partialAuth) {
  state.authState = sanitizeAuthState({
    ...(state.authState || {}),
    ...partialAuth,
    initialized: true
  });
  persistAuthState();
  return state.authState;
}

function profileFromUser(user) {
  const displayName = user?.user_metadata?.display_name
    || user?.user_metadata?.name
    || state.profile?.name
    || "";

  return {
    id: user?.id || "",
    email: user?.email || "",
    displayName,
    mode: getCloudMode()
  };
}

function normalizeBackendUser(payload = {}) {
  return {
    id: payload.id || "",
    email: payload.email || "",
    user_metadata: {
      display_name: payload.displayName || payload.name || ""
    }
  };
}

function ensureManagedBackendSyncConfig(
  token = state.syncConfig?.token || "",
  email = state.currentUser?.email || state.syncConfig?.email || ""
) {
  if (!hasManagedBackendProductConfig()) return state.syncConfig;
  const config = getManagedBackendProductConfig();
  state.syncConfig = sanitizeSyncConfig({
    ...(state.syncConfig || {}),
    endpoint: config.url,
    token,
    email,
    autoSync: true
  });
  persistSyncConfig();
  return state.syncConfig;
}

function clearManagedBackendSession() {
  if (!hasManagedBackendProductConfig()) return;
  state.syncConfig = sanitizeSyncConfig({
    ...(state.syncConfig || {}),
    endpoint: getManagedBackendProductConfig().url,
    token: ""
  });
  persistSyncConfig();
}

async function backendRequest(path, { method = "GET", body, auth = true } = {}) {
  if (!hasManagedBackendProductConfig()) {
    throw new Error("Backend managé non configuré");
  }

  ensureManagedBackendSyncConfig();
  const baseUrl = getManagedBackendProductConfig().url.replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json"
  };

  if (auth && state.syncConfig?.token) {
    headers.Authorization = `Bearer ${state.syncConfig.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || `Backend HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function defaultFeedbackTrend() {
  return { loadAdjust: 0, history: [] };
}

function defaultCycleState() {
  return { cycleWeek: 1, sessionsInWeek: 0, cycleLength: 4 };
}

function resetUserScopedState({ preserveProfileName = "" } = {}) {
  state.profile = preserveProfileName
    ? sanitizeProfile({ ...defaultProfile, name: preserveProfileName })
    : null;
  state.profilePhotoPreview = "";
  state.profileSnapshots = [];
  state.favorites = new Set();
  state.history = [];
  state.nutritionProfile = null;
  state.nutritionHistory = [];
  state.feedbackTrend = defaultFeedbackTrend();
  state.cycleState = defaultCycleState();
  setCustomWorkoutLibraryState({
    sessions: [
      {
        ...structuredClone(defaultCustomWorkoutDraft),
        id: `session_${Date.now().toString(36)}`,
        place: state.profile?.place || defaultProfile.place
      }
    ]
  });
  state.customWorkoutSearch = "";
  state.customWorkoutPendingExerciseId = "";
  state.visualProgressEntries = [];
  resetPhotoProgressDraft();
  state.currentPlan = null;
  state.workout = null;
  state.postWorkoutId = null;
  state.globalSearch = "";
  state.exoFilter = { search: "", mode: "all", muscle: "all", similarTo: "" };
  state.nutritionFilter = { search: "", category: "all", goal: "all", tag: "all" };
  state.showOnboarding = true;
  state.onboardingStep = 0;
  state.syncRuntime = { status: "idle", lastSyncAt: "", error: "" };
  state.adminRuntime = {
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
    detailNotes: []
  };

  persistProfile();
  persistProfileSnapshots();
  persistFavorites();
  persistHistory();
  persistNutritionProfile();
  persistNutritionHistory();
  persistFeedbackTrend();
  persistCycleState();
  persistVisualProgressEntries();
}

function persistAllUserState() {
  persistProfile();
  persistProfileSnapshots();
  persistFavorites();
  persistHistory();
  persistNutritionProfile();
  persistNutritionHistory();
  persistFeedbackTrend();
  persistCycleState();
  persistCustomWorkoutDraft();
  persistVisualProgressEntries();
}

function hydrateManagedBackendProfile(remoteProfile = {}, userPayload = {}) {
  return sanitizeProfile({
    ...defaultProfile,
    ...(state.profile || {}),
    ...(remoteProfile || {}),
    name: remoteProfile?.name || userPayload.displayName || userPayload.name || state.profile?.name || "",
    role: userPayload.role || remoteProfile?.role || state.profile?.role || defaultProfile.role,
    accountStatus: userPayload.accountStatus || remoteProfile?.accountStatus || state.profile?.accountStatus || defaultProfile.accountStatus
  });
}

function buildManagedBackendSnapshot() {
  return {
    profile: sanitizeProfile(state.profile || defaultProfile),
    profileSnapshots: Array.isArray(state.profileSnapshots) ? state.profileSnapshots : [],
    history: Array.isArray(state.history) ? state.history : [],
    favorites: [...(state.favorites || [])],
    nutritionProfile: state.nutritionProfile || null,
    nutritionHistory: Array.isArray(state.nutritionHistory) ? state.nutritionHistory : [],
    customWorkoutState: {
      activeId: state.activeCustomWorkoutId,
      sessions: state.customWorkoutLibrary || []
    },
    customWorkoutDraft: state.customWorkoutDraft || null,
    visualProgressEntries: Array.isArray(state.visualProgressEntries) ? state.visualProgressEntries : [],
    aiConfig: state.aiConfig || null,
    notificationConfig: state.notificationConfig || null,
    feedbackTrend: state.feedbackTrend || defaultFeedbackTrend(),
    cycleState: state.cycleState || defaultCycleState()
  };
}

function restoreManagedBackendSnapshot(remote = {}, userPayload = {}) {
  state.profile = hydrateManagedBackendProfile(remote.profile || {}, userPayload);
  state.profileSnapshots = Array.isArray(remote.profileSnapshots) ? remote.profileSnapshots : [];
  state.history = Array.isArray(remote.history) ? remote.history : [];
  state.favorites = new Set(Array.isArray(remote.favorites) ? remote.favorites : []);
  state.nutritionProfile = remote.nutritionProfile ?? null;
  state.nutritionHistory = Array.isArray(remote.nutritionHistory) ? remote.nutritionHistory : [];

  if (remote.customWorkoutState?.sessions || remote.customWorkoutDraft) {
    const sessions = Array.isArray(remote.customWorkoutState?.sessions)
      ? remote.customWorkoutState.sessions.map((session) => sanitizeCustomWorkoutDraft(session))
      : [sanitizeCustomWorkoutDraft(remote.customWorkoutDraft)];
    setCustomWorkoutLibraryState({
      sessions,
      activeId: remote.customWorkoutState?.activeId || remote.customWorkoutDraft?.id || sessions[0]?.id
    });
  }

  state.visualProgressEntries = Array.isArray(remote.visualProgressEntries)
    ? remote.visualProgressEntries.map((entry) => sanitizeVisualProgressEntry(entry)).filter((entry) => entry.photoDataUrl)
    : [];
  state.aiConfig = remote.aiConfig !== undefined ? sanitizeAIConfig(remote.aiConfig) : state.aiConfig;
  state.notificationConfig = remote.notificationConfig !== undefined ? sanitizeNotificationConfig(remote.notificationConfig) : state.notificationConfig;
  state.feedbackTrend = remote.feedbackTrend && typeof remote.feedbackTrend === "object"
    ? remote.feedbackTrend
    : defaultFeedbackTrend();
  state.cycleState = remote.cycleState && typeof remote.cycleState === "object"
    ? remote.cycleState
    : defaultCycleState();
  state.showOnboarding = !Boolean(state.profile?.name || state.profile?.weightKg);

  persistProfile();
  persistProfileSnapshots();
  persistHistory();
  persistFavorites();
  persistNutritionProfile();
  persistNutritionHistory();
  persistCustomWorkoutDraft();
  persistVisualProgressEntries();
  persistAIConfig();
  persistNotificationConfig();
  persistFeedbackTrend();
  persistCycleState();
  ensureManagedBackendSyncConfig(state.syncConfig?.token || "", userPayload.email || state.currentUser?.email || state.syncConfig?.email || "");
}

function loadPreviewUsers() {
  const users = loadJSON(STORAGE_KEYS.previewUsers, []);
  return Array.isArray(users) ? users : [];
}

function savePreviewUsers(users) {
  saveJSON(STORAGE_KEYS.previewUsers, users);
}

function savePreviewSession(session) {
  saveJSON(STORAGE_KEYS.previewSession, session);
}

function clearPreviewSession() {
  removeJSON(STORAGE_KEYS.previewSession);
}

function setAuthenticatedUser({ session, user, mode, notice = "", error = "" }) {
  const currentUser = profileFromUser(user);
  currentUser.mode = mode;
  state.session = session;
  state.currentUser = currentUser;
  setAuthState({
    status: "ready",
    mode,
    error,
    notice
  });
  return currentUser;
}

function setSignedOutState({ mode = "preview", error = "", notice = "" } = {}) {
  state.session = null;
  state.currentUser = null;
  state.authScreenMode = "login";
  profileRowCache = null;
  setAuthState({
    status: "signed_out",
    mode,
    error,
    notice
  });
}

async function loadSupabaseFactory() {
  const module = await import(SUPABASE_BROWSER_MODULE);
  return module.createClient;
}

export async function getSupabaseClient() {
  if (!hasSupabaseProductConfig()) {
    throw new Error("Supabase n’est pas configuré dans l’app");
  }
  if (!supabaseClientPromise) {
    supabaseClientPromise = loadSupabaseFactory().then((createClient) => {
      const config = getSupabaseProductConfig();
      return createClient(config.url, config.anonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            "X-Client-Info": "maya-fitness-web"
          }
        }
      });
    });
  }
  return supabaseClientPromise;
}

function previewUserFromRecord(record) {
  return {
    id: record.id,
    email: record.email,
    user_metadata: {
      display_name: record.displayName || ""
    }
  };
}

function findPreviewUserByEmail(email) {
  return loadPreviewUsers().find((user) => user.email.toLowerCase() === String(email || "").toLowerCase()) || null;
}

async function applyPreviewSession(sessionRecord) {
  const previewUser = findPreviewUserByEmail(sessionRecord?.email);
  if (!previewUser) {
    clearPreviewSession();
    setSignedOutState({
      mode: "preview",
      notice: "Aucune session locale active."
    });
    return null;
  }

  const user = previewUserFromRecord(previewUser);
  const currentUser = setAuthenticatedUser({
    session: sessionRecord,
    user,
    mode: "preview",
    notice: "Mode local actif."
  });
  if (!state.profile) {
    state.profile = sanitizeProfile({ ...defaultProfile, name: currentUser.displayName || "" });
    persistProfile();
  }
  state.showOnboarding = !Boolean(state.profile?.name || state.profile?.weightKg);
  return currentUser;
}

function buildProfilePayload(profile, currentUser, photoPath = "", existingRow = null) {
  const isAdminEmail = isConfiguredAdminEmail(currentUser?.email);
  const role = isAdminEmail
    ? "admin"
    : (existingRow?.role || profile?.role || defaultProfile.role);
  const accountStatus = existingRow?.account_status
    || "active";
  return {
    auth_user_id: currentUser.id,
    email: currentUser.email || null,
    name: profile?.name || currentUser.displayName || "",
    age: profile?.age ? parseInt(profile.age, 10) : null,
    weight_kg: profile?.weightKg ? Number(profile.weightKg) : null,
    bio: profile?.bio || "",
    role,
    account_status: accountStatus,
    moderation_reason: existingRow?.moderation_reason || "",
    deleted_at: existingRow?.deleted_at || null,
    goal: profile?.goal || defaultProfile.goal,
    level: profile?.level || defaultProfile.level,
    frequency: profile?.frequency || defaultProfile.frequency,
    place: profile?.place || defaultProfile.place,
    session_time: profile?.sessionTime || defaultProfile.sessionTime,
    preferred_split: profile?.preferredSplit || defaultProfile.preferredSplit,
    food_preference: profile?.foodPreference || defaultProfile.foodPreference,
    recovery_preference: profile?.recoveryPreference || defaultProfile.recoveryPreference,
    coach_tone: profile?.coachTone || defaultProfile.coachTone,
    photo_path: photoPath || null,
    updated_at: new Date().toISOString()
  };
}

async function uploadProfilePhoto(client, currentUser) {
  const photoDataUrl = state.profile?.photoDataUrl || "";
  const bucket = getSupabaseProductConfig().avatarBucket || "avatars";
  if (!photoDataUrl.startsWith("data:image/")) {
    return state.profile?.photoDataUrl || "";
  }

  try {
    const response = await fetch(photoDataUrl);
    const blob = await response.blob();
    const filePath = `${currentUser.id}/avatar.jpg`;
    const { error: uploadError } = await client.storage
      .from(bucket)
      .upload(filePath, blob, {
        upsert: true,
        contentType: "image/jpeg"
      });

    if (uploadError) {
      return photoDataUrl;
    }

    const { data } = client.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || filePath;
  } catch {
    return photoDataUrl;
  }
}

async function createSignedProgressPhotoUrl(client, storagePath) {
  if (!storagePath) return "";
  const bucket = getSupabaseProductConfig().progressBucket || "progress-photos";
  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
  if (error) return "";
  return data?.signedUrl || "";
}

async function uploadProgressPhoto(client, currentUser, entry) {
  const bucket = getSupabaseProductConfig().progressBucket || "progress-photos";
  if (entry.photoStoragePath && !String(entry.photoDataUrl || "").startsWith("data:image/")) {
    const signedUrl = await createSignedProgressPhotoUrl(client, entry.photoStoragePath);
    return {
      photoDataUrl: signedUrl || entry.photoDataUrl || "",
      photoStoragePath: entry.photoStoragePath
    };
  }

  if (!String(entry.photoDataUrl || "").startsWith("data:image/")) {
    return {
      photoDataUrl: entry.photoDataUrl || "",
      photoStoragePath: entry.photoStoragePath || ""
    };
  }

  const response = await fetch(entry.photoDataUrl);
  const blob = await response.blob();
  const filePath = `${currentUser.id}/progress/${entry.id || Date.now().toString(36)}.jpg`;
  const { error: uploadError } = await client.storage
    .from(bucket)
    .upload(filePath, blob, {
      upsert: true,
      contentType: "image/jpeg"
    });

  if (uploadError) throw uploadError;

  const signedUrl = await createSignedProgressPhotoUrl(client, filePath);
  return {
    photoDataUrl: signedUrl,
    photoStoragePath: filePath
  };
}

async function ensureProfileRow({ syncLocal = false } = {}) {
  if (!state.currentUser?.id) {
    throw new Error("Aucun utilisateur authentifié");
  }

  const client = await getSupabaseClient();

  const { data: existingRow, error: existingError } = await client
    .from("profiles")
    .select("*")
    .eq("auth_user_id", state.currentUser.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingRow && !syncLocal) {
    profileRowCache = existingRow;
    return existingRow;
  }

  const photoPath = syncLocal ? await uploadProfilePhoto(client, state.currentUser) : (existingRow?.photo_path || "");
  const seedProfile = syncLocal
    ? (state.profile || defaultProfile)
    : sanitizeProfile({
      ...defaultProfile,
      name: existingRow?.name || state.currentUser.displayName || ""
    });
  const payload = buildProfilePayload(seedProfile, state.currentUser, photoPath || existingRow?.photo_path || "", existingRow);
  const { data, error } = await client
    .from("profiles")
    .upsert(payload, { onConflict: "auth_user_id" })
    .select()
    .single();

  if (error) {
    throw error;
  }
  profileRowCache = data;
  return data;
}

function profileRowToLocalProfile(profileRow) {
  return sanitizeProfile({
    ...(state.profile || defaultProfile),
    name: profileRow?.name || state.currentUser?.displayName || "",
    age: profileRow?.age ? String(profileRow.age) : "",
    weightKg: profileRow?.weight_kg != null ? String(profileRow.weight_kg) : "",
    bio: profileRow?.bio || "",
    photoDataUrl: profileRow?.photo_path || "",
    role: profileRow?.role || defaultProfile.role,
    accountStatus: profileRow?.account_status || defaultProfile.accountStatus,
    moderationReason: profileRow?.moderation_reason || "",
    deletedAt: profileRow?.deleted_at || "",
    goal: profileRow?.goal || defaultProfile.goal,
    level: profileRow?.level || defaultProfile.level,
    frequency: profileRow?.frequency || defaultProfile.frequency,
    place: profileRow?.place || defaultProfile.place,
    sessionTime: profileRow?.session_time || defaultProfile.sessionTime,
    preferredSplit: profileRow?.preferred_split || defaultProfile.preferredSplit,
    foodPreference: profileRow?.food_preference || defaultProfile.foodPreference,
    recoveryPreference: profileRow?.recovery_preference || defaultProfile.recoveryPreference,
    coachTone: profileRow?.coach_tone || defaultProfile.coachTone
  });
}

function mapTrainingSessionToRemote(entry, profileId) {
  return {
    profile_id: profileId,
    source: entry.source || "ia",
    type: "training",
    title: entry.title || "Séance",
    objective: entry.objective || null,
    zone: entry.zone || null,
    place: entry.place || null,
    duration_min: entry.durationMin || 0,
    duration_real_min: entry.durationRealMin || 0,
    completed_sets: entry.completedSets || 0,
    volume: entry.volume || 0,
    calories_estimate: entry.caloriesEstimate || 0,
    feedback: entry.feedback || null,
    difficulty: entry.difficulty || null,
    difficulty_rpe: entry.difficultyRpe || null,
    training_load: entry.trainingLoad || null,
    coach_note: entry.coachNote || null,
    metadata: {
      ...(entry.metadata || {}),
      clientId: entry.id,
      comparison: entry.comparison || null,
      warmup: entry.warmup || [],
      finisher: entry.finisher || "",
      fatigueInput: entry.fatigueInput || "normal",
      volumeByMuscle: entry.volumeByMuscle || {}
    },
    created_at: entry.date || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function mapTrainingExercisesToRemote(remoteSessionId, entry) {
  return (entry.exercises || []).map((exercise, index) => ({
    session_id: remoteSessionId,
    exercise_id: exercise.id,
    exercise_name: exercise.nom || exercise.name || exercise.id,
    position: index,
    sets_planned: exercise.setsPlanned || 0,
    sets_done: exercise.setsDone || 0,
    reps_completed: exercise.repsCompleted || 0,
    rest_sec: exercise.restSec || 0,
    comparison: {
      ...(exercise.comparison || {}),
      repsTarget: exercise.repsTarget || "",
      skipped: Boolean(exercise.skipped),
      modified: Boolean(exercise.modified)
    },
    updated_at: new Date().toISOString()
  }));
}

function mapRecoveryEntryToRemote(entry, profileId) {
  return {
    profile_id: profileId,
    source: entry.source || entry.type || "recovery",
    title: entry.title || "Recovery",
    duration_min: entry.durationRealMin || entry.durationMin || 0,
    stress_impact: entry.metadata?.justification?.[1] || entry.coachNote || "",
    created_at: entry.date || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function mapNutritionHistoryToRemote(entry, profileId) {
  return {
    profile_id: profileId,
    log_date: dayKey(entry.date),
    goal: entry.goal || null,
    calories: entry.calories || null,
    proteins: state.nutritionProfile?.proteins || null,
    carbs: state.nutritionProfile?.carbs || null,
    fats: state.nutritionProfile?.fats || null,
    training_load: entry.trainingLoad || null,
    meal_ids: entry.mealIds || [],
    notes: [],
    updated_at: new Date().toISOString()
  };
}

function mapProgressPhotoToRemote(entry, profileId) {
  return {
    profile_id: profileId,
    photo_date: dayKey(entry.date),
    zone: entry.zone || null,
    weight_kg: entry.weightKg ? Number(entry.weightKg) : null,
    height_cm: entry.heightCm ? parseInt(entry.heightCm, 10) : null,
    context: entry.context || null,
    note: entry.note || null,
    photo_storage_path: entry.photoStoragePath || null,
    metadata: {
      clientId: entry.id,
      sourceUrl: entry.photoDataUrl || ""
    },
    created_at: entry.date ? `${entry.date}T08:00:00.000Z` : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function mapBadgeRows(profileId) {
  return buildBadgeCollection().map((badge) => ({
    profile_id: profileId,
    badge_key: badge.id,
    unlocked_at: badge.unlocked ? new Date().toISOString() : null,
    status: badge.unlocked ? "unlocked" : "locked",
    updated_at: new Date().toISOString()
  }));
}

function mapStreakRows(profileId, shared) {
  return [
    {
      profile_id: profileId,
      streak_type: "activity",
      current_value: shared.stats.streak || 0,
      best_value: Math.max(shared.stats.streak || 0, state.authState?.bestStreak || 0),
      updated_at: new Date().toISOString()
    },
    {
      profile_id: profileId,
      streak_type: "nutrition",
      current_value: shared.fuelRatio || 0,
      best_value: shared.fuelRatio || 0,
      updated_at: new Date().toISOString()
    }
  ];
}

function mapSessionRowToHistoryEntry(sessionRow) {
  const comparison = sessionRow.metadata?.comparison || null;
  const exercises = (sessionRow.session_exercises || [])
    .sort((left, right) => (left.position || 0) - (right.position || 0))
    .map((exercise) => ({
      id: exercise.exercise_id,
      nom: exercise.exercise_name,
      setsPlanned: exercise.sets_planned || 0,
      setsDone: exercise.sets_done || 0,
      repsTarget: exercise.comparison?.repsTarget || "",
      repsCompleted: exercise.reps_completed || 0,
      restSec: exercise.rest_sec || 0,
      skipped: Boolean(exercise.comparison?.skipped),
      modified: Boolean(exercise.comparison?.modified),
      comparison: exercise.comparison || {}
    }));

  return {
    id: sessionRow.metadata?.clientId || `session_${sessionRow.id}`,
    date: sessionRow.created_at,
    title: sessionRow.title,
    source: sessionRow.source || "ia",
    type: sessionRow.type || "training",
    objective: sessionRow.objective || "muscle",
    zone: sessionRow.zone || "full",
    place: sessionRow.place || "mixte",
    equipmentUsed: [],
    durationMin: sessionRow.duration_min || 0,
    durationRealMin: sessionRow.duration_real_min || sessionRow.duration_min || 0,
    caloriesEstimate: sessionRow.calories_estimate || 0,
    completedSets: sessionRow.completed_sets || 0,
    seriesTerminees: sessionRow.completed_sets || 0,
    volume: sessionRow.volume || 0,
    volumeByMuscle: sessionRow.metadata?.volumeByMuscle || {},
    trainingLoad: sessionRow.training_load || "medium",
    fatigueInput: sessionRow.metadata?.fatigueInput || "normal",
    difficulty: sessionRow.difficulty || "tenue",
    difficultyRpe: sessionRow.difficulty_rpe || 0,
    exercises,
    warmup: sessionRow.metadata?.warmup || [],
    finisher: sessionRow.metadata?.finisher || "",
    metadata: sessionRow.metadata || {},
    feedback: sessionRow.feedback || null,
    coachNote: sessionRow.coach_note || "",
    comparison
  };
}

function mapRecoveryRowToHistoryEntry(row) {
  const type = row.source === "noushi" ? "noushi" : "relax";
  return {
    id: `recovery_${row.id}`,
    date: row.created_at,
    title: row.title,
    source: row.source || type,
    type,
    objective: "recovery",
    zone: "full",
    place: "maison",
    equipmentUsed: ["Aucun"],
    durationMin: row.duration_min || 0,
    durationRealMin: row.duration_min || 0,
    caloriesEstimate: Math.round((row.duration_min || 0) * 2.2),
    completedSets: 1,
    seriesTerminees: 1,
    volume: row.duration_min || 0,
    volumeByMuscle: {},
    trainingLoad: "low",
    fatigueInput: "recovery",
    difficulty: "completed",
    difficultyRpe: type === "relax" ? 2 : 3,
    exercises: [],
    warmup: [],
    finisher: "",
    metadata: {},
    feedback: null,
    coachNote: row.stress_impact || ""
  };
}

function mapProgressPhotoRowToEntry(row) {
  return {
    id: row.metadata?.clientId || `progress_${row.id}`,
    remoteId: row.id,
    profileId: row.profile_id,
    date: row.photo_date,
    zone: row.zone || "haut du corps",
    weightKg: row.weight_kg != null ? String(row.weight_kg) : "",
    heightCm: row.height_cm != null ? String(row.height_cm) : "",
    context: row.context || "",
    note: row.note || "",
    photoDataUrl: row.photo_signed_url || "",
    photoStoragePath: row.photo_storage_path || ""
  };
}

function restoreStateFromRemote(remote) {
  state.profile = profileRowToLocalProfile(remote.profile);
  state.profileSnapshots = (remote.bodyMetrics || []).map((metric) => ({
    date: metric.metric_date,
    weightKg: metric.weight_kg != null ? Number(metric.weight_kg) : null,
    notes: metric.notes || ""
  }));

  const recipeFavorites = new Set((remote.recipeFavorites || []).map((item) => `recipe:${item.recipe_id}`));
  const localExerciseFavorites = [...state.favorites].filter((item) => String(item).startsWith("exo:"));
  state.favorites = new Set([...localExerciseFavorites, ...recipeFavorites]);

  const trainingEntries = (remote.sessions || []).map(mapSessionRowToHistoryEntry);
  const recoveryEntries = (remote.recoveryLogs || []).map(mapRecoveryRowToHistoryEntry);
  state.history = [...trainingEntries, ...recoveryEntries]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  state.visualProgressEntries = (remote.progressPhotos || []).map(mapProgressPhotoRowToEntry)
    .filter((entry) => entry.photoDataUrl);

  const latestNutrition = (remote.nutritionDays || [])
    .sort((left, right) => new Date(right.log_date).getTime() - new Date(left.log_date).getTime());
  state.nutritionHistory = latestNutrition.map((entry) => ({
    id: `nutrition_${entry.id}`,
    date: entry.log_date,
    goal: entry.goal || state.profile?.goal || "maintenance",
    calories: entry.calories || 0,
    trainingLoad: entry.training_load || "medium",
    mealIds: entry.meal_ids || []
  }));

  if (latestNutrition[0]) {
    state.nutritionProfile = {
      goal: latestNutrition[0].goal || state.profile?.goal || "maintenance",
      weightKg: state.profile?.weightKg ? Number(state.profile.weightKg) : null,
      activity: state.nutritionProfile?.activity || "medium",
      calories: latestNutrition[0].calories || 0,
      proteins: latestNutrition[0].proteins || 0,
      carbs: latestNutrition[0].carbs || 0,
      fats: latestNutrition[0].fats || 0,
      trainingLoad: latestNutrition[0].training_load || "medium"
    };
  } else {
    state.nutritionProfile = null;
  }

  state.showOnboarding = !Boolean(state.profile?.name || state.profile?.weightKg);
  persistAllUserState();
}

async function enforceAccountStatusOrThrow() {
  if (!state.profile || state.profile.role === "admin") return;
  if (state.profile.accountStatus === "active") return;

  const moderationReason = String(state.profile.moderationReason || "").trim();
  const baseMessage = state.profile.accountStatus === "pending"
    ? "Compte temporairement indisponible."
    : state.profile.accountStatus === "banned"
      ? "Compte supprimé ou banni par la modération."
      : "Compte suspendu par la modération.";
  const message = moderationReason
    ? `${baseMessage} Raison: ${moderationReason}`
    : baseMessage;

  try {
    const client = await getSupabaseClient();
    await client.auth.signOut();
  } catch {}

  resetUserScopedState({ preserveProfileName: state.profile?.name || "" });
  setSignedOutState({
    mode: "supabase",
    error: message,
    notice: ""
  });
  throw new Error(message);
}

async function fetchRemoteSnapshot(profileId) {
  const client = await getSupabaseClient();

  const [
    sessionsResult,
    bodyMetricsResult,
    nutritionResult,
    recipeFavoritesResult,
    recoveryResult,
    progressPhotosResult
  ] = await Promise.all([
    client
      .from("sessions")
      .select(`
        id,
        source,
        type,
        title,
        objective,
        zone,
        place,
        duration_min,
        duration_real_min,
        completed_sets,
        volume,
        calories_estimate,
        feedback,
        difficulty,
        difficulty_rpe,
        training_load,
        coach_note,
        metadata,
        created_at,
        updated_at,
        session_exercises (
          id,
          exercise_id,
          exercise_name,
          position,
          sets_planned,
          sets_done,
          reps_completed,
          rest_sec,
          comparison,
          updated_at
        )
      `)
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
    client
      .from("body_metrics")
      .select("*")
      .eq("profile_id", profileId)
      .order("metric_date", { ascending: false }),
    client
      .from("nutrition_days")
      .select("*")
      .eq("profile_id", profileId)
      .order("log_date", { ascending: false }),
    client
      .from("recipes_favorites")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
    client
      .from("recovery_logs")
      .select("*")
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false }),
    client
      .from("progress_photos")
      .select("*")
      .eq("profile_id", profileId)
      .order("photo_date", { ascending: false })
  ]);

  [sessionsResult, bodyMetricsResult, nutritionResult, recipeFavoritesResult, recoveryResult, progressPhotosResult].forEach((result) => {
    if (result.error) throw result.error;
  });

  const progressPhotos = await Promise.all((progressPhotosResult.data || []).map(async (row) => ({
    ...row,
    photo_signed_url: await createSignedProgressPhotoUrl(client, row.photo_storage_path)
  })));

  return {
    profile: profileRowCache,
    sessions: sessionsResult.data || [],
    bodyMetrics: bodyMetricsResult.data || [],
    nutritionDays: nutritionResult.data || [],
    recipeFavorites: recipeFavoritesResult.data || [],
    recoveryLogs: recoveryResult.data || [],
    progressPhotos
  };
}

export async function pullSupabaseSnapshot() {
  if (isManagedBackendMode()) {
    try {
      const remote = await backendRequest("/api/sync/pull");
      restoreManagedBackendSnapshot(remote, {
        email: state.currentUser?.email || state.syncConfig?.email || "",
        displayName: state.currentUser?.displayName || state.profile?.name || "",
        role: state.profile?.role || defaultProfile.role,
        accountStatus: state.profile?.accountStatus || defaultProfile.accountStatus
      });
      state.syncRuntime = {
        status: "ready",
        error: "",
        lastSyncAt: remote.updatedAt || new Date().toISOString()
      };
      setAuthState({
        status: "ready",
        mode: "backend",
        lastSyncAt: state.syncRuntime.lastSyncAt,
        error: "",
        notice: ""
      });
      return remote;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        clearManagedBackendSession();
        resetUserScopedState({ preserveProfileName: state.profile?.name || "" });
        setSignedOutState({
          mode: "backend",
          error: error?.status === 403 ? (error instanceof Error ? error.message : String(error)) : "",
          notice: error?.status === 401 ? "Session expirée. Reconnecte-toi pour reprendre ton espace." : ""
        });
      }
      throw error;
    }
  }

  const profileRow = await ensureProfileRow();
  const remote = await fetchRemoteSnapshot(profileRow.id);
  restoreStateFromRemote(remote);
  await enforceAccountStatusOrThrow();
  state.syncRuntime = {
    status: "ready",
    error: "",
    lastSyncAt: new Date().toISOString()
  };
  setAuthState({
    status: "ready",
    mode: state.authState.mode,
    lastSyncAt: state.syncRuntime.lastSyncAt,
    error: ""
  });
  return remote;
}

async function replaceRows(client, table, rows, filterKey, filterValue) {
  const { error: deleteError } = await client.from(table).delete().eq(filterKey, filterValue);
  if (deleteError) throw deleteError;
  if (!rows.length) return [];
  const { data, error } = await client.from(table).insert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function pushSupabaseSnapshot() {
  if (isManagedBackendMode()) {
    try {
      const result = await backendRequest("/api/sync/push", {
        method: "POST",
        body: buildManagedBackendSnapshot()
      });
      if (result?.profile) {
        state.profile = hydrateManagedBackendProfile(result.profile, {
          email: state.currentUser?.email || "",
          displayName: state.currentUser?.displayName || "",
          role: state.profile?.role || defaultProfile.role,
          accountStatus: state.profile?.accountStatus || defaultProfile.accountStatus
        });
        persistProfile();
      }
      state.syncRuntime = {
        status: "ready",
        error: "",
        lastSyncAt: result?.updatedAt || new Date().toISOString()
      };
      setAuthState({
        status: "ready",
        mode: "backend",
        lastSyncAt: state.syncRuntime.lastSyncAt,
        error: "",
        notice: ""
      });
      publicSupabaseState({
        status: "ready",
        error: "",
        lastCheckedAt: new Date().toISOString()
      });
      return { synced: true, updatedAt: state.syncRuntime.lastSyncAt };
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        clearManagedBackendSession();
        resetUserScopedState({ preserveProfileName: state.profile?.name || "" });
        setSignedOutState({
          mode: "backend",
          error: error?.status === 403 ? (error instanceof Error ? error.message : String(error)) : "",
          notice: error?.status === 401 ? "Session expirée. Reconnecte-toi pour reprendre ton espace." : ""
        });
      }
      throw error;
    }
  }

  const client = await getSupabaseClient();
  const profileRow = await ensureProfileRow({ syncLocal: true });
  const profileId = profileRow.id;
  const trainingEntries = state.history.filter((entry) => entry.type === "training");
  const recoveryEntries = state.history.filter((entry) => entry.type === "relax" || entry.type === "noushi");
  const shared = getSharedDashboardData();

  await replaceRows(
    client,
    "goals",
    [{
      profile_id: profileId,
      category: "primary",
      target_value: null,
      target_unit: null,
      target_date: null,
      status: "active",
      updated_at: new Date().toISOString()
    }],
    "profile_id",
    profileId
  );

  await replaceRows(
    client,
    "body_metrics",
    (state.profileSnapshots || []).map((snapshot) => ({
      profile_id: profileId,
      metric_date: dayKey(snapshot.date),
      weight_kg: snapshot.weightKg != null ? Number(snapshot.weightKg) : null,
      notes: snapshot.notes || "",
      updated_at: new Date().toISOString()
    })),
    "profile_id",
    profileId
  );

  const uploadedProgressEntries = [];
  for (const entry of state.visualProgressEntries || []) {
    const uploaded = await uploadProgressPhoto(client, state.currentUser, entry);
    uploadedProgressEntries.push({
      ...entry,
      photoDataUrl: uploaded.photoDataUrl || entry.photoDataUrl,
      photoStoragePath: uploaded.photoStoragePath || entry.photoStoragePath
    });
  }
  state.visualProgressEntries = uploadedProgressEntries;
  persistVisualProgressEntries();

  await replaceRows(
    client,
    "progress_photos",
    uploadedProgressEntries.map((entry) => mapProgressPhotoToRemote(entry, profileId)),
    "profile_id",
    profileId
  );

  const remoteSessions = await replaceRows(
    client,
    "sessions",
    trainingEntries.map((entry) => mapTrainingSessionToRemote(entry, profileId)),
    "profile_id",
    profileId
  );

  const sessionExerciseRows = remoteSessions.flatMap((row) => {
    const entry = trainingEntries.find((item) => item.id === row.metadata?.clientId);
    return entry ? mapTrainingExercisesToRemote(row.id, entry) : [];
  });

  if (sessionExerciseRows.length) {
    const { error: exercisesError } = await client
      .from("session_exercises")
      .insert(sessionExerciseRows);
    if (exercisesError) throw exercisesError;
  }

  await replaceRows(
    client,
    "recovery_logs",
    recoveryEntries.map((entry) => mapRecoveryEntryToRemote(entry, profileId)),
    "profile_id",
    profileId
  );

  await replaceRows(
    client,
    "nutrition_days",
    (state.nutritionHistory || []).map((entry) => mapNutritionHistoryToRemote(entry, profileId)),
    "profile_id",
    profileId
  );

  await replaceRows(
    client,
    "recipes_favorites",
    [...state.favorites]
      .filter((favorite) => String(favorite).startsWith("recipe:"))
      .map((favorite) => ({
        profile_id: profileId,
        recipe_id: favorite.split(":")[1],
        created_at: new Date().toISOString()
      })),
    "profile_id",
    profileId
  );

  await replaceRows(client, "badges", mapBadgeRows(profileId), "profile_id", profileId);
  await replaceRows(client, "streaks", mapStreakRows(profileId, shared), "profile_id", profileId);

  const aiContext = {
    profile: state.profile,
    latestTraining: shared.latestTraining,
    latestRecovery: shared.latestRecovery,
    nutrition: shared.nutrition,
    progressPoints: shared.progressPoints
  };
  await client.from("ai_memory").upsert({
    profile_id: profileId,
    memory_key: "context",
    payload: aiContext,
    updated_at: new Date().toISOString()
  }, { onConflict: "profile_id,memory_key" });

  state.syncRuntime = {
    status: "ready",
    error: "",
    lastSyncAt: new Date().toISOString()
  };
  setAuthState({
    status: "ready",
    mode: state.authState.mode,
    lastSyncAt: state.syncRuntime.lastSyncAt,
    error: ""
  });
  publicSupabaseState({
    status: "ready",
    error: "",
    lastCheckedAt: new Date().toISOString()
  });

  return { synced: true, updatedAt: state.syncRuntime.lastSyncAt };
}

async function bindSupabaseAuthListener() {
  if (authListenerBound || !hasSupabaseProductConfig()) return;
  const client = await getSupabaseClient();
  client.auth.onAuthStateChange((_event, session) => {
    if (suppressSupabaseAuthListener) return;
    if (session?.user) {
      setAuthenticatedUser({
        session,
        user: session.user,
        mode: "supabase",
        notice: ""
      });
      ensureProfileRow()
        .then((profileRow) => {
          state.profile = profileRowToLocalProfile(profileRow);
          persistProfile();
          return enforceAccountStatusOrThrow();
        })
        .then(() => pullSupabaseSnapshot())
        .catch((error) => {
          if (!state.currentUser) return;
          setAuthState({
            status: "error",
            mode: "supabase",
            error: readErrorMessage(error)
          });
        });
      return;
    }

    resetUserScopedState();
    setSignedOutState({
      mode: hasSupabaseProductConfig() ? "supabase" : "preview",
      notice: hasSupabaseProductConfig()
        ? "Connecte-toi pour ouvrir ton espace."
        : "Mode local actif."
    });
  });
  authListenerBound = true;
}

export async function initializeAuth() {
  publicSupabaseState({
    status: hasCloudProductConfig() ? "connecting" : "idle",
    error: ""
  });

  if (hasSupabaseProductConfig()) {
    try {
      await bindSupabaseAuthListener();
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.getSession();
      if (error) throw error;

      if (data.session?.user) {
        setAuthenticatedUser({
          session: data.session,
          user: data.session.user,
          mode: "supabase",
          notice: ""
        });
        const profileRow = await ensureProfileRow();
        state.profile = profileRowToLocalProfile(profileRow);
        persistProfile();
        await enforceAccountStatusOrThrow();
        await pullSupabaseSnapshot();
        state.showOnboarding = !Boolean(state.profile?.name || state.profile?.weightKg);
        publicSupabaseState({
          status: "ready",
          error: "",
          lastCheckedAt: new Date().toISOString()
        });
        return { ok: true, mode: "supabase" };
      }

      resetUserScopedState();
      setSignedOutState({
        mode: "supabase",
        notice: "Connecte-toi pour ouvrir ton espace."
      });
      publicSupabaseState({
        status: "ready",
        error: "",
        lastCheckedAt: new Date().toISOString()
      });
      return { ok: false, mode: "supabase" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      publicSupabaseState({
        status: "error",
        error: message,
        lastCheckedAt: new Date().toISOString()
      });
      setAuthState({
        status: "error",
        mode: "supabase",
        error: message,
        notice: isPreviewAuthEnabled() ? "Flow cloud indisponible, mode local possible." : ""
      });
    }
  }

  if (isManagedBackendMode()) {
    try {
      ensureManagedBackendSyncConfig(state.syncConfig?.token || "", state.syncConfig?.email || "");

      if (!state.syncConfig?.token) {
        resetUserScopedState();
        setSignedOutState({
          mode: "backend",
          notice: "Connecte-toi pour ouvrir ton espace."
        });
        publicSupabaseState({
          status: "ready",
          error: "",
          lastCheckedAt: new Date().toISOString()
        });
        return { ok: false, mode: "backend" };
      }

      const data = await backendRequest("/api/auth/session");
      const normalizedUser = normalizeBackendUser(data.user);
      setAuthenticatedUser({
        session: data.session || { token: data.sessionToken || state.syncConfig.token },
        user: normalizedUser,
        mode: "backend",
        notice: ""
      });
      ensureManagedBackendSyncConfig(
        data.sessionToken || state.syncConfig.token,
        data.user?.email || normalizedUser.email
      );
      restoreManagedBackendSnapshot(data, data.user || {});
      publicSupabaseState({
        status: "ready",
        error: "",
        lastCheckedAt: new Date().toISOString()
      });
      return { ok: true, mode: "backend" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const authFailure = error?.status === 401 || error?.status === 403;
      clearManagedBackendSession();
      resetUserScopedState();
      setSignedOutState({
        mode: "backend",
        error: error?.status === 403 ? message : "",
        notice: error?.status === 401
          ? "Connecte-toi pour ouvrir ton espace."
          : authFailure
            ? ""
            : "Backend temporairement indisponible."
      });
      publicSupabaseState({
        status: authFailure ? "ready" : "error",
        error: authFailure ? "" : message,
        lastCheckedAt: new Date().toISOString()
      });
      return { ok: false, mode: "backend" };
    }
  }

  const previewSession = loadJSON(STORAGE_KEYS.previewSession, null);
  if (previewSession && isPreviewAuthEnabled()) {
    const restored = await applyPreviewSession(previewSession);
    return { ok: Boolean(restored), mode: "preview" };
  }

  resetUserScopedState();
  setSignedOutState({
    mode: "preview",
    notice: isPreviewAuthEnabled()
      ? "Mode local disponible tant que Supabase n’est pas branché."
      : "Configuration produit requise pour ouvrir l’espace sécurisé."
  });
  return { ok: false, mode: "preview" };
}

export async function signUpWithPassword({ displayName, email, password }) {
  const safeDisplayName = String(displayName || "").trim();
  const safeEmail = String(email || "").trim().toLowerCase();
  const safePassword = String(password || "");

  if (!safeDisplayName) throw new Error("Pseudo requis");
  if (!safeEmail) throw new Error("Email requis");
  if (safePassword.length < 8) throw new Error("Mot de passe trop court");

  if (hasSupabaseProductConfig()) {
    suppressSupabaseAuthListener = true;
    try {
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email: safeEmail,
        password: safePassword,
        options: {
          data: {
            display_name: safeDisplayName
          }
        }
      });
      if (error) throw error;

      if (data.user && data.session) {
        setAuthenticatedUser({
          session: data.session,
          user: data.user,
          mode: "supabase",
          notice: ""
        });
        state.profile = sanitizeProfile({ ...defaultProfile, name: safeDisplayName });
        persistProfile();
        const profileRow = await ensureProfileRow({ syncLocal: true });
        state.profile = profileRowToLocalProfile(profileRow);
        persistProfile();
        await enforceAccountStatusOrThrow();
        await pushSupabaseSnapshot();
        await pullSupabaseSnapshot();
      } else {
        setSignedOutState({
          mode: "supabase",
          notice: isConfiguredAdminEmail(safeEmail)
            ? "Compte admin créé. Vérifie ton email pour confirmer la session si la confirmation est activée."
            : "Compte créé. Vérifie ton email si la confirmation est activée, puis connecte-toi."
        });
      }
      return data;
    } finally {
      suppressSupabaseAuthListener = false;
    }
  }

  if (isManagedBackendMode()) {
    const data = await backendRequest("/api/auth/signup", {
      method: "POST",
      body: {
        displayName: safeDisplayName,
        email: safeEmail,
        password: safePassword
      },
      auth: false
    });

    if (data.sessionToken && data.user) {
      const normalizedUser = normalizeBackendUser(data.user);
      ensureManagedBackendSyncConfig(data.sessionToken, safeEmail);
      setAuthenticatedUser({
        session: data.session || { token: data.sessionToken },
        user: normalizedUser,
        mode: "backend",
        notice: ""
      });
      state.profile = hydrateManagedBackendProfile(data.profile || {}, data.user || {});
      persistProfile();
      await pullSupabaseSnapshot();
      return data;
    }

    clearManagedBackendSession();
    resetUserScopedState({ preserveProfileName: safeDisplayName });
    setSignedOutState({
      mode: "backend",
      notice: data.message || "Compte créé. Tu peux maintenant te connecter."
    });
    return data;
  }

  if (!isPreviewAuthEnabled()) {
    throw new Error("Aucun provider d’auth disponible");
  }

  const existing = findPreviewUserByEmail(safeEmail);
  if (existing) throw new Error("Un compte existe déjà avec cet email");

  const nextUser = {
    id: `preview_${Date.now().toString(36)}`,
    email: safeEmail,
    password: safePassword,
    displayName: safeDisplayName,
    createdAt: new Date().toISOString()
  };

  const users = loadPreviewUsers();
  users.push(nextUser);
  savePreviewUsers(users);
  savePreviewSession({
    userId: nextUser.id,
    email: nextUser.email,
    createdAt: new Date().toISOString()
  });

  state.profile = sanitizeProfile({ ...defaultProfile, name: safeDisplayName });
  persistProfile();
  await applyPreviewSession({ userId: nextUser.id, email: nextUser.email });
  return { user: previewUserFromRecord(nextUser), session: state.session };
}

export async function signInWithPassword({ email, password }) {
  const safeEmail = String(email || "").trim().toLowerCase();
  const safePassword = String(password || "");

  if (!safeEmail) throw new Error("Email requis");
  if (!safePassword) throw new Error("Mot de passe requis");

  if (hasSupabaseProductConfig()) {
    suppressSupabaseAuthListener = true;
    try {
      const client = await getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: safeEmail,
        password: safePassword
      });
      if (error) throw error;
      if (data.user) {
        setAuthenticatedUser({
          session: data.session || null,
          user: data.user,
          mode: "supabase",
          notice: ""
        });
        const profileRow = await ensureProfileRow();
        state.profile = profileRowToLocalProfile(profileRow);
        persistProfile();
        await enforceAccountStatusOrThrow();
        await pullSupabaseSnapshot();
      }
      return data;
    } finally {
      suppressSupabaseAuthListener = false;
    }
  }

  if (isManagedBackendMode()) {
    const data = await backendRequest("/api/auth/signin", {
      method: "POST",
      body: {
        email: safeEmail,
        password: safePassword
      },
      auth: false
    });
    const normalizedUser = normalizeBackendUser(data.user);
    ensureManagedBackendSyncConfig(data.sessionToken || "", safeEmail);
    setAuthenticatedUser({
      session: data.session || { token: data.sessionToken || "" },
      user: normalizedUser,
      mode: "backend",
      notice: ""
    });
    state.profile = hydrateManagedBackendProfile(data.profile || {}, data.user || {});
    persistProfile();
    await pullSupabaseSnapshot();
    return data;
  }

  const previewUser = findPreviewUserByEmail(safeEmail);
  if (!previewUser || previewUser.password !== safePassword) {
    throw new Error("Identifiants invalides");
  }

  savePreviewSession({
    userId: previewUser.id,
    email: previewUser.email,
    createdAt: new Date().toISOString()
  });
  await applyPreviewSession({
    userId: previewUser.id,
    email: previewUser.email
  });
  return { user: previewUserFromRecord(previewUser), session: state.session };
}

export async function continueWithPreview({ displayName, email, password } = {}) {
  if (!isPreviewAuthEnabled()) {
    throw new Error("Le mode local est désactivé");
  }

  const safeEmail = String(email || "").trim().toLowerCase();
  const safeDisplayName = String(displayName || "").trim() || "Athlète MAYA";
  const safePassword = String(password || "").trim() || "preview-mode";

  const existing = safeEmail ? findPreviewUserByEmail(safeEmail) : null;
  if (existing) {
    return signInWithPassword({
      email: existing.email,
      password: existing.password
    });
  }

  return signUpWithPassword({
    displayName: safeDisplayName,
    email: safeEmail || `preview+${Date.now().toString(36)}@maya.local`,
    password: safePassword.length >= 8 ? safePassword : `${safePassword}1234`
  });
}

export async function signOutCurrentUser() {
  if (state.authState.mode === "supabase" && hasSupabaseProductConfig()) {
    const client = await getSupabaseClient();
    await client.auth.signOut();
  }
  if (state.authState.mode === "backend" && isManagedBackendMode()) {
    try {
      await backendRequest("/api/auth/signout", {
        method: "POST"
      });
    } catch {}
    clearManagedBackendSession();
  }
  clearPreviewSession();
  resetUserScopedState();
  setSignedOutState({
    mode: hasSupabaseProductConfig()
      ? "supabase"
      : isManagedBackendMode()
        ? "backend"
        : "preview",
    notice: hasSupabaseProductConfig()
      ? "Déconnecté. Reconnecte-toi pour retrouver ton espace."
      : isManagedBackendMode()
        ? "Déconnecté. Reconnecte-toi pour retrouver ton espace."
      : "Session locale fermée."
  });
}

export function isAdminUser() {
  return Boolean(state.profile?.role === "admin");
}

function requireAdminAccess() {
  if (!isAdminUser()) {
    throw new Error("Accès admin requis");
  }
}

function normalizeAdminProfileRow(row) {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    email: row.email || "",
    name: row.name || "",
    bio: row.bio || "",
    age: row.age != null ? String(row.age) : "",
    weightKg: row.weight_kg != null ? String(row.weight_kg) : "",
    role: row.role || "user",
    accountStatus: row.account_status || "active",
    moderationReason: row.moderation_reason || "",
    deletedAt: row.deleted_at || "",
    goal: row.goal || defaultProfile.goal,
    level: row.level || defaultProfile.level,
    frequency: row.frequency || defaultProfile.frequency,
    place: row.place || defaultProfile.place,
    sessionTime: row.session_time || defaultProfile.sessionTime,
    preferredSplit: row.preferred_split || defaultProfile.preferredSplit,
    foodPreference: row.food_preference || defaultProfile.foodPreference,
    recoveryPreference: row.recovery_preference || defaultProfile.recoveryPreference,
    coachTone: row.coach_tone || defaultProfile.coachTone,
    photoPath: row.photo_path || "",
    createdAt: row.created_at || ""
  };
}

function normalizeAdminPhotoRow(row) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    id: row.id,
    profileId: row.profile_id,
    userName: profile?.name || "",
    userEmail: profile?.email || "",
    date: row.photo_date,
    zone: row.zone || "",
    weightKg: row.weight_kg != null ? String(row.weight_kg) : "",
    heightCm: row.height_cm != null ? String(row.height_cm) : "",
    context: row.context || "",
    note: row.note || "",
    photoStoragePath: row.photo_storage_path || "",
    photoDataUrl: row.photo_signed_url || "",
    createdAt: row.created_at || ""
  };
}

function normalizeAdminNoteItem(item = {}) {
  return {
    id: String(item.id || ""),
    kind: String(item.kind || "note"),
    title: String(item.title || "Note"),
    date: item.date || "",
    description: String(item.description || "").trim(),
    context: String(item.context || "").trim(),
    meta: item.meta && typeof item.meta === "object" ? item.meta : {}
  };
}

function syncAdminDetailPhotos(profileId) {
  return (state.adminRuntime?.photos || [])
    .filter((photo) => photo.profileId === profileId)
    .sort((left, right) => new Date(right.date || right.createdAt || 0).getTime() - new Date(left.date || left.createdAt || 0).getTime());
}

export function closeAdminUserDetail() {
  state.adminRuntime = {
    ...(state.adminRuntime || {}),
    detailOpen: false,
    detailLoading: false,
    detailError: "",
    detailTab: "photos",
    detailUser: null,
    detailPhotos: [],
    detailNotes: []
  };
}

export function setAdminUserDetailTab(tab = "photos") {
  state.adminRuntime = {
    ...(state.adminRuntime || {}),
    detailTab: tab === "notes" ? "notes" : "photos"
  };
}

export async function openAdminUserDetail(profileId, tab = "photos") {
  requireAdminAccess();
  const selectedUser = (state.adminRuntime?.users || []).find((user) => user.id === profileId) || null;
  state.adminRuntime = {
    ...(state.adminRuntime || {}),
    selectedProfileId: profileId,
    detailOpen: true,
    detailTab: tab === "notes" ? "notes" : "photos",
    detailLoading: true,
    detailError: "",
    detailUser: selectedUser,
    detailPhotos: syncAdminDetailPhotos(profileId),
    detailNotes: []
  };

  if (isManagedBackendMode()) {
    throw new Error("Le détail de modération n’est pas disponible sur ce backend.");
  }

  const client = await getSupabaseClient();
  const { data, error } = await client.rpc("admin_get_user_detail", {
    target_profile_id: profileId
  });
  if (error) {
    state.adminRuntime = {
      ...(state.adminRuntime || {}),
      detailLoading: false,
      detailError: error.message || "Impossible de charger le détail utilisateur"
    };
    throw error;
  }

  const normalizedUser = data?.profile
    ? normalizeAdminProfileRow(data.profile)
    : selectedUser;
  state.adminRuntime = {
    ...(state.adminRuntime || {}),
    detailLoading: false,
    detailError: "",
    detailUser: normalizedUser,
    detailPhotos: syncAdminDetailPhotos(profileId),
    detailNotes: Array.isArray(data?.notes) ? data.notes.map(normalizeAdminNoteItem) : []
  };
  return state.adminRuntime;
}

export async function refreshAdminDashboard() {
  requireAdminAccess();
  if (isManagedBackendMode()) {
    state.adminRuntime = {
      ...(state.adminRuntime || {}),
      loading: true,
      error: ""
    };

    try {
      const data = await backendRequest("/api/admin/dashboard");
      const normalizedUsers = Array.isArray(data.users) ? data.users : [];
      const normalizedPhotos = Array.isArray(data.photos) ? data.photos : [];
      const selectedProfileId = state.adminRuntime?.selectedProfileId || "";
      state.adminRuntime = {
        ...(state.adminRuntime || {}),
        users: normalizedUsers,
        photos: normalizedPhotos,
        detailPhotos: selectedProfileId ? normalizedPhotos.filter((photo) => photo.profileId === selectedProfileId) : [],
        loading: false,
        error: "",
        lastFetchedAt: data.updatedAt || new Date().toISOString()
      };
      return state.adminRuntime;
    } catch (error) {
      state.adminRuntime = {
        ...(state.adminRuntime || {}),
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      };
      throw error;
    }
  }

  const client = await getSupabaseClient();
  state.adminRuntime = {
    ...(state.adminRuntime || {}),
    loading: true,
    error: ""
  };

  try {
    const [profilesResult, photosResult] = await Promise.all([
      client
        .from("profiles")
        .select("id, auth_user_id, email, name, bio, age, weight_kg, role, account_status, moderation_reason, deleted_at, goal, level, frequency, place, session_time, preferred_split, food_preference, recovery_preference, coach_tone, photo_path, created_at")
        .order("created_at", { ascending: false }),
      client
        .from("progress_photos")
        .select(`
          id,
          profile_id,
          photo_date,
          zone,
          weight_kg,
          height_cm,
          context,
          note,
          photo_storage_path,
          created_at,
          profiles!inner (
            name,
            email,
            role,
            account_status
          )
        `)
        .order("photo_date", { ascending: false })
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (photosResult.error) throw photosResult.error;

    const signedPhotos = await Promise.all((photosResult.data || []).map(async (row) => ({
      ...row,
      photo_signed_url: await createSignedProgressPhotoUrl(client, row.photo_storage_path)
    })));
    const normalizedUsers = (profilesResult.data || []).map(normalizeAdminProfileRow);
    const normalizedPhotos = signedPhotos.map(normalizeAdminPhotoRow);
    const selectedProfileId = state.adminRuntime?.selectedProfileId || "";

    state.adminRuntime = {
      ...(state.adminRuntime || {}),
      users: normalizedUsers,
      photos: normalizedPhotos,
      detailPhotos: selectedProfileId ? normalizedPhotos.filter((photo) => photo.profileId === selectedProfileId) : [],
      loading: false,
      error: "",
      lastFetchedAt: new Date().toISOString()
    };
    return state.adminRuntime;
  } catch (error) {
    state.adminRuntime = {
      ...(state.adminRuntime || {}),
      loading: false,
      error: error instanceof Error ? error.message : String(error)
    };
    throw error;
  }
}

export async function deleteAdminProgressPhoto(photoId) {
  requireAdminAccess();
  if (isManagedBackendMode()) {
    await backendRequest(`/api/admin/photos/${encodeURIComponent(photoId)}`, {
      method: "DELETE"
    });
    return refreshAdminDashboard();
  }

  const client = await getSupabaseClient();
  const { data: row, error: fetchError } = await client
    .from("progress_photos")
    .select("id, photo_storage_path")
    .eq("id", photoId)
    .single();
  if (fetchError) throw fetchError;

  if (row?.photo_storage_path) {
    await client.storage
      .from(getSupabaseProductConfig().progressBucket || "progress-photos")
      .remove([row.photo_storage_path]);
  }

  const { error } = await client
    .from("progress_photos")
    .delete()
    .eq("id", photoId);
  if (error) throw error;

  await refreshAdminDashboard();
  if (state.adminRuntime?.detailOpen && state.adminRuntime?.selectedProfileId) {
    state.adminRuntime = {
      ...(state.adminRuntime || {}),
      detailPhotos: syncAdminDetailPhotos(state.adminRuntime.selectedProfileId)
    };
  }
  return state.adminRuntime;
}

export async function deleteAdminUserPhotos(profileId) {
  requireAdminAccess();
  if (isManagedBackendMode()) {
    await backendRequest(`/api/admin/users/${encodeURIComponent(profileId)}/photos`, {
      method: "DELETE"
    });
    return refreshAdminDashboard();
  }

  const client = await getSupabaseClient();
  const { data: rows, error: fetchError } = await client
    .from("progress_photos")
    .select("id, photo_storage_path")
    .eq("profile_id", profileId);
  if (fetchError) throw fetchError;

  const paths = (rows || []).map((row) => row.photo_storage_path).filter(Boolean);
  if (paths.length) {
    await client.storage
      .from(getSupabaseProductConfig().progressBucket || "progress-photos")
      .remove(paths);
  }

  const { error } = await client
    .from("progress_photos")
    .delete()
    .eq("profile_id", profileId);
  if (error) throw error;

  await refreshAdminDashboard();
  if (state.adminRuntime?.detailOpen && state.adminRuntime?.selectedProfileId === profileId) {
    state.adminRuntime = {
      ...(state.adminRuntime || {}),
      detailPhotos: []
    };
  }
  return state.adminRuntime;
}

export async function setAdminUserStatus(profileId, status) {
  requireAdminAccess();
  const safeStatus = ["pending", "active", "suspended", "banned"].includes(status) ? status : "active";
  if (isManagedBackendMode()) {
    if (state.currentUser?.id === profileId && safeStatus !== "active") {
      throw new Error("Impossible de désactiver le compte admin connecté.");
    }
    await backendRequest(`/api/admin/users/${encodeURIComponent(profileId)}/status`, {
      method: "PATCH",
      body: {
        status: safeStatus
      }
    });
    return refreshAdminDashboard();
  }

  const currentProfileRow = await ensureProfileRow();
  if (currentProfileRow?.id === profileId && safeStatus !== "active") {
    throw new Error("Impossible de désactiver le compte admin connecté.");
  }
  const client = await getSupabaseClient();
  const updatePayload = {
    account_status: safeStatus,
    updated_at: new Date().toISOString(),
    ...(safeStatus === "active"
      ? {
          moderation_reason: "",
          deleted_at: null
        }
      : {})
  };
  const { error } = await client
    .from("profiles")
    .update(updatePayload)
    .eq("id", profileId);
  if (error) throw error;

  return refreshAdminDashboard();
}

export async function deleteAdminUserAccount(profileId, reason) {
  requireAdminAccess();
  const safeReason = String(reason || "").trim();
  if (!safeReason) {
    throw new Error("Raison requise pour supprimer le compte.");
  }

  if (isManagedBackendMode()) {
    throw new Error("Suppression de compte indisponible sur ce backend.");
  }

  const client = await getSupabaseClient();
  const targetUser = (state.adminRuntime?.users || []).find((user) => user.id === profileId) || null;
  const progressPaths = [...new Set(
    (state.adminRuntime?.photos || [])
      .filter((photo) => photo.profileId === profileId)
      .map((photo) => photo.photoStoragePath)
      .filter(Boolean)
  )];

  if (progressPaths.length) {
    await client.storage
      .from(getSupabaseProductConfig().progressBucket || "progress-photos")
      .remove(progressPaths)
      .catch(() => {});
  }

  if (targetUser?.authUserId) {
    await client.storage
      .from(getSupabaseProductConfig().avatarBucket || "avatars")
      .remove([`${targetUser.authUserId}/avatar.jpg`])
      .catch(() => {});
  }

  const { data, error } = await client.rpc("admin_remove_user_account", {
    target_profile_id: profileId,
    delete_reason: safeReason
  });
  if (error) throw error;

  await refreshAdminDashboard();
  if (state.adminRuntime?.detailOpen && state.adminRuntime?.selectedProfileId === profileId) {
    closeAdminUserDetail();
  }
  return data;
}

export function updateSupabaseConfig(partialConfig) {
  return publicSupabaseState(partialConfig);
}

export async function testSupabaseConfig() {
  if (isManagedBackendMode()) {
    try {
      const response = await backendRequest("/api/health", { auth: false });
      publicSupabaseState({
        status: "ready",
        error: "",
        lastCheckedAt: new Date().toISOString()
      });
      return { ok: true, provider: "backend", response };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      publicSupabaseState({
        status: "error",
        error: message,
        lastCheckedAt: new Date().toISOString()
      });
      return { ok: false, provider: "backend", error: message };
    }
  }

  if (!hasSupabaseProductConfig()) {
    publicSupabaseState({
      status: "idle",
      error: "Config Supabase interne manquante",
      lastCheckedAt: new Date().toISOString()
    });
    return { ok: false, error: "Config Supabase interne manquante" };
  }

  const config = getSupabaseProductConfig();

  try {
    const response = await fetch(`${config.url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: {
        apikey: config.anonKey
      }
    });

    if (!response.ok) {
      throw new Error(`Supabase HTTP ${response.status}`);
    }

    publicSupabaseState({
      status: "ready",
      error: "",
      lastCheckedAt: new Date().toISOString()
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    publicSupabaseState({
      status: "error",
      error: message,
      lastCheckedAt: new Date().toISOString()
    });
    return { ok: false, error: message };
  }
}

export function isCloudSessionReady() {
  return Boolean(["supabase", "backend"].includes(state.authState.mode) && state.currentUser?.id);
}
