import { getGlobalSearchResults } from "../catalog.js";
import { getSharedDashboardData } from "../insights.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, normalizeKey } from "../utils.js";
import { icon, renderAnimatedFeed, renderCountup, renderProgressRing } from "../ui.js";

function athleteInitials(profile) {
  return (profile?.name || "MF")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MF";
}

function renderSearchResults(query, results, shared) {
  if (query.trim().length < 2) {
    return '<div class="command-empty">Trouver un exo, une recette, un badge ou ouvrir un pôle.</div>';
  }

  const normalized = normalizeKey(query);
  const utilityRows = [];

  if (["stats", "suivi", "progression", "badge", "streak"].some((word) => normalized.includes(word))) {
    utilityRows.push(`
      <button class="command-row" data-action="go-page" data-page="history">
        <span class="command-row-icon">${icon("trend", "", 14)}</span>
        <span class="command-row-copy">
          <strong>Ouvrir Suivi</strong>
          <span>${shared.stats.weekSessions} séances cette semaine • ${shared.stats.streak} jours de streak</span>
        </span>
        <span class="command-row-arrow">${icon("chevron", "", 14)}</span>
      </button>
    `);
  }

  if (["profil", "compte", "poids", normalizeKey(shared.profile.name)].filter(Boolean).some((word) => normalized.includes(word))) {
    utilityRows.push(`
      <button class="command-row" data-action="go-settings-tab" data-tab="identity">
        <span class="command-row-icon">${icon("profile", "", 14)}</span>
        <span class="command-row-copy">
          <strong>Ouvrir Profil</strong>
          <span>${escapeHtml(shared.profile.name || "Profil athlète")} • ${shared.profileCompletion}% complété</span>
        </span>
        <span class="command-row-arrow">${icon("chevron", "", 14)}</span>
      </button>
    `);
  }

  if (["ma seance", "seance perso", "personnalisee", "builder"].some((word) => normalized.includes(word))) {
    utilityRows.push(`
      <button class="command-row" data-action="go-page" data-page="my-session">
        <span class="command-row-icon">${icon("target", "", 14)}</span>
        <span class="command-row-copy">
          <strong>Ouvrir Ma séance</strong>
          <span>${shared.focusSession.duration} min • builder manuel + alertes Maya Coach</span>
        </span>
        <span class="command-row-arrow">${icon("chevron", "", 14)}</span>
      </button>
    `);
  }

  if (["photo", "progression photo", "avant apres", "frise"].some((word) => normalized.includes(word))) {
    utilityRows.push(`
      <button class="command-row" data-action="go-page" data-page="progress">
        <span class="command-row-icon">${icon("camera", "", 14)}</span>
        <span class="command-row-copy">
          <strong>Ouvrir Progression visuelle</strong>
          <span>Frise visuelle avec photo, date, poids, taille et contexte de prise</span>
        </span>
        <span class="command-row-arrow">${icon("chevron", "", 14)}</span>
      </button>
    `);
  }

  const exerciseRows = results.exercises.slice(0, 4).map((exercise) => `
    <button class="command-row" data-action="open-global-result" data-type="exo" data-id="${escapeHtml(exercise.id)}">
      <span class="command-row-icon">${icon("dumbbell", "", 14)}</span>
      <span class="command-row-copy">
        <strong>${escapeHtml(exercise.nom)}</strong>
        <span>${escapeHtml(exercise.pattern)} • ${escapeHtml(exercise.muscle)}</span>
      </span>
      <span class="command-row-arrow">${icon("chevron", "", 14)}</span>
    </button>
  `);

  const recipeRows = results.recipes.slice(0, 3).map((recipe) => `
    <button class="command-row" data-action="open-global-result" data-type="recipe" data-id="${escapeHtml(recipe.id)}">
      <span class="command-row-icon">${icon("bowl", "", 14)}</span>
      <span class="command-row-copy">
        <strong>${escapeHtml(recipe.nom)}</strong>
        <span>${recipe.prot} g prot • ${escapeHtml(recipe.categorie)}</span>
      </span>
      <span class="command-row-arrow">${icon("chevron", "", 14)}</span>
    </button>
  `);

  const rows = [...utilityRows, ...exerciseRows, ...recipeRows];
  return rows.length ? rows.join("") : buildEmptyState("Aucun résultat", "Essaie un autre mot-clé ou ouvre directement un pôle.", "", "");
}

export function renderHome(node) {
  const shared = getSharedDashboardData();
  const search = state.globalSearch || "";
  const searchResults = getGlobalSearchResults(search);
  const photoUrl = shared.profile.photoDataUrl || "";
  const highlightedRecipe = shared.relatedRecipes[0] || null;

  node.innerHTML = `
    <div class="section home-screen">
      <div class="home-topline">
        <div>
          <div class="eyebrow">Accueil Maya</div>
          <h2>Vue compacte du jour</h2>
        </div>
        <span class="pill">${shared.profile.goal || "muscle"} • ${shared.profile.sessionTime || "35"} min</span>
      </div>

      <div class="card module-home home-day-card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Séance du jour</div>
            <h3>${escapeHtml(state.currentPlan ? shared.focusSession.title : "Séance du jour")}</h3>
            <p class="muted">${escapeHtml(`${shared.focusSession.duration} min • ${shared.focusSession.place} • ${shared.focusSession.goal}`)}</p>
          </div>
          <div class="profile-chip">
            <div class="profile-chip-avatar">
              ${photoUrl ? `<img class="athlete-avatar-image" src="${photoUrl}" alt="Photo de profil" />` : `<span>${escapeHtml(athleteInitials(shared.profile))}</span>`}
            </div>
            <div class="profile-chip-copy">
              <strong>${escapeHtml(shared.profile.name || "Profil athlète")}</strong>
              <span>${shared.profileCompletion}% complété</span>
            </div>
          </div>
        </div>

        <div class="home-day-grid">
          <div class="home-day-copy">
            <div class="session-meta-strip">
              <span>${icon("target", "", 14)} ${escapeHtml(shared.focusSession.goal)}</span>
              <span>${icon("dumbbell", "", 14)} ${escapeHtml(shared.focusSession.place)}</span>
              <span>${icon("timer", "", 14)} ${escapeHtml(shared.focusSession.duration)} min</span>
            </div>
            <div class="home-day-highlight">
              <strong>${escapeHtml(shared.recommendations[0]?.title || "Priorité du jour")}</strong>
              <span>${escapeHtml(shared.recommendations[0]?.body || "Lance la séance, note ton feedback et laisse MAYA ajuster la suite.")}</span>
            </div>
            <div class="home-day-actions">
              <button class="btn btn-main" data-action="${state.currentPlan ? "start-generated-plan" : "quick-session"}">${state.currentPlan ? "Démarrer la séance prête" : "Séance rapide"}</button>
              <button class="btn btn-outline" data-action="go-page" data-page="ia">Ouvrir Coach</button>
            </div>
          </div>

          ${renderProgressRing({
            value: shared.stats.weekSessions,
            max: shared.sessionTarget,
            label: "Rythme semaine",
            sublabel: `${shared.weekRatio}% de l'objectif`,
            accent: "gold"
          })}
        </div>
      </div>

      <div class="mini-kpi-row home-kpi-row">
        <div class="data-pill-card">
          <span class="data-pill-label">${icon("fire", "", 14)} Streak</span>
          <strong class="data-pill-value">${renderCountup(shared.stats.streak, { suffix: "j" })}</strong>
          <small>${shared.stats.totalSessions} entrées suivies</small>
        </div>
        <div class="data-pill-card">
          <span class="data-pill-label">${icon("bolt", "", 14)} Charge</span>
          <strong class="data-pill-value">${renderCountup(shared.weekRatio, { suffix: "%" })}</strong>
          <small>${shared.weeklySummary.trainingSessions}/${shared.sessionTarget} séances</small>
        </div>
        <div class="data-pill-card">
          <span class="data-pill-label">${icon("moon", "", 14)} Recovery</span>
          <strong class="data-pill-value">${renderCountup(shared.recoveryScore, { suffix: "%" })}</strong>
          <small>${shared.fuelRatio}% de régularité nutrition</small>
        </div>
      </div>

      <div class="card command-surface">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Recherche rapide</div>
            <h3>Command center</h3>
          </div>
          <span class="pill">${search.trim().length >= 2 ? `${searchResults.exercises.length + searchResults.recipes.length} résultats` : "exos • recettes • suivi • profil"}</span>
        </div>

        <div class="command-shell">
          <span class="command-icon">${icon("search", "", 16)}</span>
          <input id="globalSearch" class="command-input" type="text" placeholder="Traction, progression, curry..." value="${escapeHtml(search)}" />
          <button class="command-clear ${search ? "visible" : ""}" data-action="clear-global-search">Effacer</button>
        </div>

        <div class="quick-action-row">
          <button class="quick-action" data-action="go-page" data-page="ia">${icon("coach", "", 14)} Coach</button>
          <button class="quick-action" data-action="go-page" data-page="my-session">${icon("target", "", 14)} Ma séance</button>
          <button class="quick-action" data-action="go-page" data-page="exos">${icon("dumbbell", "", 14)} Exercices</button>
          <button class="quick-action" data-action="go-page" data-page="history">${icon("trend", "", 14)} Suivi</button>
          <button class="quick-action" data-action="go-page" data-page="nutrition">${icon("bowl", "", 14)} Nutrition</button>
          <button class="quick-action" data-action="go-page" data-page="progress">${icon("camera", "", 14)} Progression visuelle</button>
        </div>

        <div class="command-results">${renderSearchResults(search, searchResults, shared)}</div>
      </div>

      <div class="home-secondary-grid">
        <div class="card module-stats compact-feed-card">
          <div class="native-block-head">
            <div>
              <div class="eyebrow">Feed vivant</div>
              <h3>Ce qui bouge</h3>
            </div>
            <button class="ghost-link" data-action="go-page" data-page="history">Tout voir</button>
          </div>
          ${renderAnimatedFeed(shared.feedItems)}
        </div>

        <div class="card module-nutrition compact-fuel-card">
          <div class="native-block-head">
            <div>
              <div class="eyebrow">Fuel du jour</div>
              <h3>Recettes alignées</h3>
            </div>
            <button class="ghost-link" data-action="go-page" data-page="nutrition">Explorer</button>
          </div>
          ${highlightedRecipe ? `
            <div class="recipe-highlight-card">
              <strong>${escapeHtml(highlightedRecipe.nom)}</strong>
              <span>${highlightedRecipe.calories} kcal • ${highlightedRecipe.prot} g prot • ${escapeHtml(highlightedRecipe.moment)}</span>
            </div>
          ` : ""}
          <div class="recipe-carousel">
            ${shared.relatedRecipes.slice(0, 4).map((recipe) => `
              <button class="recipe-mini-card" data-action="open-global-result" data-type="recipe" data-id="${escapeHtml(recipe.id)}">
                <strong>${escapeHtml(recipe.nom)}</strong>
                <span>${recipe.calories} kcal • ${recipe.prot} g prot</span>
                <small>${escapeHtml(recipe.tags.slice(0, 2).join(" • "))}</small>
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}
