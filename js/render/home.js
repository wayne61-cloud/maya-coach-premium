import { getGlobalSearchResults } from "../catalog.js";
import { getCycleHeadline } from "../ai.js";
import { getCloudModeLabel, getAppDiagnostics } from "../diagnostics.js";
import { getTrainingAwareRecipeSuggestions } from "../nutrition.js";
import { computeCoachRecommendations, getWeightEvolution } from "../recommendations.js";
import { state } from "../state.js";
import { computeDashboardStats } from "../workout.js";
import { buildEmptyState, escapeHtml, formatDateTime } from "../utils.js";

export function renderHome(node) {
  const stats = computeDashboardStats();
  const targetGoal = state.profile?.goal || "muscle";
  const nutritionSuggestions = getTrainingAwareRecipeSuggestions(targetGoal);
  const diagnostics = getAppDiagnostics();
  const recommendations = computeCoachRecommendations();
  const weightEvolution = getWeightEvolution();
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
      <div class="card hero-card">
        <div class="hero-top">
          <div>
            <div class="hero-greeting">Salut champion</div>
            <div class="hero-title">Ta journée d'entraînement, nutrition et recovery dans une seule boucle.</div>
          </div>
          <button class="icon-btn ${state.profile ? "active" : ""}" data-action="open-onboarding" title="Profil">⚙</button>
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

      <div class="card">
        <h3>Recherche globale</h3>
        <div class="field-group">
          <label class="field-label" for="globalSearch">Exos, recettes, modules</label>
          <input id="globalSearch" type="text" placeholder="pull-up, bowl, relax..." value="${escapeHtml(search)}" />
        </div>
        <div class="list">${globalResultsHtml}</div>
      </div>

      <div class="card">
        <h3>Progression premium</h3>
        <div class="stats-grid">
          <div class="stat-box"><div class="stat-label">Streak</div><div class="stat-value">${stats.streak} j</div></div>
          <div class="stat-box"><div class="stat-label">Séances semaine</div><div class="stat-value">${stats.weekSessions}</div></div>
          <div class="stat-box"><div class="stat-label">Calories semaine</div><div class="stat-value">${Math.round(stats.weekCalories)}</div></div>
          <div class="stat-box"><div class="stat-label">Record push</div><div class="stat-value">${stats.pushupRecord}</div></div>
        </div>
      </div>

      <div class="card">
        <h3>Profil athlète</h3>
        <div class="split-3">
          <div class="field-group">
            <label class="field-label" for="profileName">Nom</label>
            <input id="profileName" type="text" placeholder="Ton prénom" value="${escapeHtml(state.profile?.name || "")}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="profileAge">Âge</label>
            <input id="profileAge" type="number" min="10" max="99" placeholder="29" value="${escapeHtml(state.profile?.age || "")}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="profileWeight">Poids (kg)</label>
            <input id="profileWeight" type="number" min="35" max="220" step="0.1" placeholder="74" value="${escapeHtml(state.profile?.weightKg || "")}" />
          </div>
        </div>
        <div class="coach-grid">
          <div><strong>Objectif:</strong> ${escapeHtml(state.profile?.goal || "muscle")} • niveau ${escapeHtml(state.profile?.level || "2")} • ${escapeHtml(state.profile?.sessionTime || "35")} min</div>
          <div><strong>Cadence:</strong> ${escapeHtml(state.profile?.frequency || "3")} séances/semaine • lieu ${escapeHtml(state.profile?.place || "mixte")}</div>
          <div><strong>Évolution:</strong> ${escapeHtml(weightEvolution.label)}</div>
        </div>
        <div class="actions-row two" style="margin-top: 10px;">
          <button class="btn btn-main" data-action="save-profile">Enregistrer le profil</button>
          <button class="btn btn-outline" data-action="open-onboarding">Ajuster le plan de base</button>
        </div>
      </div>

      <div class="card">
        <h3>Recommandations du coach</h3>
        <div class="list">
          ${recommendations.length ? recommendations.map((item) => `
            <div class="exercise-card recommendation-card">
              <div class="exercise-title">${escapeHtml(item.title)}</div>
              <div class="muted">${escapeHtml(item.body)}</div>
              ${item.action ? `
                <div class="actions-row two">
                  <button
                    class="btn btn-soft"
                    data-action="${escapeHtml(item.action)}"
                    ${item.actionPayload?.page ? `data-page="${escapeHtml(item.actionPayload.page)}"` : ""}>
                    ${escapeHtml(item.actionLabel || "Ouvrir")}
                  </button>
                </div>
              ` : ""}
            </div>
          `).join("") : buildEmptyState("Rien d’urgent", "Le coach n’a pas d’alerte prioritaire. Tu peux poursuivre ta progression normalement.", "", "")}
        </div>
      </div>

      <div class="card">
        <h3>Nutrition reliée à l'entraînement</h3>
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

      <div class="card">
        <h3>Stats produit</h3>
        <div class="coach-grid">
          <div><strong>Training:</strong> ${stats.trainingSessions} séances</div>
          <div><strong>NOUSHI / Relax:</strong> ${(stats.sessionsByType.noushi || 0)} / ${(stats.sessionsByType.relax || 0)}</div>
          <div><strong>Minutes actives:</strong> ${Math.round(stats.activeMinutes)} min</div>
          <div><strong>Régularité nutrition:</strong> ${stats.nutritionRegularity.score}% sur 7 jours</div>
        </div>
      </div>

      <div class="card">
        <h3>Statut app, IA et sync</h3>
        <div class="coach-grid">
          <div><strong>Stockage local:</strong> ${diagnostics.storageOk ? "OK" : "indisponible"}</div>
          <div><strong>Internet:</strong> ${diagnostics.online ? "connecté" : "hors ligne"}</div>
          <div><strong>IA:</strong> ${escapeHtml(getCloudModeLabel())} • source ${escapeHtml(diagnostics.aiRuntime.source || "local")} • statut ${escapeHtml(diagnostics.aiRuntime.status || "idle")}</div>
          <div><strong>Recherche web IA:</strong> ${state.aiConfig.webSearch ? "active" : "inactive"}</div>
          <div><strong>Notifications:</strong> ${diagnostics.notificationSupported ? escapeHtml(diagnostics.notificationConfig.permission || "default") : "non supportées"}</div>
          <div><strong>Sync:</strong> ${diagnostics.syncConfigured ? "configurée" : "à brancher"}${diagnostics.syncRuntime.lastSyncAt ? ` • ${escapeHtml(formatDateTime(diagnostics.syncRuntime.lastSyncAt))}` : ""}</div>
        </div>
        <div class="actions-row two" style="margin-top: 10px;">
          <button class="btn btn-soft" data-action="request-notifications">Activer les notifications</button>
          <button class="btn btn-outline" data-action="go-page" data-page="ia">Configurer IA et sync</button>
        </div>
      </div>
    </div>
  `;
}
