import { getCloudModeLabel, getAppDiagnostics } from "./diagnostics.js";
import { getNutritionRegularity, inferTrainingLoad } from "./nutrition.js";
import { state } from "./state.js";
import { computeDashboardStats } from "./workout.js";

export function getWeightEvolution() {
  const snapshots = Array.isArray(state.profileSnapshots) ? state.profileSnapshots : [];
  const valid = snapshots.filter((item) => Number.isFinite(parseFloat(item.weightKg))).slice(0, 8);
  if (!valid.length) {
    return {
      currentWeightKg: parseFloat(state.profile?.weightKg) || null,
      deltaKg: 0,
      label: "Ajoute ton poids pour suivre ton évolution.",
      trend: "neutral"
    };
  }

  const latest = parseFloat(valid[0].weightKg);
  const oldest = parseFloat(valid[valid.length - 1].weightKg);
  const deltaKg = Math.round((latest - oldest) * 10) / 10;
  const trend = deltaKg > 0.2 ? "up" : deltaKg < -0.2 ? "down" : "stable";
  const trendLabel = trend === "up" ? `+${deltaKg} kg` : trend === "down" ? `${deltaKg} kg` : "stable";
  return {
    currentWeightKg: latest,
    deltaKg,
    trend,
    label: `${latest} kg actuellement • évolution ${trendLabel} sur ${valid.length} point${valid.length > 1 ? "s" : ""}.`
  };
}

export function computeCoachRecommendations() {
  const stats = computeDashboardStats();
  const diagnostics = getAppDiagnostics();
  const latestTraining = state.history.find((entry) => entry.type === "training");
  const nutritionRegularity = getNutritionRegularity(7);
  const recommendations = [];

  if (!state.profile?.name || !state.profile?.age || !state.profile?.weightKg) {
    recommendations.push({
      id: "profile-completion",
      priority: 100,
      title: "Complète ton profil athlète",
      body: "Nom, âge et poids améliorent la personnalisation de l’IA, la nutrition du jour et le suivi d’évolution.",
      action: "open-onboarding",
      actionLabel: "Compléter"
    });
  }

  if (stats.weekSessions === 0) {
    recommendations.push({
      id: "train-now",
      priority: 90,
      title: "Relance la semaine",
      body: "Aucune séance cette semaine. Lance une séance rapide pour remettre le cycle en mouvement.",
      action: "quick-session",
      actionLabel: "Lancer"
    });
  }

  if (latestTraining?.feedback === "dur") {
    recommendations.push({
      id: "recovery-focus",
      priority: 85,
      title: "Allège la prochaine charge",
      body: "Ton dernier feedback était dur. Un module Relax ou NOUSHI aidera la récup avant la prochaine surcharge.",
      action: "go-page",
      actionLabel: "Ouvrir Relax",
      actionPayload: { page: "relax" }
    });
  }

  if (latestTraining && inferTrainingLoad(latestTraining) === "high") {
    recommendations.push({
      id: "post-workout-meal",
      priority: 80,
      title: "Renforce ton post-workout",
      body: "Ta dernière séance était dense. Génère une journée nutrition riche en protéines et glucides de récupération.",
      action: "go-page",
      actionLabel: "Nutrition",
      actionPayload: { page: "nutrition" }
    });
  }

  if (nutritionRegularity.score < 45) {
    recommendations.push({
      id: "nutrition-regularity",
      priority: 70,
      title: "Stabilise la nutrition",
      body: "La régularité nutrition est basse cette semaine. Un plan jour simple améliorera la récupération et l’énergie.",
      action: "go-page",
      actionLabel: "Plan jour",
      actionPayload: { page: "nutrition" }
    });
  }

  if (!diagnostics.notificationConfig.enabled || diagnostics.notificationConfig.permission !== "granted") {
    recommendations.push({
      id: "notifications",
      priority: 60,
      title: "Active les notifications coach",
      body: "Tu recevras des rappels locaux et des recommandations utiles quand une séance ou une récupération est pertinente.",
      action: "request-notifications",
      actionLabel: "Activer"
    });
  }

  if (!diagnostics.cloudConfigured || diagnostics.aiRuntime.source === "local-fallback") {
    recommendations.push({
      id: "cloud-ai",
      priority: 55,
      title: "Renforce le coach cloud",
      body: `Le mode actuel est ${getCloudModeLabel().toLowerCase()}. Configure le cloud pour activer la génération web-connectée et les tests live.`,
      action: "go-page",
      actionLabel: "Configurer",
      actionPayload: { page: "ia" }
    });
  }

  if (!diagnostics.syncConfigured) {
    recommendations.push({
      id: "sync",
      priority: 50,
      title: "Prépare la sync multi-appareils",
      body: "La sync n’est pas encore branchée. Ajoute ton endpoint et ta magic link pour retrouver ton historique partout.",
      action: "go-page",
      actionLabel: "Brancher",
      actionPayload: { page: "ia" }
    });
  }

  return recommendations
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 5);
}

export function getTopRecommendation() {
  return computeCoachRecommendations()[0] || null;
}
