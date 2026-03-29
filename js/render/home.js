import { getGlobalSearchResults } from "../catalog.js";
import { getCycleHeadline } from "../ai.js";
import { getTrainingAwareRecipeSuggestions } from "../nutrition.js";
import { computeCoachRecommendations, getWeightEvolution } from "../recommendations.js";
import { state } from "../state.js";
import { computeDashboardStats } from "../workout.js";
import { buildEmptyState, escapeHtml, formatShortDate } from "../utils.js";

function getAthleteIdentity(profile) {
  return [
    profile?.goal || "",
    profile?.level === "1" ? "débutant" : profile?.level === "3" ? "avancé" : "intermédiaire",
    profile?.place || ""
  ].filter(Boolean).join(" • ");
}

function getAthleteInitials(profile) {
  return (profile?.name || "MC")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MC";
}

function renderSearchResults(search, searchResults) {
  const hasResults = searchResults.exercises.length || searchResults.recipes.length;
  if (search.trim().length < 2) {
    return `<div class="muted">Tape au moins 2 lettres pour retrouver un exercice, une recette ou un module.</div>`;
  }

  return `
    ${searchResults.exercises.map((exercise) => `
      <div class="result-item">
        <div><strong>Exo</strong> ${escapeHtml(exercise.nom)} <span class="muted">(${escapeHtml(exercise.pattern)} • ${escapeHtml(exercise.muscle)})</span></div>
        <button class="btn btn-outline" data-action="open-global-result" data-type="exo" data-id="${escapeHtml(exercise.id)}">Ouvrir</button>
      </div>
    `).join("")}
    ${searchResults.recipes.map((recipe) => `
      <div class="result-item">
        <div><strong>Recette</strong> ${escapeHtml(recipe.nom)} <span class="muted">(${escapeHtml(recipe.categorie)} • ${recipe.prot} g prot)</span></div>
        <button class="btn btn-outline" data-action="open-global-result" data-type="recipe" data-id="${escapeHtml(recipe.id)}">Ouvrir</button>
      </div>
    `).join("")}
    ${hasResults ? "" : buildEmptyState("Aucun résultat", "Aucun élément ne correspond à ta recherche pour l'instant.", "", "")}
  `;
}

function renderHubCard({ accentClass, kicker, title, copy, page, action = "go-page" }) {
  return `
    <button class="hub-card ${accentClass}" data-action="${escapeHtml(action)}" ${page ? `data-page="${escapeHtml(page)}"` : ""}>
      <span class="hub-card-kicker">${escapeHtml(kicker)}</span>
      <strong class="hub-card-title">${escapeHtml(title)}</strong>
      <span class="hub-card-copy">${escapeHtml(copy)}</span>
    </button>
  `;
}

export function renderHome(node) {
  const profile = state.profile || {};
  const stats = computeDashboardStats();
  const targetGoal = profile.goal || "muscle";
  const nutritionSuggestions = getTrainingAwareRecipeSuggestions(targetGoal).slice(0, 3);
  const recommendations = computeCoachRecommendations();
  const weightEvolution = getWeightEvolution();
  const dashboardRecommendations = recommendations.filter((item) => !["profile-completion", "notifications", "cloud-ai", "sync"].includes(item.id));
  const topRecommendation = dashboardRecommendations[0] || null;
  const search = state.globalSearch || "";
  const searchResults = getGlobalSearchResults(search);
  const hasResults = searchResults.exercises.length || searchResults.recipes.length;
  const photoUrl = profile.photoDataUrl || "";
  const latestEntry = [...state.history]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())[0] || null;
  const sessionTarget = Math.max(2, parseInt(profile.frequency || "3", 10));
  const completionRatio = Math.min(100, Math.round((stats.weekSessions / sessionTarget) * 100));
  const latestEntryLabel = latestEntry ? formatShortDate(latestEntry.date) : "aucune";

  node.innerHTML = `
    <div class="section">
      <div class="card hero-shell module-home glow-gold">
        <div class="hero-toolbar">
          <div>
            <div class="eyebrow">Centre de commandement</div>
            <div class="hero-title">Une app plus pilotée: entraînement, progression et profil athlète enfin structurés.</div>
          </div>
          <button class="icon-btn" data-action="go-page" data-page="settings" title="Profil et réglages">⚙</button>
        </div>

        <div class="hero-shell-grid">
          <div class="hero-copy-block">
            <p class="hero-support-copy">Bonjour ${escapeHtml(profile.name || "athlète")}. On s’appuie sur ton profil, ton cycle et ton historique pour construire la meilleure séance du jour.</p>
            <div class="hero-chips">
              <span class="pill">Cycle ${state.cycleState.cycleWeek}/${state.cycleState.cycleLength}</span>
              <span class="pill">${escapeHtml(profile.sessionTime || "35")} min</span>
              <span class="pill">${escapeHtml(profile.place || "mixte")}</span>
            </div>
          </div>

          <div class="athlete-panel">
            <div class="athlete-avatar">
              ${photoUrl
                ? `<img class="athlete-avatar-image" src="${photoUrl}" alt="Photo de profil" />`
                : `<span class="athlete-avatar-fallback">${escapeHtml(getAthleteInitials(profile))}</span>`}
            </div>
            <div class="athlete-panel-copy">
              <span class="athlete-kicker">Profil athlète</span>
              <strong>${escapeHtml(profile.name || "Complète ton profil")}</strong>
              <span>${escapeHtml(getAthleteIdentity(profile) || "objectif • niveau • terrain")}</span>
              <span>${escapeHtml(weightEvolution.currentWeightKg ? `${weightEvolution.currentWeightKg} kg suivis` : "poids à renseigner")}</span>
            </div>
          </div>
        </div>

        <div class="hero-focus-panel">
          <div class="hero-focus-copy">
            <span class="hero-focus-kicker">${escapeHtml(getCycleHeadline())}</span>
            <strong>${currentPlanTitle()}</strong>
            <span class="muted">Dernière activité ${escapeHtml(latestEntryLabel)} • cible ${sessionTarget} séances cette semaine</span>
          </div>
          <div class="hero-actions">
            <button class="btn btn-main hero-primary-btn" data-action="quick-session">Lancer ma séance du jour</button>
            <button class="btn btn-soft" data-action="go-page" data-page="ia">Brief coach IA</button>
            <button class="btn btn-outline" data-action="go-page" data-page="history">Voir ma progression</button>
          </div>
        </div>

        <div class="hero-metrics-grid">
          <div class="metric-tile metric-coach">
            <span class="metric-label">Streak</span>
            <strong>${stats.streak} j</strong>
            <span class="metric-meta">continuité</span>
          </div>
          <div class="metric-tile metric-stats">
            <span class="metric-label">Semaine</span>
            <strong>${stats.weekSessions}/${sessionTarget}</strong>
            <span class="metric-meta">${completionRatio}% du cap</span>
          </div>
          <div class="metric-tile metric-nutrition">
            <span class="metric-label">Fuel</span>
            <strong>${stats.nutritionRegularity.score}%</strong>
            <span class="metric-meta">régularité nutrition</span>
          </div>
        </div>
      </div>

      <div class="home-hub-grid">
        ${renderHubCard({
          accentClass: "hub-card-exos",
          kicker: "Bibliothèque",
          title: "Exercices",
          copy: "Tractions, face pull, carries et nouveaux patterns.",
          page: "exos"
        })}
        ${renderHubCard({
          accentClass: "hub-card-history",
          kicker: "Progression",
          title: "Pôle progrès",
          copy: "Courbe, badges, comparaison et suivi des séances.",
          page: "history"
        })}
        ${renderHubCard({
          accentClass: "hub-card-relax",
          kicker: "Recovery",
          title: "NOUSHI & Relax",
          copy: "Modules de récup qui comptent dans le streak.",
          page: "relax"
        })}
        ${renderHubCard({
          accentClass: "hub-card-settings",
          kicker: "Profil",
          title: "Paramètres",
          copy: "Photo, IA, sync, notifications et préférences.",
          page: "settings"
        })}
      </div>

      <div class="card search-module module-stats glow-blue">
        <div class="search-module-head">
          <div>
            <h3>Recherche rapide</h3>
            <p class="muted">Un module plus propre: saisie centrale, tags d’accès rapides et résultats réellement scannables sur mobile.</p>
          </div>
          <span class="pill">${hasResults ? `${searchResults.exercises.length + searchResults.recipes.length} résultats` : "bibliothèque"}</span>
        </div>
        <div class="search-shell">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input id="globalSearch" class="search-input" type="text" placeholder="traction, hip thrust, tacos..." value="${escapeHtml(search)}" />
          <button class="search-clear ${search ? "visible" : ""}" data-action="clear-global-search">Effacer</button>
        </div>
        <div class="search-shortcuts">
          <button class="shortcut-chip" data-action="go-page" data-page="exos">Bibliothèque exos</button>
          <button class="shortcut-chip" data-action="go-page" data-page="nutrition">Repas du jour</button>
          <button class="shortcut-chip" data-action="go-page" data-page="stats">Stats</button>
          <button class="shortcut-chip" data-action="go-settings-tab" data-tab="profile">Profil athlète</button>
        </div>
        <div class="list">${renderSearchResults(search, searchResults)}</div>
      </div>

      <div class="day-brief-grid">
        <div class="card module-coach glow-gold">
          <div class="brief-head">
            <div>
              <div class="eyebrow">Cap du jour</div>
              <h3>${escapeHtml(topRecommendation?.title || "Tu es sur un bon rythme")}</h3>
            </div>
            <span class="pill pill-alert">${escapeHtml(state.currentPlan?.metadata?.fatigueLoad ? `${state.currentPlan.metadata.fatigueLoad}/100` : "auto")}</span>
          </div>
          <p class="muted">${escapeHtml(topRecommendation?.body || "La home ne montre plus de réglages techniques. Elle reste concentrée sur l’action, la progression et le prochain meilleur choix.")}</p>
          <div class="actions-row two" style="margin-top: 10px;">
            ${topRecommendation?.action ? `
              <button
                class="btn btn-soft"
                data-action="${escapeHtml(topRecommendation.action)}"
                ${topRecommendation.actionPayload?.page ? `data-page="${escapeHtml(topRecommendation.actionPayload.page)}"` : ""}
                ${topRecommendation.actionPayload?.tab ? `data-tab="${escapeHtml(topRecommendation.actionPayload.tab)}"` : ""}>
                ${escapeHtml(topRecommendation.actionLabel || "Ouvrir")}
              </button>
            ` : `<button class="btn btn-soft" data-action="go-page" data-page="ia">Ouvrir le coach IA</button>`}
            <button class="btn btn-outline" data-action="go-page" data-page="history">Historique premium</button>
          </div>
        </div>

        <div class="card module-nutrition glow-green">
          <div class="brief-head">
            <div>
              <div class="eyebrow">Fuel intelligent</div>
              <h3>Nutrition reliée à la charge du jour</h3>
            </div>
            <span class="pill pill-success">${escapeHtml(profile.goal || "muscle")}</span>
          </div>
          <div class="coach-grid">
            <div><strong>Charge estimée:</strong> ${escapeHtml(state.currentPlan?.metadata?.fatigueLoad ? `${state.currentPlan.metadata.fatigueLoad}/100` : "auto selon tes dernières séances")}</div>
            ${nutritionSuggestions.map((recipe) => `<div>• ${escapeHtml(recipe.nom)} <span class="muted">(${recipe.categorie} • ${recipe.prot} g prot)</span></div>`).join("")}
          </div>
          <div class="actions-row two" style="margin-top: 10px;">
            <button class="btn btn-main" data-action="go-page" data-page="nutrition">Construire ma journée</button>
            <button class="btn btn-outline" data-action="go-page" data-page="stats">Voir mes stats</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function currentPlanTitle() {
  if (state.currentPlan?.title) return state.currentPlan.title;
  return "Ta séance du jour est prête à être générée ou relancée.";
}
