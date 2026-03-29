import { getCycleHeadline } from "../ai.js";
import { getGlobalSearchResults } from "../catalog.js";
import { getTrainingAwareRecipeSuggestions } from "../nutrition.js";
import { computeCoachRecommendations, getWeightEvolution } from "../recommendations.js";
import { state } from "../state.js";
import { computeDashboardStats } from "../workout.js";
import { buildEmptyState, escapeHtml, formatShortDate } from "../utils.js";

function getAthleteInitials(profile) {
  return (profile?.name || "MC")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MC";
}

function renderActionAttributes(item) {
  if (!item?.action) return 'data-action="go-page" data-page="ia"';
  const attrs = [`data-action="${escapeHtml(item.action)}"`];
  if (item.actionPayload?.page) attrs.push(`data-page="${escapeHtml(item.actionPayload.page)}"`);
  if (item.actionPayload?.tab) attrs.push(`data-tab="${escapeHtml(item.actionPayload.tab)}"`);
  return attrs.join(" ");
}

function renderSearchResults(query, results) {
  if (query.trim().length < 2) {
    return '<div class="muted">Tape 2 lettres pour retrouver un exercice ou une recette.</div>';
  }

  const items = [
    ...results.exercises.slice(0, 3).map((exercise) => `
      <button class="result-row" data-action="open-global-result" data-type="exo" data-id="${escapeHtml(exercise.id)}">
        <span class="result-row-type">Exo</span>
        <span class="result-row-copy">
          <strong>${escapeHtml(exercise.nom)}</strong>
          <span>${escapeHtml(exercise.pattern)} • ${escapeHtml(exercise.muscle)}</span>
        </span>
      </button>
    `),
    ...results.recipes.slice(0, 3).map((recipe) => `
      <button class="result-row" data-action="open-global-result" data-type="recipe" data-id="${escapeHtml(recipe.id)}">
        <span class="result-row-type">Fuel</span>
        <span class="result-row-copy">
          <strong>${escapeHtml(recipe.nom)}</strong>
          <span>${escapeHtml(recipe.categorie)} • ${recipe.prot} g prot</span>
        </span>
      </button>
    `)
  ];

  return items.length
    ? `<div class="compact-results">${items.join("")}</div>`
    : buildEmptyState("Aucun résultat", "Essaie un autre mot-clé ou ouvre directement un pôle.", "", "");
}

function currentFocusLabel() {
  if (state.currentPlan?.title) return state.currentPlan.title;
  return "Séance du jour à générer";
}

export function renderHome(node) {
  const profile = state.profile || {};
  const stats = computeDashboardStats();
  const weightEvolution = getWeightEvolution();
  const search = state.globalSearch || "";
  const searchResults = getGlobalSearchResults(search);
  const topRecommendation = computeCoachRecommendations()[0] || null;
  const nutritionSuggestion = getTrainingAwareRecipeSuggestions(profile.goal || "maintenance")[0] || null;
  const latestTraining = state.history.find((entry) => entry.type === "training") || null;
  const latestEntryLabel = latestTraining ? formatShortDate(latestTraining.date) : "aucune séance";
  const sessionTarget = Math.max(2, parseInt(profile.frequency || "3", 10));
  const photoUrl = profile.photoDataUrl || "";
  const resultsCount = searchResults.exercises.length + searchResults.recipes.length;

  node.innerHTML = `
    <div class="section compact-shell">
      <div class="card module-home glow-gold compact-hero">
        <div class="compact-hero-head">
          <div>
            <div class="eyebrow">Accueil compact</div>
            <h2>${escapeHtml(currentFocusLabel())}</h2>
            <p class="muted">Vue iPhone plus dense, orientée séance du jour et suivi rapide.</p>
          </div>
          <button class="icon-btn" data-action="go-page" data-page="settings" title="Profil">⚙</button>
        </div>

        <div class="compact-identity">
          <div class="athlete-avatar compact-identity-avatar">
            ${photoUrl
              ? `<img class="athlete-avatar-image" src="${photoUrl}" alt="Photo de profil" />`
              : `<span class="athlete-avatar-fallback">${escapeHtml(getAthleteInitials(profile))}</span>`}
          </div>
          <div class="compact-identity-copy">
            <strong>${escapeHtml(profile.name || "Profil athlète")}</strong>
            <span>${escapeHtml(getCycleHeadline())}</span>
            <span>${escapeHtml(weightEvolution.currentWeightKg ? `${weightEvolution.currentWeightKg} kg • ${profile.place || "mixte"}` : "Nom, âge et poids à compléter")}</span>
          </div>
        </div>

        <div class="mini-kpi-row">
          <div class="mini-kpi-card accent-gold">
            <span class="mini-kpi-label">Streak</span>
            <strong class="mini-kpi-value">${stats.streak} j</strong>
            <span class="mini-kpi-meta">continuité</span>
          </div>
          <div class="mini-kpi-card accent-blue">
            <span class="mini-kpi-label">Suivi</span>
            <strong class="mini-kpi-value">${stats.weekSessions}/${sessionTarget}</strong>
            <span class="mini-kpi-meta">séances semaine</span>
          </div>
          <div class="mini-kpi-card accent-green">
            <span class="mini-kpi-label">Fuel</span>
            <strong class="mini-kpi-value">${stats.nutritionRegularity.score}%</strong>
            <span class="mini-kpi-meta">régularité</span>
          </div>
        </div>

        <button class="btn btn-main compact-primary-btn" data-action="quick-session">Lancer la séance du jour</button>

        <div class="support-link-row">
          <button class="support-link" data-action="go-page" data-page="ia">Préparer avec Coach</button>
          <button class="support-link" data-action="go-page" data-page="history">Ouvrir mon suivi</button>
        </div>
      </div>

      <div class="compact-module-grid">
        <div class="card module-stats row-card">
          <div class="row-card-head">
            <div>
              <div class="eyebrow">Priorité coach</div>
              <div class="row-card-title">${escapeHtml(topRecommendation?.title || "Rythme stable")}</div>
            </div>
            <span class="pill pill-calm">${escapeHtml(latestEntryLabel)}</span>
          </div>
          <p class="row-card-copy">${escapeHtml(topRecommendation?.body || "Tu peux repartir sur une séance simple ou consulter ton suivi pour voir la tendance.")}</p>
          <button class="row-action" ${renderActionAttributes(topRecommendation)}>${escapeHtml(topRecommendation?.actionLabel || "Ouvrir le coach")}</button>
        </div>

        <div class="card module-nutrition row-card">
          <div class="row-card-head">
            <div>
              <div class="eyebrow">Nutrition</div>
              <div class="row-card-title">${escapeHtml(nutritionSuggestion?.nom || "Plan jour intelligent")}</div>
            </div>
            <span class="pill pill-success">${escapeHtml(profile.goal || "muscle")}</span>
          </div>
          <p class="row-card-copy">
            ${nutritionSuggestion
              ? `${nutritionSuggestion.temps} min • ${nutritionSuggestion.prot} g prot • ${nutritionSuggestion.tags.slice(0, 2).join(" • ")}`
              : "Génère un plan jour post-workout aligné avec ta charge du moment."}
          </p>
          <button class="row-action" data-action="go-page" data-page="nutrition">Voir le fuel du jour</button>
        </div>
      </div>

      <div class="card module-stats compact-search-card">
        <div class="row-card-head">
          <div>
            <div class="eyebrow">Recherche</div>
            <div class="row-card-title">Trouver vite</div>
          </div>
          <span class="pill">${search.trim().length >= 2 ? `${resultsCount} résultat${resultsCount > 1 ? "s" : ""}` : "exos + recettes"}</span>
        </div>

        <div class="search-shell compact-search-shell">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input id="globalSearch" class="search-input" type="text" placeholder="traction, curry, hip thrust..." value="${escapeHtml(search)}" />
          <button class="search-clear ${search ? "visible" : ""}" data-action="clear-global-search">Effacer</button>
        </div>

        <div class="search-shortcuts compact-shortcuts">
          <button class="shortcut-chip" data-action="go-page" data-page="exos">Exercices</button>
          <button class="shortcut-chip" data-action="go-page" data-page="history">Suivi</button>
          <button class="shortcut-chip" data-action="go-page" data-page="nutrition">Nutrition</button>
          <button class="shortcut-chip" data-action="go-settings-tab" data-tab="profile">Profil</button>
        </div>

        ${renderSearchResults(search, searchResults)}
      </div>
    </div>
  `;
}
