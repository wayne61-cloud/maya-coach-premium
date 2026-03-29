import { buildAdaptiveInputsFromHistory, generateAIPlan, generatePlanWithCloudFallback, prefillAIFromExercise, testAIConfig, updateAIConfig } from "./ai.js";
import { EXO_BY_ID, NOUSHI_BY_ID, RECIPE_BY_ID, RELAX_BY_ID } from "./catalog.js";
import { getAppDiagnostics } from "./diagnostics.js";
import { notifyTopRecommendation, refreshNotificationPermission, registerServiceWorker, requestNotificationPermission, startNotificationPulse } from "./notifications.js";
import { buildDailyMealPlan, inferTrainingLoad, saveNutritionPlan } from "./nutrition.js";
import { goToPage, initRouter, refreshCurrentPage } from "./router.js";
import { computeCoachRecommendations } from "./recommendations.js";
import { pullSyncSnapshot, pushSyncSnapshot, requestMagicLink, scheduleAutoSync, updateSyncConfig } from "./sync.js";
import { defaultProfile, persistFavorites, state, updateProfile } from "./state.js";
import { APP_VERSION } from "./version.js";
import { applyFeedback, buildAdjustedPlan, buildMinimalPlanAroundExercise, createProtocolHistoryEntry, finishWorkout, historyEntryToPlan, startPlan, workoutDoneAction, workoutModifyAction, workoutSkipAction } from "./workout.js";

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
    place: document.getElementById("iaPlace")?.value || state.profile?.place || "maison",
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

function getAIConfigFromDom() {
  return {
    mode: document.getElementById("iaProviderMode")?.value || state.aiConfig.mode,
    model: document.getElementById("iaModel")?.value || state.aiConfig.model,
    proxyEndpoint: document.getElementById("iaProxyEndpoint")?.value || state.aiConfig.proxyEndpoint,
    apiKey: document.getElementById("iaApiKey")?.value || state.aiConfig.apiKey,
    webSearch: (document.getElementById("iaWebSearch")?.value || "off") === "on"
  };
}

function getProfileFromDom() {
  return {
    ...(state.profile || defaultProfile),
    name: document.getElementById("profileName")?.value || state.profile?.name || "",
    age: document.getElementById("profileAge")?.value || state.profile?.age || "",
    weightKg: document.getElementById("profileWeight")?.value || state.profile?.weightKg || "",
    goal: document.getElementById("profileGoal")?.value || state.profile?.goal || defaultProfile.goal,
    level: document.getElementById("profileLevel")?.value || state.profile?.level || defaultProfile.level,
    frequency: document.getElementById("profileFrequency")?.value || state.profile?.frequency || defaultProfile.frequency,
    place: document.getElementById("profilePlace")?.value || state.profile?.place || defaultProfile.place,
    sessionTime: document.getElementById("profileSessionTime")?.value || state.profile?.sessionTime || defaultProfile.sessionTime
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

function getSyncConfigFromDom() {
  return {
    endpoint: document.getElementById("syncEndpoint")?.value || state.syncConfig.endpoint,
    email: document.getElementById("syncEmail")?.value || state.syncConfig.email,
    token: document.getElementById("syncToken")?.value || state.syncConfig.token,
    autoSync: (document.getElementById("syncAuto")?.value || "off") === "on"
  };
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
      error: error instanceof Error ? error.message : String(error),
      lastCheckedAt: new Date().toISOString()
    };
    showToast(error instanceof Error ? error.message : "Erreur IA");
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
    place: state.profile?.place === "salle" ? "salle" : "maison",
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

function openGlobalResult(type, id) {
  if (type === "exo") {
    state.exoFilter.search = EXO_BY_ID.get(id)?.nom || "";
    state.exoFilter.similarTo = "";
    goToPage("exos");
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

function openSettingsTab(tab) {
  state.settingsTab = tab || "profile";
  goToPage("settings");
}

async function routeAction(action, target) {
  switch (action) {
    case "go-page":
      goToPage(target.dataset.page);
      return;
    case "go-settings-tab":
      openSettingsTab(target.dataset.tab);
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
    case "clear-nutrition-search":
      state.nutritionFilter.search = "";
      refreshCurrentPage();
      return;
    case "start-generated-plan":
      runGeneratedPlan();
      return;
    case "save-ai-config":
      updateAIConfig(getAIConfigFromDom());
      scheduleAutoSync();
      showToast("Config IA sauvegardée");
      refreshCurrentPage();
      return;
    case "test-ai-config":
      updateAIConfig(getAIConfigFromDom());
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
    case "save-sync-config":
      updateSyncConfig(getSyncConfigFromDom());
      showToast("Config sync sauvegardée");
      refreshCurrentPage();
      return;
    case "request-magic-link": {
      updateSyncConfig(getSyncConfigFromDom());
      try {
        const result = await requestMagicLink();
        showToast(result.previewLink ? "Magic link locale prête" : "Magic link générée");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Erreur auth");
      }
      refreshCurrentPage();
      return;
    }
    case "push-sync":
      updateSyncConfig(getSyncConfigFromDom());
      try {
        await pushSyncSnapshot();
        showToast("Historique synchronisé");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Erreur sync");
      }
      refreshCurrentPage();
      return;
    case "pull-sync":
      updateSyncConfig(getSyncConfigFromDom());
      try {
        await pullSyncSnapshot();
        showToast("Données récupérées");
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Erreur sync");
      }
      refreshCurrentPage();
      return;
    case "toggle-favorite":
      toggleFavorite(target.dataset.type, target.dataset.id);
      scheduleAutoSync();
      return;
    case "open-global-result":
      openGlobalResult(target.dataset.type, target.dataset.id);
      return;
    case "add-exo-session": {
      const plan = buildMinimalPlanAroundExercise(target.dataset.id);
      if (!plan) return;
      startPlan(plan);
      goToPage("workout");
      showToast("Séance focus lancée");
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
      state.exoFilter.similarTo = target.dataset.id;
      refreshCurrentPage();
      return;
    case "open-exo-focus":
      state.exoFilter.search = EXO_BY_ID.get(target.dataset.id)?.nom || "";
      state.exoFilter.similarTo = target.dataset.id;
      refreshCurrentPage();
      return;
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
  document.getElementById("btnEnterApp").addEventListener("click", () => {
    document.getElementById("launchScreen").classList.add("hidden");
  });

  document.getElementById("mainNav").addEventListener("click", (event) => {
    const button = event.target.closest(".nav-btn");
    if (!button) return;
    goToPage(button.dataset.page);
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
    if (target.id === "globalSearch") {
      state.globalSearch = target.value;
      refreshCurrentPage();
    }
    if (target.id === "exoSearch") {
      state.exoFilter.search = target.value;
      refreshCurrentPage();
    }
    if (target.id === "nutritionSearch") {
      state.nutritionFilter.search = target.value;
      refreshCurrentPage();
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
    if (target.id === "exoMode") {
      state.exoFilter.mode = target.value;
      refreshCurrentPage();
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
    if (target.id === "profilePhotoInput" && target instanceof HTMLInputElement && target.files?.length) {
      buildProfilePhotoDataUrl(target.files[0])
        .then((nextPhoto) => {
          state.profilePhotoPreview = nextPhoto;
          refreshCurrentPage();
        })
        .catch(() => showToast("Photo invalide"));
    }
  });
}

function init() {
  syncViewportHeight();
  syncBuildLabel();
  updateClock();
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
    window.addEventListener("online", refreshCurrentPage);
    window.addEventListener("offline", refreshCurrentPage);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        syncViewportHeight();
        refreshNotificationPermission();
        notifyTopRecommendation(false).catch(() => {});
        refreshCurrentPage();
      }
    });
  }
  initRouter();
  const diagnostics = getAppDiagnostics();
  if (diagnostics.storageOk && computeCoachRecommendations().length && state.notificationConfig.enabled) {
    notifyTopRecommendation(false).catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
