import { buildAdaptiveInputsFromHistory, generateAIPlan, generatePlanWithCloudFallback, prefillAIFromExercise, testAIConfig } from "./ai.js";
import { EXO_BY_ID, EXOS, NOUSHI_BY_ID, RECIPE_BY_ID, RELAX_BY_ID, getExercisesByPlace } from "./catalog.js";
import { getAppDiagnostics } from "./diagnostics.js";
import { generateFlowiseSessionId, syncFlowiseWidget, updateFlowiseConfig } from "./flowise.js";
import { ensureLiteYouTubeEmbed } from "./lite-youtube.js";
import { notifyTopRecommendation, refreshNotificationPermission, registerServiceWorker, requestNotificationPermission, sendCoachNotification, startNotificationPulse } from "./notifications.js";
import { buildDailyMealPlan, inferTrainingLoad, saveNutritionPlan } from "./nutrition.js";
import { goBack, goToPage, initRouter, refreshCurrentPage, refreshShell } from "./router.js";
import { computeCoachRecommendations } from "./recommendations.js";
import {
  closeAdminUserDetail,
  deleteAdminUserAccount,
  continueWithPreview,
  deleteAdminProgressPhoto,
  deleteAdminUserPhotos,
  initializeAuth,
  isCloudSessionReady,
  openAdminUserDetail,
  refreshAdminDashboard,
  setAdminUserDetailTab,
  setAdminUserStatus,
  signInWithPassword,
  signOutCurrentUser,
  signUpWithPassword,
  testSupabaseConfig
} from "./supabase.js";
import { pullSyncSnapshot, pushSyncSnapshot, scheduleAutoSync } from "./sync.js";
import { defaultCustomWorkoutDraft, defaultProfile, persistFavorites, persistVisualProgressEntries, resetPhotoProgressDraft, state, updateProfile } from "./state.js";
import { readErrorMessage } from "./utils.js";
import { APP_VERSION } from "./version.js";
import { appendExerciseToCustomWorkout, applyFeedback, buildAdjustedPlan, buildCustomPlanFromDraft, buildCustomWorkoutCoachAlerts, buildNoushiChallengePlan, createCustomWorkoutSession, createProtocolHistoryEntry, finishWorkout, historyEntryToPlan, removeCustomWorkoutSession, resetCustomWorkoutDraft, setActiveCustomWorkoutSession, setCustomWorkoutDraft, startPlan, workoutDoneAction, workoutModifyAction, workoutSkipAction } from "./workout.js";

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function updateClock() {
  const now = new Date();
  document.getElementById("headerDate").textContent = now.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
  document.getElementById("headerClock").textContent = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function syncViewportHeight() {
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${Math.round(viewportHeight)}px`);
}

function syncBuildLabel() {
  document.querySelectorAll("[data-build-label]").forEach((node) => {
    node.textContent = APP_VERSION;
  });
}

function toggleFavorite(type, id) {
  const key = `${type}:${id}`;
  if (state.favorites.has(key)) {
    state.favorites.delete(key);
    showToast("Retiré des favoris");
  } else {
    state.favorites.add(key);
    showToast("Ajouté aux favoris");
  }
  persistFavorites();
  refreshCurrentPage();
}

function getIAInputsFromDom() {
  return {
    time: parseInt(document.getElementById("iaTime")?.value || state.profile?.sessionTime || "35", 10),
    place: document.getElementById("iaPlace")?.value || state.profile?.place || defaultProfile.place,
    zone: document.getElementById("iaZone")?.value || "full",
    energy: document.getElementById("iaEnergy")?.value || "normal",
    goal: document.getElementById("iaGoal")?.value || state.profile?.goal || "muscle",
    level: document.getElementById("iaLevel")?.value || state.profile?.level || "2",
    preferredExerciseId: state.aiDraft.preferredExerciseId || "",
    previousEntryId: state.aiDraft.previousEntryId || "",
    seedExerciseIds: state.aiDraft.seedExerciseIds || [],
    cycleWeek: state.cycleState.cycleWeek,
    athleteProfile: state.profile || defaultProfile
  };
}

function getProfileFromDom() {
  return {
    ...(state.profile || defaultProfile),
    name: document.getElementById("profileName")?.value || state.profile?.name || "",
    age: document.getElementById("profileAge")?.value || state.profile?.age || "",
    weightKg: document.getElementById("profileWeight")?.value || state.profile?.weightKg || "",
    bio: document.getElementById("profileBio")?.value || state.profile?.bio || "",
    goal: document.getElementById("profileGoal")?.value || state.profile?.goal || defaultProfile.goal,
    level: document.getElementById("profileLevel")?.value || state.profile?.level || defaultProfile.level,
    frequency: document.getElementById("profileFrequency")?.value || state.profile?.frequency || defaultProfile.frequency,
    place: document.getElementById("profilePlace")?.value || state.profile?.place || defaultProfile.place,
    sessionTime: document.getElementById("profileSessionTime")?.value || state.profile?.sessionTime || defaultProfile.sessionTime,
    preferredSplit: document.getElementById("profilePreferredSplit")?.value || state.profile?.preferredSplit || defaultProfile.preferredSplit,
    foodPreference: document.getElementById("profileFoodPreference")?.value || state.profile?.foodPreference || defaultProfile.foodPreference,
    recoveryPreference: document.getElementById("profileRecoveryPreference")?.value || state.profile?.recoveryPreference || defaultProfile.recoveryPreference,
    coachTone: document.getElementById("profileCoachTone")?.value || state.profile?.coachTone || defaultProfile.coachTone
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Impossible de lire la photo"));
    reader.readAsDataURL(file);
  });
}

async function buildProfilePhotoDataUrl(file) {
  if (!file) return "";
  const source = await readFileAsDataUrl(file);
  const image = await new Promise((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Impossible de charger la photo"));
    nextImage.src = source;
  });
  const size = 240;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;
  const ratio = Math.max(size / image.width, size / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  ctx.fillStyle = "#120f14";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, x, y, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function resolveProfilePhotoForSave() {
  const photoInput = document.getElementById("profilePhotoInput");
  if (!(photoInput instanceof HTMLInputElement) || !photoInput.files?.length) {
    return state.profilePhotoPreview || state.profile?.photoDataUrl || "";
  }
  const nextPhoto = await buildProfilePhotoDataUrl(photoInput.files[0]);
  state.profilePhotoPreview = nextPhoto;
  photoInput.value = "";
  return nextPhoto;
}

function setAuthRuntimeState(partialState) {
  state.authState = {
    ...(state.authState || {}),
    ...partialState,
    initialized: true
  };
}

async function routeAfterAuthentication() {
  if (!state.currentUser) {
    await navigateToPage("auth");
    refreshCurrentPage();
    return;
  }

  state.authDraft = {
    ...(state.authDraft || {}),
    password: "",
    confirmPassword: ""
  };

  if (state.profile?.role === "admin") {
    updateFlowiseConfig({
      enabled: false,
      status: "idle",
      error: ""
    });
    await navigateToPage("admin");
    refreshCurrentPage();
    await refreshAdminDashboard().catch((error) => {
      state.adminRuntime = {
        ...(state.adminRuntime || {}),
        error: readErrorMessage(error, "Impossible de charger le pôle de modération")
      };
    });
    refreshCurrentPage();
    return;
  }

  state.flowiseConfig.enabled = true;
  updateFlowiseConfig({
    enabled: true,
    sessionId: generateFlowiseSessionId()
  });
  await navigateToPage("home");
  refreshCurrentPage();
  await pullSyncSnapshot().catch(() => {});
  refreshCurrentPage();
  await syncFlowiseWidget().catch(() => {});
}

async function handleAuthSubmit() {
  const payload = {
    displayName: String(state.authDraft.displayName || "").trim(),
    email: String(state.authDraft.email || "").trim(),
    password: String(state.authDraft.password || "").trim()
  };

  setAuthRuntimeState({
    status: "authenticating",
    error: "",
    notice: ""
  });
  refreshCurrentPage();

  try {
    if (state.authScreenMode === "signup") {
      if (payload.password !== String(state.authDraft.confirmPassword || "").trim()) {
        throw new Error("Les mots de passe ne correspondent pas");
      }
      const result = await signUpWithPassword(payload);
      showToast(
        state.currentUser
          ? "Compte créé"
          : (result?.message || "Compte créé, connecte-toi maintenant")
      );
    } else {
      await signInWithPassword(payload);
      showToast("Connexion réussie");
    }
    await routeAfterAuthentication();
  } catch (error) {
    setAuthRuntimeState({
      status: "signed_out",
      error: readErrorMessage(error, "Erreur d’authentification")
    });
    refreshCurrentPage();
    showToast(readErrorMessage(error, "Erreur d’auth"));
  }
}

async function handlePreviewEntry() {
  setAuthRuntimeState({
    status: "authenticating",
    error: "",
    notice: ""
  });
  refreshCurrentPage();

  try {
    await continueWithPreview({
      displayName: state.authDraft.displayName,
      email: state.authDraft.email,
      password: state.authDraft.password
    });
    showToast("Mode local prêt");
    await routeAfterAuthentication();
  } catch (error) {
    setAuthRuntimeState({
      status: "signed_out",
      error: readErrorMessage(error, "Erreur accès local")
    });
    refreshCurrentPage();
    showToast(readErrorMessage(error, "Erreur accès local"));
  }
}

async function handleGeneratePlan() {
  const button = document.querySelector('[data-action="generate-plan"]');
  if (button) {
    button.setAttribute("disabled", "disabled");
    button.textContent = "Génération...";
  }
  state.aiRuntime = {
    ...state.aiRuntime,
    status: "connecting",
    error: "",
    source: state.aiConfig.mode,
    internetEnabled: Boolean(state.aiConfig.webSearch)
  };
  refreshCurrentPage();

  try {
    const result = await generatePlanWithCloudFallback(getIAInputsFromDom());
    state.currentPlan = result.plan;
    state.coachSheetOpen = false;
    state.aiRuntime = {
      source: result.source,
      latencyMs: result.latencyMs,
      error: result.error,
      status: result.error ? "fallback" : "ready",
      lastCheckedAt: new Date().toISOString(),
      internetEnabled: Boolean(state.aiConfig.webSearch)
    };
    showToast(result.source === "local-fallback" ? "Fallback local activé" : `Séance générée (${result.source})`);
  } catch (error) {
    state.aiRuntime = {
      ...state.aiRuntime,
      status: "error",
      error: readErrorMessage(error, "Erreur IA"),
      lastCheckedAt: new Date().toISOString()
    };
    showToast(readErrorMessage(error, "Erreur IA"));
  } finally {
    if (button) {
      button.removeAttribute("disabled");
      button.textContent = "Générer la séance IA";
    }
    refreshCurrentPage();
  }
}

async function handleQuickSession() {
  const inputs = {
    time: parseInt(state.profile?.sessionTime || "20", 10),
    place: state.profile?.place || defaultProfile.place,
    zone: "full",
    energy: "normal",
    goal: state.profile?.goal || "muscle",
    level: state.profile?.level || "2",
    cycleWeek: state.cycleState.cycleWeek
  };
  const plan = generateAIPlan(inputs);
  plan.inputs = { ...plan.inputs, quick: true };
  startPlan(plan);
  state.page = "workout";
  goToPage("workout");
  showToast("Séance rapide lancée");
}

function runGeneratedPlan() {
  if (!state.currentPlan) {
    showToast("Aucun plan à démarrer");
    return;
  }
  startPlan(state.currentPlan);
  goToPage("workout");
  showToast("Séance démarrée");
}

function resolveExerciseFilterMode(exercise) {
  return ["maison", "salle", "mixte"].includes(exercise?.pole || "")
    ? exercise.pole
    : "all";
}

function focusExerciseCatalog(exerciseId, { withSimilar = true } = {}) {
  const exercise = EXO_BY_ID.get(exerciseId);
  if (!exercise) return false;

  state.exoFilter = {
    search: exercise.nom || "",
    mode: resolveExerciseFilterMode(exercise),
    muscle: "all",
    similarTo: withSimilar ? exercise.id : ""
  };
  goToPage("exos");
  return true;
}

function openGlobalResult(type, id) {
  if (type === "exo") {
    focusExerciseCatalog(id);
    return;
  }
  if (type === "recipe") {
    state.nutritionFilter.search = RECIPE_BY_ID.get(id)?.nom || "";
    goToPage("nutrition");
  }
}

function runNutritionAI() {
  const goal = document.getElementById("nutriGoal")?.value || state.profile?.goal || "maintenance";
  const weightKg = parseFloat(document.getElementById("nutriWeight")?.value || state.profile?.weightKg || "75");
  const activity = document.getElementById("nutriActivity")?.value || "medium";
  const latestTraining = state.currentPlan || state.history.find((entry) => entry.type === "training");
  const trainingLoad = inferTrainingLoad(latestTraining);
  if (Number.isFinite(weightKg) && String(weightKg) !== String(state.profile?.weightKg || "")) {
    updateProfile({ ...(state.profile || defaultProfile), weightKg: String(weightKg) });
  }
  const dayPlan = buildDailyMealPlan({ goal, weightKg, activity, trainingLoad });
  saveNutritionPlan(goal, weightKg, activity, trainingLoad, dayPlan);
  state.nutritionFilter.goal = goal;
  scheduleAutoSync();
  showToast("Plan nutrition du jour généré");
  refreshCurrentPage();
}

async function saveProfileFromInputs() {
  const nextProfile = updateProfile({
    ...getProfileFromDom(),
    photoDataUrl: await resolveProfilePhotoForSave()
  });
  state.onboardingDraft = { ...(state.onboardingDraft || {}), ...nextProfile };
  state.profilePhotoPreview = "";
  scheduleAutoSync();
  showToast("Profil athlète enregistré");
  refreshCurrentPage();
}

async function navigateToPage(page, options = {}) {
  goToPage(page, options);

  if (page === "admin" && state.profile?.role === "admin" && isCloudSessionReady()) {
    try {
      await refreshAdminDashboard();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erreur admin");
    }
    refreshCurrentPage();
  }
}

function openSettingsTab(tab) {
  const aliases = {
    profile: "identity",
    coach: "ai-sync",
    sync: "ai-sync",
    app: "ai-sync",
    system: "ai-sync"
  };
  state.settingsTab = aliases[tab] || tab || "identity";
  goToPage("settings");
}

function ensureCustomWorkoutDraft() {
  if (!state.customWorkoutDraft) {
    setCustomWorkoutDraft(structuredClone(defaultCustomWorkoutDraft));
  }
}

function clearPendingCustomWorkoutTarget() {
  state.customWorkoutPendingExerciseId = "";
}

function createNewCustomWorkoutSession({ pendingExerciseId = "", title = "" } = {}) {
  const session = createCustomWorkoutSession({
    title: title || undefined,
    place: state.profile?.place || defaultProfile.place
  });
  if (!session) return null;
  state.customWorkoutSearch = "";
  if (pendingExerciseId) {
    appendExerciseToCustomWorkout(pendingExerciseId, session.id);
    clearPendingCustomWorkoutTarget();
  }
  return session;
}

function addExerciseToChosenCustomWorkout(sessionId, exerciseId) {
  const draft = appendExerciseToCustomWorkout(exerciseId, sessionId);
  if (!draft) return null;
  setActiveCustomWorkoutSession(sessionId);
  state.customWorkoutSearch = "";
  clearPendingCustomWorkoutTarget();
  return draft;
}

function updateCustomWorkoutField(field, value) {
  ensureCustomWorkoutDraft();
  setCustomWorkoutDraft({
    ...state.customWorkoutDraft,
    [field]: value
  });
  queueCustomWorkoutNotification();
}

function updateCustomWorkoutBlock(blockId, field, value) {
  ensureCustomWorkoutDraft();
  setCustomWorkoutDraft({
    ...state.customWorkoutDraft,
    blocks: (state.customWorkoutDraft.blocks || []).map((block) => (
      block.id === blockId
        ? { ...block, [field]: value }
        : block
    ))
  });
  queueCustomWorkoutNotification();
}

function addCustomWorkoutBlock() {
  ensureCustomWorkoutDraft();
  setCustomWorkoutDraft({
    ...state.customWorkoutDraft,
    targetExerciseCount: String(Math.min(12, (state.customWorkoutDraft.blocks || []).length + 1))
  });
  queueCustomWorkoutNotification();
}

function removeCustomWorkoutBlock(blockId) {
  ensureCustomWorkoutDraft();
  const nextBlocks = (state.customWorkoutDraft.blocks || []).filter((block) => block.id !== blockId);
  if (!nextBlocks.length) return false;
  setCustomWorkoutDraft({
    ...state.customWorkoutDraft,
    targetExerciseCount: String(nextBlocks.length),
    blocks: nextBlocks
  });
  queueCustomWorkoutNotification();
  return true;
}

function startCustomWorkout() {
  const plan = buildCustomPlanFromDraft(state.customWorkoutDraft);
  if (!plan) {
    showToast("Séance personnalisée incomplète");
    return;
  }
  startPlan(plan);
  goToPage("workout");
  showToast("Séance personnalisée démarrée");
}

function getTopCustomWorkoutAlert() {
  return buildCustomWorkoutCoachAlerts(state.customWorkoutDraft)[0] || null;
}

function queueCustomWorkoutNotification() {
  const topAlert = getTopCustomWorkoutAlert();
  if (!topAlert || !["alert", "warn"].includes(topAlert.tone)) return;
  if (state.notificationConfig.permission !== "granted" || !state.notificationConfig.enabled) return;

  const signature = `${topAlert.id}:${topAlert.title}:${topAlert.body}`;
  if (state.customCoachRuntime.lastAlertSignature === signature) return;
  state.customCoachRuntime.lastAlertSignature = signature;
  sendCoachNotification("Maya Coach", topAlert.body, { page: "my-session", tone: topAlert.tone }).catch(() => {});
}

async function sendCustomWorkoutNotification() {
  const topAlert = getTopCustomWorkoutAlert();
  if (!topAlert) {
    showToast("Aucune alerte à envoyer");
    return;
  }
  const result = await sendCoachNotification("Maya Coach", topAlert.body, { page: "my-session", tone: topAlert.tone });
  showToast(result.sent ? "Notification envoyée" : "Active les notifications d’abord");
}

function updatePhotoProgressDraft(field, value) {
  state.photoProgressDraft = {
    ...(state.photoProgressDraft || resetPhotoProgressDraft()),
    [field]: value
  };
}

async function saveProgressPhoto() {
  const draft = state.photoProgressDraft || resetPhotoProgressDraft();
  if (!draft.photoDataUrl) {
    showToast("Ajoute une photo pour la frise");
    return;
  }

  const entry = {
    ...draft,
    id: `progress_${Date.now()}`
  };

  state.visualProgressEntries = [entry, ...(state.visualProgressEntries || [])]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 120);
  persistVisualProgressEntries();

  if (draft.weightKg && String(draft.weightKg) !== String(state.profile?.weightKg || "")) {
    updateProfile({
      ...(state.profile || defaultProfile),
      weightKg: String(draft.weightKg)
    });
  }

  resetPhotoProgressDraft({ zone: draft.zone });
  refreshCurrentPage();

  if (isCloudSessionReady()) {
    try {
      await pushSyncSnapshot();
      await pullSyncSnapshot();
      showToast("Progression visuelle synchronisée");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erreur de sync cloud");
    }
    refreshCurrentPage();
    return;
  }

  scheduleAutoSync();
  showToast("Photo ajoutée à la frise");
}

async function handleAdminRefresh() {
  await refreshAdminDashboard();
  refreshCurrentPage();
}

function updateAdminFilter(field, value) {
  state.adminRuntime = {
    ...(state.adminRuntime || {}),
    [field]: value
  };
  refreshCurrentPage();
}

async function routeAction(action, target) {
  switch (action) {
    case "auth-set-mode":
      state.authScreenMode = target.dataset.mode === "signup" ? "signup" : "login";
      state.authState = { ...(state.authState || {}), error: "", notice: "" };
      refreshCurrentPage();
      return;
    case "auth-submit":
      await handleAuthSubmit();
      return;
    case "auth-use-demo":
      await handlePreviewEntry();
      return;
    case "toggle-nav":
      state.navExpanded = !state.navExpanded;
      refreshShell();
      return;
    case "go-page":
      await navigateToPage(target.dataset.page);
      return;
    case "go-back":
      goBack();
      return;
    case "go-settings-tab":
      openSettingsTab(target.dataset.tab);
      return;
    case "open-sheet":
      if (target.dataset.sheet === "coach") state.coachSheetOpen = true;
      if (target.dataset.sheet === "nutrition") state.nutritionSheetOpen = true;
      refreshCurrentPage();
      return;
    case "close-sheet":
      if (target.dataset.sheet === "coach") state.coachSheetOpen = false;
      if (target.dataset.sheet === "nutrition") state.nutritionSheetOpen = false;
      refreshCurrentPage();
      return;
    case "go-ia":
      goToPage("ia");
      return;
    case "go-exos":
      goToPage("exos");
      return;
    case "quick-session":
      await handleQuickSession();
      return;
    case "generate-plan":
      await handleGeneratePlan();
      return;
    case "clear-global-search":
      state.globalSearch = "";
      refreshCurrentPage();
      return;
    case "clear-exo-search":
      state.exoFilter.search = "";
      refreshCurrentPage();
      return;
    case "set-exo-mode":
      state.exoFilter.mode = target.dataset.mode || "all";
      refreshCurrentPage();
      return;
    case "clear-custom-session-search":
      state.customWorkoutSearch = "";
      refreshCurrentPage();
      return;
    case "clear-nutrition-search":
      state.nutritionFilter.search = "";
      refreshCurrentPage();
      return;
    case "start-generated-plan":
      runGeneratedPlan();
      return;
    case "add-custom-block":
      addCustomWorkoutBlock();
      refreshCurrentPage();
      return;
    case "remove-custom-block":
      if (removeCustomWorkoutBlock(target.dataset.id)) {
        refreshCurrentPage();
      }
      return;
    case "create-custom-workout-session":
      createNewCustomWorkoutSession({
        pendingExerciseId: state.customWorkoutPendingExerciseId,
        title: target.dataset.title || ""
      });
      refreshCurrentPage();
      return;
    case "activate-custom-workout-session":
      setActiveCustomWorkoutSession(target.dataset.id);
      refreshCurrentPage();
      return;
    case "remove-custom-workout-session":
      removeCustomWorkoutSession(target.dataset.id);
      clearPendingCustomWorkoutTarget();
      refreshCurrentPage();
      return;
    case "choose-custom-workout-session":
      if (!state.customWorkoutPendingExerciseId) return;
      addExerciseToChosenCustomWorkout(target.dataset.id, state.customWorkoutPendingExerciseId);
      showToast("Exercice ajouté à la séance choisie");
      refreshCurrentPage();
      return;
    case "cancel-custom-workout-target":
      clearPendingCustomWorkoutTarget();
      refreshCurrentPage();
      return;
    case "reset-custom-workout":
      resetCustomWorkoutDraft({
        place: state.customWorkoutDraft?.place || state.profile?.place || defaultCustomWorkoutDraft.place
      });
      refreshCurrentPage();
      return;
    case "start-custom-workout":
      startCustomWorkout();
      return;
    case "send-custom-workout-notification":
      await sendCustomWorkoutNotification();
      return;
    case "save-progress-photo":
      await saveProgressPhoto();
      return;
    case "sync-flowise-widget": {
      const result = await syncFlowiseWidget();
      showToast(result.ok
        ? "Flowise relancé"
        : (result.error || "Flowise à vérifier"));
      refreshCurrentPage();
      return;
    }
    case "reset-flowise-session": {
      updateFlowiseConfig({
        sessionId: generateFlowiseSessionId(),
        status: "idle",
        error: ""
      });
      const result = await syncFlowiseWidget();
      showToast(result.ok ? "Nouvelle session Flowise" : "Session Flowise régénérée");
      refreshCurrentPage();
      return;
    }
    case "test-ai-config":
      await testAIConfig();
      showToast(`Test IA terminé • ${state.aiRuntime.source}`);
      refreshCurrentPage();
      return;
    case "save-profile":
      await saveProfileFromInputs();
      return;
    case "remove-profile-photo":
      updateProfile({ ...(state.profile || defaultProfile), photoDataUrl: "" });
      state.profilePhotoPreview = "";
      showToast("Photo de profil retirée");
      refreshCurrentPage();
      return;
    case "request-notifications": {
      try {
        const permission = await requestNotificationPermission();
        if (permission === "granted") {
          await notifyTopRecommendation(true).catch(() => {});
        }
        showToast(permission === "granted" ? "Notifications activées" : "Notifications refusées");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Notifications indisponibles");
      }
      refreshCurrentPage();
      return;
    }
    case "test-supabase-config": {
      const result = await testSupabaseConfig();
      showToast(
        result.ok
          ? (result.provider === "backend" ? "Backend joignable" : "Supabase joignable")
          : (result.error || (result.provider === "backend" ? "Erreur backend" : "Erreur Supabase"))
      );
      refreshCurrentPage();
      return;
    }
    case "push-sync":
      try {
        await pushSyncSnapshot();
        showToast("Historique synchronisé");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Erreur sync");
      }
      refreshCurrentPage();
      return;
    case "pull-sync":
      try {
        await pullSyncSnapshot();
        showToast("Données récupérées");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Erreur sync");
      }
      refreshCurrentPage();
      return;
    case "logout":
      await signOutCurrentUser();
      showToast("Session fermée");
      await navigateToPage("auth");
      refreshCurrentPage();
      await syncFlowiseWidget().catch(() => {});
      return;
    case "toggle-favorite":
      toggleFavorite(target.dataset.type, target.dataset.id);
      scheduleAutoSync();
      return;
    case "open-global-result":
      openGlobalResult(target.dataset.type, target.dataset.id);
      return;
    case "add-exo-session": {
      if ((state.customWorkoutLibrary || []).length > 1) {
        state.customWorkoutPendingExerciseId = target.dataset.id || "";
        await navigateToPage("my-session");
        showToast("Choisis la séance cible");
        return;
      }
      const targetSessionId = state.activeCustomWorkoutId || state.customWorkoutDraft?.id;
      const draft = appendExerciseToCustomWorkout(target.dataset.id, targetSessionId);
      if (!draft) return;
      await navigateToPage("my-session");
      showToast("Exercice ajouté à Ma séance");
      return;
    }
    case "add-exo-active-session": {
      const targetSessionId = state.activeCustomWorkoutId || state.customWorkoutDraft?.id;
      const draft = appendExerciseToCustomWorkout(target.dataset.id, targetSessionId);
      if (!draft) return;
      showToast("Exercice ajouté à la séance active");
      refreshCurrentPage();
      return;
    }
    case "ai-around-exo": {
      const exercise = EXO_BY_ID.get(target.dataset.id);
      if (!exercise) return;
      state.aiDraft = { ...prefillAIFromExercise(exercise), seedExerciseIds: [exercise.id] };
      goToPage("ia");
      await handleGeneratePlan();
      return;
    }
    case "show-similar-exos":
      focusExerciseCatalog(target.dataset.id, { withSimilar: true });
      return;
    case "open-exo-focus":
      focusExerciseCatalog(target.dataset.id, { withSimilar: true });
      return;
    case "open-help-search":
      state.exoFilter = {
        search: target.dataset.search || "",
        mode: target.dataset.mode || "all",
        muscle: "all",
        similarTo: ""
      };
      goToPage("exos");
      return;
    case "set-noushi-place":
      state.noushiFilter.place = target.dataset.place || "mixte";
      refreshCurrentPage();
      return;
    case "admin-refresh":
      await handleAdminRefresh();
      showToast("Dashboard admin actualisé");
      return;
    case "admin-open-user":
      await openAdminUserDetail(target.dataset.id, target.dataset.tab || "photos");
      refreshCurrentPage();
      return;
    case "admin-close-user":
      closeAdminUserDetail();
      refreshCurrentPage();
      return;
    case "admin-detail-tab":
      setAdminUserDetailTab(target.dataset.tab || "photos");
      refreshCurrentPage();
      return;
    case "admin-filter-user":
      updateAdminFilter(
        "selectedProfileId",
        state.adminRuntime?.selectedProfileId === target.dataset.id ? "" : (target.dataset.id || "")
      );
      return;
    case "admin-clear-user-filter":
      updateAdminFilter("selectedProfileId", "");
      return;
    case "admin-delete-photo":
      if (!window.confirm("Supprimer cette photo de progression ?")) return;
      await deleteAdminProgressPhoto(target.dataset.id);
      showToast("Photo supprimée");
      refreshCurrentPage();
      return;
    case "admin-delete-user-photos":
      if (!window.confirm("Supprimer toutes les photos de cet utilisateur ?")) return;
      await deleteAdminUserPhotos(target.dataset.id);
      showToast("Toutes les photos ont été supprimées");
      refreshCurrentPage();
      return;
    case "admin-set-user-status": {
      const nextStatus = target.dataset.status || "active";
      const label = nextStatus === "pending"
        ? "mettre en attente"
        : nextStatus === "banned"
          ? "bannir"
          : nextStatus === "suspended"
            ? "suspendre"
            : "réactiver";
      if (!window.confirm(`Confirmer: ${label} cet utilisateur ?`)) return;
      await setAdminUserStatus(target.dataset.id, nextStatus);
      showToast(`Statut mis à jour: ${nextStatus}`);
      refreshCurrentPage();
      return;
    }
    case "admin-delete-account": {
      const reason = window.prompt("Raison de la suppression du compte", "");
      if (!reason) return;
      if (!window.confirm("Confirmer la suppression de ce compte et la purge de ses données dans l’app ?")) return;
      await deleteAdminUserAccount(target.dataset.id, reason);
      showToast("Compte supprimé");
      refreshCurrentPage();
      return;
    }
    case "start-noushi-challenge": {
      const plan = buildNoushiChallengePlan(target.dataset.id, target.dataset.place || state.noushiFilter.place);
      if (!plan) return;
      startPlan(plan);
      goToPage("workout");
      showToast("Défi NOUSHI lancé");
      return;
    }
    case "replay-session": {
      const entry = state.history.find((item) => item.id === target.dataset.id);
      if (!entry) return;
      startPlan(historyEntryToPlan(entry));
      goToPage("workout");
      showToast("Séance rechargée");
      return;
    }
    case "adapt-session": {
      const entry = state.history.find((item) => item.id === target.dataset.id);
      if (!entry) return;
      state.aiDraft = buildAdaptiveInputsFromHistory(entry, "adapt");
      goToPage("ia");
      await handleGeneratePlan();
      return;
    }
    case "duplicate-session": {
      const entry = state.history.find((item) => item.id === target.dataset.id);
      if (!entry) return;
      startPlan(buildAdjustedPlan(entry, target.dataset.mode));
      goToPage("workout");
      showToast(target.dataset.mode === "harder" ? "Version plus dure prête" : "Version plus courte prête");
      return;
    }
    case "apply-feedback":
      if (applyFeedback(target.dataset.id, target.dataset.feedback)) {
        scheduleAutoSync();
        showToast("Feedback enregistré");
        refreshCurrentPage();
      }
      return;
    case "workout-done":
      workoutDoneAction();
      refreshCurrentPage();
      return;
    case "workout-skip":
      workoutSkipAction();
      refreshCurrentPage();
      return;
    case "finish-workout-now":
      finishWorkout(true);
      scheduleAutoSync();
      showToast("Séance enregistrée");
      refreshCurrentPage();
      return;
    case "open-modify-workout": {
      const current = state.workout?.plan?.blocks?.[state.workout.exerciseIndex];
      if (!current) return;
      const raw = prompt("Modifier au format séries,reps,rest. Exemple: 4,10,75", `${current.sets},${current.reps},${current.restSec}`);
      if (!raw) return;
      const [sets, reps, restSec] = raw.split(",").map((item) => item.trim());
      const ok = workoutModifyAction({ sets, reps, restSec });
      showToast(ok ? "Bloc modifié" : "Format invalide");
      refreshCurrentPage();
      return;
    }
    case "run-nutrition-ai":
      runNutritionAI();
      return;
    case "reset-exo-filters":
      state.exoFilter = { search: "", mode: "all", muscle: "all", similarTo: "" };
      refreshCurrentPage();
      return;
    case "reset-nutrition-filters":
      state.nutritionFilter = { search: "", category: "all", goal: "all", tag: "all" };
      refreshCurrentPage();
      return;
    case "start-protocol": {
      const item = target.dataset.type === "noushi" ? NOUSHI_BY_ID.get(target.dataset.id) : RELAX_BY_ID.get(target.dataset.id);
      if (!item) return;
      createProtocolHistoryEntry(target.dataset.type, item);
      scheduleAutoSync();
      showToast(`${target.dataset.type.toUpperCase()} ajouté à l'historique`);
      goToPage("history");
      return;
    }
    case "open-onboarding":
      state.onboardingDraft = { ...defaultProfile, ...(state.profile || {}), ...(state.onboardingDraft || {}) };
      state.showOnboarding = true;
      state.onboardingStep = 0;
      refreshCurrentPage();
      return;
    case "select-onboarding-option":
      state.onboardingDraft = {
        ...defaultProfile,
        ...(state.onboardingDraft || {}),
        [target.dataset.key]: target.dataset.value
      };
      refreshCurrentPage();
      return;
    case "onboarding-back":
      state.onboardingStep = Math.max(0, state.onboardingStep - 1);
      refreshCurrentPage();
      return;
    case "onboarding-next":
      state.onboardingStep = Math.min(5, state.onboardingStep + 1);
      refreshCurrentPage();
      return;
    case "finish-onboarding":
      state.profile = updateProfile({ ...defaultProfile, ...(state.onboardingDraft || {}) });
      state.showOnboarding = false;
      state.onboardingStep = 0;
      scheduleAutoSync();
      showToast("Profil enregistré");
      refreshCurrentPage();
      return;
    default:
  }
}

function bindEvents() {
  document.getElementById("mainNav").addEventListener("click", async (event) => {
    const button = event.target.closest(".nav-btn");
    if (!button) return;
    await navigateToPage(button.dataset.page);
  });
  document.getElementById("quickNav").addEventListener("click", async (event) => {
    const button = event.target.closest(".quick-nav-btn");
    if (!button) return;
    await navigateToPage(button.dataset.page);
  });

  document.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    await routeAction(target.dataset.action, target);
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset?.onboardingField) {
      state.onboardingDraft = {
        ...defaultProfile,
        ...(state.onboardingDraft || {}),
        [target.dataset.onboardingField]: target.value
      };
      return;
    }
    if (target.dataset?.authField) {
      state.authDraft = {
        ...(state.authDraft || {}),
        [target.dataset.authField]: target.value
      };
      return;
    }
    if (target.id === "globalSearch") {
      state.globalSearch = target.value;
      refreshCurrentPage();
    }
    if (target.id === "iaTime") state.aiDraft.time = target.value;
    if (target.id === "iaPlace") state.aiDraft.place = target.value;
    if (target.id === "iaZone") state.aiDraft.zone = target.value;
    if (target.id === "iaEnergy") state.aiDraft.energy = target.value;
    if (target.id === "iaGoal") state.aiDraft.goal = target.value;
    if (target.id === "iaLevel") state.aiDraft.level = target.value;
    if (target.id === "exoSearch") {
      state.exoFilter.search = target.value;
      refreshCurrentPage();
    }
    if (target.id === "nutritionSearch") {
      state.nutritionFilter.search = target.value;
      refreshCurrentPage();
    }
    if (target.id === "customSessionSearch") {
      state.customWorkoutSearch = target.value;
      refreshCurrentPage();
    }
    if (target.dataset?.adminFilter === "filter") {
      updateAdminFilter("filter", target.value);
      return;
    }
    if (target.dataset?.customWorkoutField) {
      updateCustomWorkoutField(target.dataset.customWorkoutField, target.value);
      return;
    }
    if (target.dataset?.customBlockField && target.dataset?.customBlockId) {
      updateCustomWorkoutBlock(target.dataset.customBlockId, target.dataset.customBlockField, target.value);
      return;
    }
    if (target.dataset?.progressField) {
      updatePhotoProgressDraft(target.dataset.progressField, target.value);
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset?.onboardingField) {
      state.onboardingDraft = {
        ...defaultProfile,
        ...(state.onboardingDraft || {}),
        [target.dataset.onboardingField]: target.value
      };
      return;
    }
    if (target.dataset?.authField) {
      state.authDraft = {
        ...(state.authDraft || {}),
        [target.dataset.authField]: target.value
      };
      return;
    }
    if (target.id === "exoMode") {
      state.exoFilter.mode = target.value;
      refreshCurrentPage();
    }
    if (target.id === "iaTime") {
      state.aiDraft.time = target.value;
      return;
    }
    if (target.id === "iaPlace") {
      state.aiDraft.place = target.value;
      return;
    }
    if (target.id === "iaZone") {
      state.aiDraft.zone = target.value;
      return;
    }
    if (target.id === "iaEnergy") {
      state.aiDraft.energy = target.value;
      return;
    }
    if (target.id === "iaGoal") {
      state.aiDraft.goal = target.value;
      return;
    }
    if (target.id === "iaLevel") {
      state.aiDraft.level = target.value;
      return;
    }
    if (target.id === "exoMuscle") {
      state.exoFilter.muscle = target.value;
      refreshCurrentPage();
    }
    if (target.id === "nutritionCategory") {
      state.nutritionFilter.category = target.value;
      refreshCurrentPage();
    }
    if (target.id === "nutritionGoalFilter") {
      state.nutritionFilter.goal = target.value;
      refreshCurrentPage();
    }
    if (target.id === "nutritionTagFilter") {
      state.nutritionFilter.tag = target.value;
      refreshCurrentPage();
    }
    if (target.dataset?.adminFilter === "statusFilter") {
      updateAdminFilter("statusFilter", target.value);
      return;
    }
    if (target.dataset?.customWorkoutField) {
      updateCustomWorkoutField(target.dataset.customWorkoutField, target.value);
      if (target.dataset.customWorkoutField === "place") {
        refreshCurrentPage();
      }
      return;
    }
    if (target.dataset?.customBlockField && target.dataset?.customBlockId) {
      updateCustomWorkoutBlock(target.dataset.customBlockId, target.dataset.customBlockField, target.value);
      if (target.dataset.customBlockField === "exerciseId") {
        refreshCurrentPage();
      }
      return;
    }
    if (target.dataset?.progressField) {
      updatePhotoProgressDraft(target.dataset.progressField, target.value);
      return;
    }
    if (target.id === "profilePhotoInput" && target instanceof HTMLInputElement && target.files?.length) {
      buildProfilePhotoDataUrl(target.files[0])
        .then((nextPhoto) => {
          state.profilePhotoPreview = nextPhoto;
          refreshCurrentPage();
        })
        .catch(() => showToast("Photo invalide"));
      return;
    }
    if (target.id === "progressPhotoInput" && target instanceof HTMLInputElement && target.files?.length) {
      buildProfilePhotoDataUrl(target.files[0])
        .then((nextPhoto) => {
          state.photoProgressDraft = {
            ...(state.photoProgressDraft || resetPhotoProgressDraft()),
            photoDataUrl: nextPhoto
          };
          refreshCurrentPage();
        })
        .catch(() => showToast("Photo invalide"));
    }
  });
}

async function init() {
  syncViewportHeight();
  syncBuildLabel();
  updateClock();
  ensureLiteYouTubeEmbed().catch(() => {});
  setInterval(updateClock, 15000);
  refreshNotificationPermission();
  bindEvents();
  registerServiceWorker().catch(() => {});
  startNotificationPulse();
  if (typeof window !== "undefined") {
    let reloadedForController = false;
    navigator.serviceWorker?.addEventListener?.("controllerchange", () => {
      if (reloadedForController) return;
      reloadedForController = true;
      window.location.reload();
    });
    window.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("resize", syncViewportHeight);
    window.addEventListener("online", () => {
      if (state.currentUser && state.profile?.role !== "admin") {
        pullSyncSnapshot().catch(() => {});
      }
      if (state.profile?.role !== "admin") {
        syncFlowiseWidget().catch(() => {});
      }
      refreshCurrentPage();
    });
    window.addEventListener("offline", refreshCurrentPage);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        syncViewportHeight();
        refreshNotificationPermission();
        notifyTopRecommendation(false).catch(() => {});
        if (state.currentUser && state.profile?.role !== "admin") {
          pullSyncSnapshot().catch(() => {});
        }
        if (state.profile?.role !== "admin") {
          syncFlowiseWidget().catch(() => {});
        }
        refreshCurrentPage();
      }
    });
  }

  await initializeAuth();
  initRouter();
  await navigateToPage(state.currentUser ? (state.profile?.role === "admin" ? "admin" : "home") : "auth", { resetHistory: true });
  if (state.profile?.role === "admin") {
    await refreshAdminDashboard().catch((error) => {
      state.adminRuntime = {
        ...(state.adminRuntime || {}),
        error: readErrorMessage(error, "Impossible de charger le pôle de modération")
      };
    });
    refreshCurrentPage();
  }
  if (state.profile?.role !== "admin") {
    await syncFlowiseWidget().catch(() => {});
  }
  const diagnostics = getAppDiagnostics();
  if (state.profile?.role !== "admin" && diagnostics.storageOk && computeCoachRecommendations().length && state.notificationConfig.enabled) {
    notifyTopRecommendation(false).catch(() => {});
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
