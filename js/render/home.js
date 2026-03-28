import { getGlobalSearchResults } from "../catalog.js";
import { getCycleHeadline } from "../ai.js";
import { getTrainingAwareRecipeSuggestions } from "../nutrition.js";
import { computeCoachRecommendations, getWeightEvolution } from "../recommendations.js";
import { state } from "../state.js";
import { computeDashboardStats } from "../workout.js";
import { buildEmptyState, escapeHtml } from "../utils.js";

export function renderHome(node) {
  const stats = computeDashboardStats();
  const targetGoal = state.profile?.goal || "muscle";
  const nutritionSuggestions = getTrainingAwareRecipeSuggestions(targetGoal);
  const recommendations = computeCoachRecommendations();
  const weightEvolution = getWeightEvolution();
  const dashboardRecommendations = recommendations.filter((item) => !["profile-completion", "notifications", "cloud-ai", "sync"].includes(item.id));
  const topRecommendation = dashboardRecommendations[0] || null;
  const search = state.globalSearch || "";
  const searchResults = getGlobalSearchResults(search);
  const hasResults = searchResults.exercises.length || searchResults.recipes.length;

  const globalResultsHtml = search.trim().length < 2
    ? `<div class="muted">Tape au moins 2 lettres pour rechercher un exo, une recette ou un module.</div>`
    : `
        ${searchResults.exercises.map((exercise) => `
          <div class="result-item">
            <div><strong>Exo:</strong> ${escapeHtml(exercise.nom)} <span class="muted">(${escapeHtml(exercise.muscle)})</span></div>
            <button class="btn btn-outline" data-action="open-global-result" data-type="exo" data-id="${escapeHtml(exercise.id)}">Ouvrir</button>
          </div>
        `).join("")}
        ${searchResults.recipes.map((recipe) => `
          <div class="result-item">
            <div><strong>Recette:</strong> ${escapeHtml(recipe.nom)} <span class="muted">(${escapeHtml(recipe.categorie)})</span></div>
            <button class="btn btn-outline" data-action="open-global-result" data-type="recipe" data-id="${escapeHtml(recipe.id)}">Ouvrir</button>
          </div>
        `).join("")}
        ${hasResults ? "" : buildEmptyState("Aucun résultat", "Aucun élément ne correspond à ta recherche pour l'instant.", "", "")}
      `;

  node.innerHTML = `
    <div class="section">
      <div class="card hero-card glow-gold">
        <div class="hero-top">
          <div>
            <div class="hero-greeting">Salut champion</div>
            <div class="hero-title">Ta journée d'entraînement, nutrition et recovery dans une seule boucle.</div>
          </div>
          <button class="icon-btn ${state.profile ? "active" : ""}" data-action="go-page" data-page="settings" title="Paramètres">⚙</button>
        </div>

        <div class="brand-hero">
          <img src="./maya-coach-ui/web-opt/characters/maya-main.jpg" alt="Maya Coach" />
          <div>
            <img class="hero-wordmark" src="./maya-coach-ui/web-opt/logo/maya-logo.png" alt="Maya Coach logo" />
            <p class="muted">Architecture modulaire, catalogue enrichi, IA validée, historique premium et recommandations nutrition liées à la charge du jour.</p>
            <div class="hero-chips">
              <span class="pill">Coach IA</span>
              <span class="pill">Cycle 4 semaines</span>
              <span class="pill">Nutrition du jour</span>
            </div>
          </div>
        </div>

        <div class="plan-block" style="margin-top: 10px;">
          <div class="plan-title">${escapeHtml(getCycleHeadline())}</div>
          <div class="muted">Objectif profil: ${escapeHtml(targetGoal)} • Niveau ${escapeHtml(state.profile?.level || "2")} • ${escapeHtml(state.profile?.sessionTime || "35")} min ciblées</div>
        </div>

        <div class="actions-row two" style="margin-top: 10px;">
          <button class="btn btn-main" data-action="quick-session">1. Générer la séance du jour</button>
          <button class="btn btn-soft" data-action="go-page" data-page="workout">2. Voir le programme en cours</button>
          <button class="btn btn-soft" data-action="go-page" data-page="stats">3. Voir la progression</button>
          <button class="btn btn-soft" data-action="go-page" data-page="nutrition">4. Voir la nutrition du jour</button>
          <button class="btn btn-soft" data-action="go-page" data-page="history">5. Reprendre une ancienne séance</button>
        </div>
      </div>

      <div class="card search-module card-calm glow-blue">
        <div class="search-module-head">
          <div>
            <h3>Recherche rapide</h3>
            <p class="muted">Inspirée d’un module search Figma mobile: saisie centrale, compteur de résultats et raccourcis utiles.</p>
          </div>
          <span class="pill">${hasResults ? `${searchResults.exercises.length + searchResults.recipes.length} résultats` : "bibliothèque"}</span>
        </div>
        <div class="search-shell">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input id="globalSearch" class="search-input" type="text" placeholder="pull-up, bowl, relax..." value="${escapeHtml(search)}" />
          <button class="search-clear ${search ? "visible" : ""}" data-action="clear-global-search">Effacer</button>
        </div>
        <div class="search-shortcuts">
          <button class="shortcut-chip" data-action="go-page" data-page="exos">Exos</button>
          <button class="shortcut-chip" data-action="go-page" data-page="nutrition">Nutrition</button>
          <button class="shortcut-chip" data-action="go-page" data-page="history">Historique</button>
          <button class="shortcut-chip" data-action="go-settings-tab" data-tab="profile">Profil</button>
        </div>
        <div class="list">${globalResultsHtml}</div>
      </div>

      <div class="card card-success glow-green">
        <h3>Tableau du jour</h3>
        <div class="stats-grid">
          <div class="stat-box stat-box-green"><div class="stat-label">Streak</div><div class="stat-value">${stats.streak} j</div></div>
          <div class="stat-box stat-box-blue"><div class="stat-label">Séances semaine</div><div class="stat-value">${stats.weekSessions}</div></div>
          <div class="stat-box stat-box-coral"><div class="stat-label">Calories semaine</div><div class="stat-value">${Math.round(stats.weekCalories)}</div></div>
          <div class="stat-box stat-box-green"><div class="stat-label">Évolution</div><div class="stat-value">${escapeHtml(weightEvolution.currentWeightKg ? `${weightEvolution.currentWeightKg}kg` : "--")}</div></div>
        </div>
        ${topRecommendation ? `
          <div class="helper-note alert-note" style="margin-top: 10px;">
            <strong>${escapeHtml(topRecommendation.title)}</strong><br />
            ${escapeHtml(topRecommendation.body)}
          </div>
          <div class="actions-row two" style="margin-top: 10px;">
            ${topRecommendation.action ? `
              <button
                class="btn btn-soft"
                data-action="${escapeHtml(topRecommendation.action)}"
                ${topRecommendation.actionPayload?.page ? `data-page="${escapeHtml(topRecommendation.actionPayload.page)}"` : ""}
                ${topRecommendation.actionPayload?.tab ? `data-tab="${escapeHtml(topRecommendation.actionPayload.tab)}"` : ""}>
                ${escapeHtml(topRecommendation.actionLabel || "Ouvrir")}
              </button>
            ` : ""}
            <button class="btn btn-outline" data-action="go-settings-tab" data-tab="profile">Voir le profil</button>
          </div>
        ` : `
          <div class="helper-note calm-note" style="margin-top: 10px;">
            La home reste centrée sur l’action du jour. Les réglages avancés, la sync et les notifications vivent désormais dans le pôle Paramètres.
          </div>
        `}

        <div class="plan-block card-recovery" style="margin-top: 10px;">
          <div class="plan-title">Nutrition reliée à l'entraînement</div>
          <div class="coach-grid">
            <div><strong>Charge du moment:</strong> ${escapeHtml(state.currentPlan?.metadata?.fatigueLoad ? `${state.currentPlan.metadata.fatigueLoad}/100` : "auto selon ta dernière séance")}</div>
            <div><strong>Recettes alignées:</strong></div>
            ${nutritionSuggestions.map((recipe) => `<div>• ${escapeHtml(recipe.nom)} <span class="muted">(${recipe.categorie}, ${recipe.prot} g protéines)</span></div>`).join("")}
          </div>
          <div class="actions-row two" style="margin-top: 10px;">
            <button class="btn btn-main" data-action="go-page" data-page="nutrition">Construire la journée nutrition</button>
            <button class="btn btn-outline" data-action="go-page" data-page="ia">Passer par le coach IA</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
