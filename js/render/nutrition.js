import { getAllRecipeTags, hasValidVideoId, searchRecipes } from "../catalog.js";
import { getSharedDashboardData } from "../insights.js";
import { ensureLiteYouTubeEmbed } from "../lite-youtube.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, getYouTubeThumbnail, getYouTubeUrl } from "../utils.js";
import { icon, renderNumberTicker } from "../ui.js";

function renderRecipeVideo(recipe) {
  if (!recipe.videoId) {
    return `<div class="video-missing">Vidéo recette non renseignée.</div>`;
  }
  if (hasValidVideoId(recipe.videoId)) {
    return `<lite-youtube videoid="${escapeHtml(recipe.videoId)}" title="${escapeHtml(recipe.nom)}" playlabel="Lire la vidéo ${escapeHtml(recipe.nom)}" params="rel=0&modestbranding=2"></lite-youtube>`;
  }
  return `
    <a class="video-fallback" href="${getYouTubeUrl(recipe.videoId)}" target="_blank" rel="noreferrer">
      <img src="${getYouTubeThumbnail(recipe.videoId)}" alt="${escapeHtml(recipe.nom)}" />
    </a>
  `;
}

function renderNutritionDayPlan(shared) {
  const { nutrition } = shared;
  const totals = nutrition.totals;
  const meals = nutrition.dayPlan.meals;

  return `
    <div class="nutrition-day-plan">
      <div class="nutrition-day-plan-head">
        <div>
          <strong>Plan jour</strong>
          <span>${totals.calories} kcal • P ${totals.proteins} g • G ${totals.carbs} g • L ${totals.fats} g</span>
        </div>
        <span class="pill pill-success">${escapeHtml(nutrition.trainingLoad)}</span>
      </div>
      <div class="meal-pill-list">
        ${meals.map((meal) => `
          <div class="meal-pill">
            <strong>${escapeHtml(meal.category)}</strong>
            <span>${escapeHtml(meal.recipe.nom)}</span>
          </div>
        `).join("")}
      </div>
      <div class="helper-note calm-note">${nutrition.dayPlan.coachingNotes.map((note) => escapeHtml(note)).join(" • ")}</div>
    </div>
  `;
}

function renderFilterSheet() {
  if (!state.nutritionSheetOpen) return "";

  return `
    <div class="sheet-backdrop" data-action="close-sheet" data-sheet="nutrition"></div>
    <div class="bottom-sheet nutrition-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <div>
          <div class="eyebrow">Filtres nutrition</div>
          <h3>Affiner les recettes</h3>
        </div>
        <button class="ghost-link" data-action="close-sheet" data-sheet="nutrition">Fermer</button>
      </div>

      <div class="sheet-grid sheet-grid-stack">
        <div class="field-stack">
          <label class="field-label" for="nutritionCategory">Catégorie</label>
          <div class="field-shell surface-form">
            <select id="nutritionCategory">
              ${[
                ["all", "Toutes"],
                ["petit-dej", "Petit-déj"],
                ["dejeuner", "Déjeuner"],
                ["collation", "Collation"],
                ["diner", "Dîner"],
                ["rapide", "Rapide <15 min"]
              ].map(([value, label]) => `<option value="${value}" ${state.nutritionFilter.category === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="nutritionGoalFilter">Objectif</label>
          <div class="field-shell surface-form">
            <select id="nutritionGoalFilter">
              ${[
                ["all", "Tous"],
                ["seche", "Sèche"],
                ["masse", "Masse"],
                ["maintenance", "Maintenance"]
              ].map(([value, label]) => `<option value="${value}" ${state.nutritionFilter.goal === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="nutritionTagFilter">Tag</label>
          <div class="field-shell surface-form">
            <select id="nutritionTagFilter">
              <option value="all">Tous les tags</option>
              ${getAllRecipeTags().map((tag) => `<option value="${tag}" ${state.nutritionFilter.tag === tag ? "selected" : ""}>${escapeHtml(tag)}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>

      <div class="actions-row two">
        <button class="btn btn-main" data-action="close-sheet" data-sheet="nutrition">Appliquer</button>
        <button class="btn btn-outline" data-action="reset-nutrition-filters">Réinitialiser</button>
      </div>
    </div>
  `;
}

function renderRecipeCard(recipe) {
  return `
    <article class="recipe-compact-card module-nutrition">
      <div class="exercise-head">
        <div>
          <div class="exercise-title">${escapeHtml(recipe.nom)}</div>
          <div class="exercise-meta">
            <span class="pill">${escapeHtml(recipe.categorie)}</span>
            <span class="pill">${recipe.temps} min</span>
            <span class="pill">${escapeHtml(recipe.objectif)}</span>
          </div>
        </div>
        <button class="icon-btn ${state.favorites.has(`recipe:${recipe.id}`) ? "active" : ""}" data-action="toggle-favorite" data-type="recipe" data-id="${recipe.id}">⭐</button>
      </div>

      <div class="recipe-compact-meta">
        <span>${renderNumberTicker(recipe.prot, { suffix: "g" })} prot</span>
        <span>${renderNumberTicker(recipe.calories, { suffix: " kcal" })}</span>
        <span>${escapeHtml(recipe.moment)}</span>
      </div>

      <div class="recipe-tag-row">
        ${recipe.tags.slice(0, 3).map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
      </div>

      <div class="video-container">${renderRecipeVideo(recipe)}</div>
      <div class="video-links">
        <a class="pill pill-soft" href="${getYouTubeUrl(recipe.videoId)}" target="_blank" rel="noreferrer">Ouvrir sur YouTube</a>
        <span class="pill">${escapeHtml(recipe.difficulte)}</span>
      </div>

      <details class="compact-details">
        <summary>Préparation détaillée</summary>
        <div class="coach-grid recipe-detail-grid">
          <div>
            <strong>Ingrédients</strong><br>${recipe.ingredients.map((ingredient) => `• ${escapeHtml(ingredient)}`).join("<br>")}
          </div>
          <div>
            <strong>Étapes</strong><br>${recipe.steps.map((step, index) => `${index + 1}. ${escapeHtml(step)}`).join("<br><br>")}
          </div>
          <div>
            <strong>Quand la placer</strong><br>${escapeHtml(recipe.moment)}
          </div>
          <div>
            <strong>Substitutions</strong><br>${recipe.substitutions.map((item) => `• ${escapeHtml(item)}`).join("<br>")}
          </div>
        </div>
      </details>
    </article>
  `;
}

export function renderNutrition(node) {
  ensureLiteYouTubeEmbed().catch(() => {});
  const shared = getSharedDashboardData();
  const recipes = searchRecipes({
    query: state.nutritionFilter.search,
    category: state.nutritionFilter.category,
    goal: state.nutritionFilter.goal,
    tag: state.nutritionFilter.tag
  });

  const sessionAction = state.currentPlan
    ? { action: "start-generated-plan", label: "Lancer la séance du jour" }
    : { action: "go-page", label: "Préparer la séance du jour", page: "ia" };

  node.innerHTML = `
    <div class="section nutrition-screen">
      <div class="card module-nutrition nutrition-search-card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Nutrition</div>
            <h2>Recherche nutrition mobile</h2>
            <p class="muted">Recherche centrale, filtres en sheet et cartes recettes compactes reliées à la charge du jour.</p>
          </div>
          <span class="pill">${recipes.length} recettes</span>
        </div>

        <div class="nutrition-toolbar">
          <div class="command-shell nutrition-command-shell">
            <span class="command-icon">${icon("search", "", 16)}</span>
            <input id="nutritionSearch" class="command-input" type="text" placeholder="curry, bowl, wrap..." value="${escapeHtml(state.nutritionFilter.search)}" />
            <button class="command-clear ${state.nutritionFilter.search ? "visible" : ""}" data-action="clear-nutrition-search">Effacer</button>
          </div>
          <button class="control-chip nutrition-filter-trigger" data-action="open-sheet" data-sheet="nutrition">${icon("filter", "", 14)} Filtres</button>
        </div>

        <div class="quick-action-row nutrition-actions-row">
          <button class="quick-action" data-action="${sessionAction.action}" ${sessionAction.page ? `data-page="${sessionAction.page}"` : ""}>${icon("dumbbell", "", 14)} Séance du jour</button>
          <button class="quick-action" data-action="run-nutrition-ai">${icon("spark", "", 14)} Plan jour</button>
          <button class="quick-action" data-action="go-page" data-page="history">${icon("trend", "", 14)} Suivi</button>
        </div>
      </div>

      <div class="nutrition-macro-row">
        <div class="data-pill-card">
          <span class="data-pill-label">${icon("bowl", "", 14)} Calories</span>
          <strong class="data-pill-value">${renderNumberTicker(shared.nutrition.totals.calories, { suffix: "" })}</strong>
          <small>objectif journalier</small>
        </div>
        <div class="data-pill-card">
          <span class="data-pill-label">${icon("bolt", "", 14)} Protéines</span>
          <strong class="data-pill-value">${renderNumberTicker(shared.nutrition.totals.proteins, { suffix: "g" })}</strong>
          <small>base de récupération</small>
        </div>
        <div class="data-pill-card">
          <span class="data-pill-label">${icon("target", "", 14)} Charge</span>
          <strong class="data-pill-value">${escapeHtml(shared.nutrition.trainingLoad)}</strong>
          <small>${shared.weeklySummary.trainingSessions} séance(s) cette semaine</small>
        </div>
      </div>

      <div class="card module-nutrition nutrition-plan-card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Plan du jour</div>
            <h3>Nutrition alignée à ton entraînement</h3>
          </div>
          <span class="pill pill-success">${escapeHtml(shared.nutrition.goal)}</span>
        </div>

        <div class="settings-grid compact-grid">
          <div class="field-stack">
            <label class="field-label" for="nutriGoal">Objectif</label>
            <div class="field-shell surface-form">
              <select id="nutriGoal">
                ${["seche", "masse", "maintenance", "muscle"].map((goal) => `<option value="${goal}" ${shared.nutrition.goal === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="nutriWeight">Poids</label>
            <div class="field-shell surface-form">
              <input id="nutriWeight" type="number" min="35" max="180" value="${escapeHtml(shared.nutrition.weightKg)}" />
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="nutriActivity">Activité</label>
            <div class="field-shell surface-form">
              <select id="nutriActivity">
                ${["low", "medium", "high"].map((activity) => `<option value="${activity}" ${shared.nutrition.activity === activity ? "selected" : ""}>${escapeHtml(activity)}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        ${renderNutritionDayPlan(shared)}
      </div>

      <div class="card module-nutrition">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Recettes liées</div>
            <h3>Charge du jour</h3>
          </div>
          <button class="ghost-link" data-action="go-page" data-page="ia">Voir la séance</button>
        </div>
        <div class="recipe-carousel">
          ${shared.relatedRecipes.slice(0, 5).map((recipe) => `
            <button class="recipe-mini-card" data-action="open-global-result" data-type="recipe" data-id="${escapeHtml(recipe.id)}">
              <strong>${escapeHtml(recipe.nom)}</strong>
              <span>${recipe.calories} kcal • ${recipe.prot} g prot</span>
              <small>${escapeHtml(recipe.tags.slice(0, 2).join(" • "))}</small>
            </button>
          `).join("")}
        </div>
      </div>

      <div class="list recipe-stack">
        ${recipes.length
          ? recipes.map(renderRecipeCard).join("")
          : buildEmptyState("Aucune recette trouvée", "Élargis les filtres ou change d’objectif pour voir plus d’idées.", "Réinitialiser", "reset-nutrition-filters")}
      </div>

      ${renderFilterSheet()}
    </div>
  `;
}
