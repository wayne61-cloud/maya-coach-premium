import { getTrainingAwareRecipeSuggestions, buildDailyMealPlan } from "./nutrition.js";
import { computeCoachRecommendations, getWeightEvolution } from "./recommendations.js";
import { defaultProfile, state } from "./state.js";
import { computeDashboardStats } from "./workout.js";
import { clamp, formatShortDate, sameWeek } from "./utils.js";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getTrainingEntries() {
  return state.history.filter((entry) => entry.type === "training");
}

export function getRecoveryEntries() {
  return state.history.filter((entry) => entry.type === "relax" || entry.type === "noushi");
}

export function getLatestTrainingEntry() {
  return getTrainingEntries()[0] || null;
}

export function getLatestRecoveryEntry() {
  return getRecoveryEntries()[0] || null;
}

export function getWeeklySummary(stats = computeDashboardStats()) {
  const entries = state.history.filter((entry) => sameWeek(entry.date, new Date()));
  const trainingEntries = entries.filter((entry) => entry.type === "training");
  const recoveryEntries = entries.filter((entry) => entry.type === "relax" || entry.type === "noushi");
  return {
    entries,
    trainingEntries,
    recoveryEntries,
    sessions: entries.length,
    trainingSessions: trainingEntries.length,
    recoverySessions: recoveryEntries.length,
    minutes: Math.round(entries.reduce((total, entry) => total + (entry.durationRealMin || entry.durationMin || 0), 0)),
    calories: Math.round(entries.reduce((total, entry) => total + (entry.caloriesEstimate || 0), 0)),
    volume: Math.round(trainingEntries.reduce((total, entry) => total + (entry.volume || 0), 0)),
    nutritionScore: stats.nutritionRegularity.score || 0
  };
}

export function buildBadgeCollection(stats = computeDashboardStats()) {
  const recoveryCount = (stats.sessionsByType.noushi || 0) + (stats.sessionsByType.relax || 0);
  const activeWeeks = stats.weekSeries.filter((week) => week.count > 0).length;
  const noushiCompleted = state.history.some((entry) => entry.type === "training" && entry.metadata?.noushiMode && entry.difficulty === "tenue");

  return [
    {
      id: "first-session",
      icon: "badge",
      title: "Premier move",
      detail: "Débloqué après la première séance enregistrée.",
      unlocked: stats.totalSessions >= 1
    },
    {
      id: "ten-sessions",
      icon: "trend",
      title: "Rythme installé",
      detail: "10 séances ou plus dans l’historique.",
      unlocked: stats.totalSessions >= 10
    },
    {
      id: "streak-7",
      icon: "fire",
      title: "Streak 7 jours",
      detail: "7 jours consécutifs avec activité comptée.",
      unlocked: stats.streak >= 7
    },
    {
      id: "nutrition",
      icon: "bowl",
      title: "Fuel stable",
      detail: "Régularité nutrition à 60% ou plus.",
      unlocked: stats.nutritionRegularity.score >= 60
    },
    {
      id: "recovery",
      icon: "moon",
      title: "Recovery flow",
      detail: "3 modules NOUSHI / Relax ou plus.",
      unlocked: recoveryCount >= 3
    },
    {
      id: "consistency",
      icon: "calendar",
      title: "Semaines actives",
      detail: "3 semaines actives ou plus sur les 6 dernières.",
      unlocked: activeWeeks >= 3
    },
    {
      id: "noushi-complete",
      icon: "fire",
      title: "NOUSHI survivant",
      detail: "Débloqué après une séance NOUSHI terminée sans abandon.",
      unlocked: noushiCompleted
    }
  ];
}

export function buildProgressPoints(entries = getTrainingEntries()) {
  return entries
    .slice(0, 8)
    .reverse()
    .map((entry) => ({
      label: formatShortDate(entry.date),
      value: Math.max(entry.volume || 0, (entry.completedSets || 0) * 8, (entry.durationRealMin || entry.durationMin || 0) * 3),
      entry
    }));
}

export function getProfileCompletion(profile = state.profile || defaultProfile) {
  const checkpoints = [
    profile.name,
    profile.age,
    profile.weightKg,
    profile.goal,
    profile.level,
    profile.frequency,
    profile.foodPreference,
    profile.preferredSplit
  ];
  const completed = checkpoints.filter((value) => String(value || "").trim()).length;
  return Math.round((completed / checkpoints.length) * 100);
}

export function getNutritionSnapshot(profile = state.profile || defaultProfile) {
  const goal = state.nutritionProfile?.goal || profile.goal || "maintenance";
  const weightKg = toNumber(state.nutritionProfile?.weightKg || profile.weightKg || 72, 72);
  const activity = state.nutritionProfile?.activity || "medium";
  const trainingLoad = state.nutritionProfile?.trainingLoad || state.currentPlan?.metadata?.trainingLoad || "medium";
  const totals = state.nutritionProfile || null;
  const dayPlan = buildDailyMealPlan({
    goal,
    weightKg,
    activity,
    trainingLoad,
    mealOverrides: state.nutritionProfile?.mealOverrides || {},
    extraMealIds: state.nutritionProfile?.extraMealIds || []
  });

  return {
    goal,
    weightKg,
    activity,
    trainingLoad,
    totals: totals || dayPlan.totals,
    dayPlan
  };
}

function buildFeedItems(stats, weightEvolution, recommendations) {
  const latestTraining = getLatestTrainingEntry();
  const latestNutrition = state.nutritionHistory[0];
  const latestRecovery = getLatestRecoveryEntry();
  const feed = [];

  if (latestTraining) {
    feed.push({
      icon: "trend",
      title: latestTraining.title,
      body: `Dernière séance • ${formatShortDate(latestTraining.date)} • ${latestTraining.volume || 0} volume`
    });
  }

  if (latestNutrition) {
    feed.push({
      icon: "bowl",
      title: `${latestNutrition.calories} kcal planifiées`,
      body: `Objectif ${latestNutrition.goal} • charge ${latestNutrition.trainingLoad}`
    });
  }

  if (latestRecovery) {
    feed.push({
      icon: "moon",
      title: latestRecovery.title,
      body: `Recovery • ${formatShortDate(latestRecovery.date)} • ${latestRecovery.durationMin || 0} min`
    });
  }

  if (weightEvolution.currentWeightKg) {
    feed.push({
      icon: "scale",
      title: `${weightEvolution.currentWeightKg} kg`,
      body: weightEvolution.label
    });
  }

  if (recommendations[0]) {
    feed.push({
      icon: "spark",
      title: recommendations[0].title,
      body: recommendations[0].body
    });
  }

  if (!feed.length) {
    feed.push({
      icon: "calendar",
      title: "Démarre ta semaine",
      body: `${stats.weekSessions}/${Math.max(2, parseInt(state.profile?.frequency || "3", 10))} séances visées`
    });
  }

  return feed.slice(0, 5);
}

function getRecoveryScore(stats, weeklySummary) {
  let score = 58;
  const latestTraining = getLatestTrainingEntry();
  const latestRecovery = getLatestRecoveryEntry();

  if (latestTraining?.feedback === "dur") score -= 12;
  if (latestTraining?.feedback === "facile") score += 6;
  if (weeklySummary.recoverySessions > 0) score += 8;
  if ((stats.nutritionRegularity.score || 0) >= 55) score += 10;
  if (latestRecovery && Date.now() - new Date(latestRecovery.date).getTime() < 3 * 24 * 60 * 60 * 1000) {
    score += 8;
  }

  return clamp(Math.round(score), 0, 100);
}

function buildFocusSession(profile, recommendations) {
  const currentPlan = state.currentPlan;
  const latestTraining = getLatestTrainingEntry();

  if (currentPlan) {
    return {
      title: currentPlan.title,
      body: recommendations[0]?.body || "Plan déjà prêt. Lance la séance dès que tu es disponible.",
      duration: currentPlan.estimatedDurationMin || toNumber(profile.sessionTime, 35),
      place: currentPlan.inputs?.place || profile.place || "mixte",
      goal: currentPlan.inputs?.goal || profile.goal || "muscle",
      zone: currentPlan.inputs?.zone || "full",
      quality: currentPlan.metadata?.coherenceScore || 0
    };
  }

  return {
    title: recommendations[0]?.title || "Séance du jour",
    body: recommendations[0]?.body || (latestTraining
      ? `Dernière séance ${formatShortDate(latestTraining.date)}. Relance le rythme sur ${profile.goal || "muscle"}.`
      : "Aucune séance en cours. Génère un plan ou lance une séance rapide."),
    duration: toNumber(profile.sessionTime, 35),
    place: profile.place || "mixte",
    goal: profile.goal || "muscle",
    zone: "full",
    quality: 0
  };
}

export function getRunWeeklySummary() {
  const now = new Date();
  const weekRuns = (state.runs || []).filter((run) => {
    if (!run.startedAt || run.status !== "completed") return false;
    return sameWeek(new Date(run.startedAt), now);
  });
  const totalDistanceM = weekRuns.reduce((sum, r) => sum + (r.distanceM || 0), 0);
  const totalDurationSec = weekRuns.reduce((sum, r) => sum + (r.durationSec || 0), 0);
  const totalCalories = weekRuns.reduce((sum, r) => sum + (r.caloriesEstimate || 0), 0);
  return {
    count: weekRuns.length,
    totalDistanceKm: Math.round(totalDistanceM / 100) / 10,
    totalDurationMin: Math.round(totalDurationSec / 60),
    totalCalories
  };
}

export function getSharedDashboardData() {
  const profile = state.profile || defaultProfile;
  const stats = computeDashboardStats();
  const recommendations = computeCoachRecommendations();
  const weightEvolution = getWeightEvolution();
  const weeklySummary = getWeeklySummary(stats);
  const trainingEntries = getTrainingEntries();
  const nutrition = getNutritionSnapshot(profile);
  const sessionTarget = Math.max(2, parseInt(profile.frequency || "3", 10));
  const minutesTarget = Math.max(90, sessionTarget * parseInt(profile.sessionTime || "35", 10));
  const calorieTarget = Math.max(480, sessionTarget * 220);
  const recoveryScore = getRecoveryScore(stats, weeklySummary);
  const focusSession = buildFocusSession(profile, recommendations);
  const progressPoints = buildProgressPoints(trainingEntries);

  return {
    profile,
    stats,
    recommendations,
    weightEvolution,
    weeklySummary,
    nutrition,
    sessionTarget,
    minutesTarget,
    calorieTarget,
    weekRatio: Math.min(100, Math.round((stats.weekSessions / sessionTarget) * 100)),
    minuteRatio: Math.min(100, Math.round((weeklySummary.minutes / minutesTarget) * 100)),
    fuelRatio: Math.min(100, stats.nutritionRegularity.score || 0),
    recoveryScore,
    focusSession,
    latestTraining: getLatestTrainingEntry(),
    latestRecovery: getLatestRecoveryEntry(),
    profileCompletion: getProfileCompletion(profile),
    relatedRecipes: getTrainingAwareRecipeSuggestions(profile.goal || "maintenance"),
    badges: buildBadgeCollection(stats),
    progressPoints,
    feedItems: buildFeedItems(stats, weightEvolution, recommendations),
    runWeeklySummary: getRunWeeklySummary()
  };
}
