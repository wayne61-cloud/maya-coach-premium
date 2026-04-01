import { getAllRecipeTags, hasValidVideoId, searchRecipes } from "../catalog.js";
import { getSharedDashboardData } from "../insights.js";
import { buildNutritionGroceryList } from "../nutrition.js";
import { ensureLiteYouTubeEmbed } from "../lite-youtube.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, getYouTubeThumbnail, getYouTubeUrl } from "../utils.js";
import { icon, renderNumberTicker } from "../ui.js";

const NUTRITION_VIEWS = [
  ["plan", "Plan du jour"],
  ["recipes", "Recettes"],
  ["courses", "Courses"]
];

function getLoadLabel(load) {
  return {
    low: "charge basse",
    medium: "charge moyenne",
    high: "charge haute"
  }[load] || `charge ${load}`;
}

function getCategoryLabel(category) {
  return {
    "petit-dej": "Petit-déj",
    dejeuner: "Déjeuner",
    collation: "Collation",
    diner: "Dîner"
  }[category] || category;
}

function buildRecipeTips(recipe) {
  const tips = [];
  if (recipe.tags.includes("pre-workout")) {
    tips.push("Pré-séance: garde-la 60 à 90 min avant un effort intense pour rester léger.");
  }
  if (recipe.tags.includes("post-workout")) {
    tips.push("Post-séance: cale-la dans les 2 heures après l'entraînement pour faciliter la récup.");
  }
  if (recipe.tags.includes("batch-cooking")) {
    tips.push("Batch cooking: double les portions et garde 2 à 3 jours au frais.");
  }
  if (!tips.length) {
    tips.push("Version simple à tenir: prépare les ingrédients la veille pour éviter les écarts.");
  }
  return tips;
}

function renderNutritionSummary(shared) {
  return `
    <div class="nutrition-summary-line">
      <strong>
        ${renderNumberTicker(shared.nutrition.totals.calories)} kcal
        <span>·</span>
        ${renderNumberTicker(shared.nutrition.totals.proteins, { suffix: " g" })} protéines
        <span>·</span>
        ${escapeHtml(getLoadLabel(shared.nutrition.trainingLoad))}
      </strong>
      <span>objectif : ${escapeHtml(shared.nutrition.goal)} · poids : ${escapeHtml(String(shared.nutrition.weightKg || "--"))} kg</span>
    </div>
  `;
}

function renderViewSwitch() {
  return `
    <div class="nutrition-view-switch" role="tablist" aria-label="Vues nutrition">
      ${NUTRITION_VIEWS.map(([value, label]) => `
        <button
          class="nutrition-view-btn ${state.nutritionView === value ? "active" : ""}"
          type="button"
          data-action="set-nutrition-view"
          data-view="${value}"
        >
          ${escapeHtml(label)}
        </button>
      `).join("")}
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
          <h3>Affiner le feed recettes</h3>
        </div>
        <button class="ghost-link" data-action="close-sheet" data-sheet="nutrition">Fermer</button>
      </div>

      <div class="sheet-grid sheet-grid-stack">
        <div class="field-stack">
          <label class="field-label" for="nutritionCategory">Moment</label>
          <div class="field-shell surface-form">
            <select id="nutritionCategory">
              ${[
                ["all", "Tous"],
                ["petit-dej", "Petit-déj"],
                ["dejeuner", "Déjeuner"],
                ["collation", "Collation"],
                ["diner", "Dîner"],
                ["rapide", "15 min max"]
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
                ["maintenance", "Maintenance"],
                ["muscle", "Muscle"]
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
        <button class="btn btn-main" data-action="close-sheet" data-sheet="nutrition">Valider</button>
        <button class="btn btn-outline" data-action="reset-nutrition-filters">Réinitialiser</button>
      </div>
    </div>
  `;
}

function renderNutritionHeader(shared, recipes) {
  return `
    <div class="nutrition-premium-shell">
      <div class="nutrition-header-ultra">
        <h2>Nutrition</h2>
        <div class="nutrition-header-meta">
          <span>${renderNumberTicker(shared.nutrition.totals.calories)} kcal</span>
          <span>·</span>
          <span>${renderNumberTicker(shared.nutrition.totals.proteins, { suffix: "g" })} prot</span>
          <span>·</span>
          <span>${recipes.length} recettes</span>
        </div>
      </div>

      <div class="nutrition-topbar">
        <div class="command-shell nutrition-command-shell premium-search-shell">
          <span class="command-icon">${icon("search", "", 16)}</span>
          <input id="nutritionSearch" class="command-input" type="text" placeholder="Pancakes, bowl, smoothie..." value="${escapeHtml(state.nutritionFilter.search)}" />
          <button class="command-clear ${state.nutritionFilter.search ? "visible" : ""}" data-action="clear-nutrition-search">Effacer</button>
        </div>
        <button class="control-chip nutrition-filter-trigger" data-action="open-sheet" data-sheet="nutrition">${icon("filter", "", 14)} Filtres</button>
      </div>

      ${renderViewSwitch()}
    </div>
  `;
}

function renderNutritionPlanner(shared) {
  return `
    <article class="nutrition-section-card nutrition-plan-builder">
      <div class="nutrition-planner-compact">
        <div class="nutrition-planner-fields">
          <div class="field-shell surface-form">
            <select id="nutriGoal">
              ${["muscle", "masse", "maintenance", "seche"].map((goal) => `<option value="${goal}" ${shared.nutrition.goal === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
            </select>
          </div>
          <div class="field-shell surface-form">
            <input id="nutriWeight" type="number" min="35" max="180" placeholder="kg" value="${escapeHtml(shared.nutrition.weightKg)}" />
          </div>
          <div class="field-shell surface-form">
            <select id="nutriActivity">
              ${[["low", "Basse"], ["medium", "Moyenne"], ["high", "Haute"]].map(([value, label]) => `<option value="${value}" ${shared.nutrition.activity === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
          <button class="btn btn-main" data-action="apply-nutrition-plan">Valider</button>
        </div>
        <span class="nutrition-planner-load">${escapeHtml(getLoadLabel(shared.nutrition.trainingLoad))}</span>
      </div>
    </article>
  `;
}

function renderNutritionTimeline(shared) {
  const meals = [
    ...(shared.nutrition.dayPlan.meals || []),
    ...((shared.nutrition.dayPlan.extraMeals || []).map((recipe, index) => ({
      category: `bonus-${index + 1}`,
      recipe,
      extra: true
    })))
  ];

  return `
    <article class="nutrition-section-card nutrition-timeline-card">
      <div class="nutrition-section-head">
        <div>
          <span class="eyebrow">Aujourd'hui</span>
          <h3>Plan minimal</h3>
        </div>
        <button class="ghost-link" data-action="set-nutrition-view" data-view="recipes">Voir les recettes</button>
      </div>

      <div class="nutrition-timeline">
        ${meals.map((meal) => `
          <button
            class="nutrition-timeline-item"
            type="button"
            data-action="open-recipe-detail"
            data-id="${escapeHtml(meal.recipe.id)}"
          >
            <span class="nutrition-timeline-dot"></span>
            <div class="nutrition-timeline-copy">
              <strong>${escapeHtml(meal.extra ? "Bonus" : getCategoryLabel(meal.category))} — ${escapeHtml(meal.recipe.nom)}</strong>
              <span>${meal.recipe.temps} min · ${meal.recipe.prot} g prot${meal.extra ? " · ajouté au plan" : ""}</span>
            </div>
            <span class="nutrition-timeline-arrow">${icon("chevron", "", 14)}</span>
          </button>
        `).join("")}
      </div>

      <div class="helper-note calm-note">${shared.nutrition.dayPlan.coachingNotes.map((note) => escapeHtml(note)).join(" • ")}</div>
    </article>
  `;
}

function renderRecipeCard(recipe) {
  return `
    <article class="nutrition-feed-card">
      <img
        class="nutrition-feed-thumb"
        src="${escapeHtml(getYouTubeThumbnail(recipe.videoId))}"
        alt="${escapeHtml(recipe.nom)}"
        loading="lazy"
        decoding="async"
      />
      <div class="nutrition-feed-copy">
        <div class="nutrition-feed-head">
          <div>
            <h3>${escapeHtml(recipe.nom)}</h3>
            <p>${recipe.temps} min · ${recipe.prot} g prot</p>
          </div>
          <button class="icon-btn ${state.favorites.has(`recipe:${recipe.id}`) ? "active" : ""}" data-action="toggle-favorite" data-type="recipe" data-id="${recipe.id}">⭐</button>
        </div>

        <div class="nutrition-feed-tags">
          ${recipe.tags.slice(0, 2).map((tag) => `<span class="pill pill-soft">${escapeHtml(tag)}</span>`).join("")}
        </div>

        <div class="nutrition-feed-actions">
          <span class="nutrition-feed-moment">${escapeHtml(recipe.moment)}</span>
          <button class="ghost-link" data-action="open-recipe-detail" data-id="${recipe.id}">Voir recette</button>
        </div>
      </div>
    </article>
  `;
}

function renderRecipeFeed(recipes) {
  const visibleRecipes = recipes.slice(0, state.nutritionFeedLimit || 8);

  return `
    <article class="nutrition-section-card nutrition-feed-shell">
      <div class="nutrition-section-head">
        <div>
          <span class="eyebrow">Feed recettes</span>
          <h3>Cartes courtes, détail au clic</h3>
        </div>
        <span class="pill">${recipes.length} résultats</span>
      </div>

      <div class="nutrition-feed-list">
        ${visibleRecipes.length
          ? visibleRecipes.map(renderRecipeCard).join("")
          : buildEmptyState("Aucune recette trouvée", "Élargis les filtres ou change d'objectif pour relancer le feed.", "Réinitialiser", "reset-nutrition-filters")}
      </div>

      ${recipes.length > visibleRecipes.length ? `
        <div class="nutrition-feed-more">
          <button class="btn btn-outline" data-action="load-more-nutrition-recipes">Charger plus</button>
        </div>
      ` : ""}
    </article>
  `;
}

function renderCoursesView(shared) {
  const groceryItems = buildNutritionGroceryList(shared.nutrition.dayPlan);

  return `
    <article class="nutrition-section-card nutrition-courses-card">
      <div class="nutrition-section-head">
        <div>
          <span class="eyebrow">Courses</span>
          <h3>Liste issue du plan du jour</h3>
        </div>
        <span class="pill">${groceryItems.length} items</span>
      </div>

      <div class="nutrition-courses-list">
        ${groceryItems.length
          ? groceryItems.map((item) => `
            <label class="nutrition-course-item">
              <input type="checkbox" />
              <span>${escapeHtml(item.ingredient)}</span>
              <small>${escapeHtml(item.recipeName)}</small>
            </label>
          `).join("")
          : buildEmptyState("Aucune course générée", "Valide d'abord un plan du jour pour créer ta liste.", "", "")}
      </div>
    </article>
  `;
}

function renderRecipeVideo(recipe) {
  if (!recipe.videoId) {
    return `<div class="video-missing">Vidéo recette non renseignée.</div>`;
  }
  if (state.nutritionVideoRecipeId !== recipe.id) {
    return `
      <button class="nutrition-video-preview" type="button" data-action="open-nutrition-video" data-id="${recipe.id}">
        <img src="${escapeHtml(getYouTubeThumbnail(recipe.videoId))}" alt="${escapeHtml(recipe.nom)}" loading="lazy" decoding="async" />
        <span>${icon("spark", "", 14)} Voir la vidéo</span>
      </button>
    `;
  }
  if (hasValidVideoId(recipe.videoId)) {
    return `<lite-youtube videoid="${escapeHtml(recipe.videoId)}" title="${escapeHtml(recipe.nom)}" playlabel="Lire la vidéo ${escapeHtml(recipe.nom)}" params="rel=0&modestbranding=2"></lite-youtube>`;
  }
  return `
    <a class="video-fallback" href="${getYouTubeUrl(recipe.videoId)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(getYouTubeThumbnail(recipe.videoId))}" alt="${escapeHtml(recipe.nom)}" />
    </a>
  `;
}

function renderRecipeDetailSheet() {
  const recipeId = state.nutritionDetailRecipeId;
  if (!recipeId) return "";

  const recipe = searchRecipes({ query: "" }).find((item) => item.id === recipeId);
  if (!recipe) return "";

  const tips = buildRecipeTips(recipe);

  return `
    <div class="sheet-backdrop" data-action="close-recipe-detail"></div>
    <div class="bottom-sheet nutrition-detail-sheet nutrition-detail-fullscreen">
      <div class="sheet-handle"></div>

      <div class="nutrition-detail-hero-wrap">
        <img class="nutrition-detail-hero" src="${escapeHtml(getYouTubeThumbnail(recipe.videoId))}" alt="${escapeHtml(recipe.nom)}" loading="lazy" decoding="async" />
        <div class="nutrition-detail-hero-overlay">
          <div class="eyebrow">${escapeHtml(getCategoryLabel(recipe.categorie))}</div>
          <h3 class="nutrition-detail-title">${escapeHtml(recipe.nom)}</h3>
        </div>
        <button class="nutrition-detail-close" data-action="close-recipe-detail">Fermer</button>
      </div>

      <div class="exercise-meta nutrition-detail-badges">
        <span class="pill">${recipe.temps} min</span>
        <span class="pill">${recipe.prot} g protéines</span>
        <span class="pill">${recipe.calories} kcal</span>
        <span class="pill">${escapeHtml(recipe.objectif)}</span>
      </div>

      <div class="nutrition-detail-video">
        ${renderRecipeVideo(recipe)}
      </div>

      <div class="nutrition-detail-grid">
        <div>
          <strong>Ingrédients</strong><br>
          ${(recipe.ingredients || []).map((ingredient) => `• ${escapeHtml(ingredient)}`).join("<br>")}
        </div>
        <div>
          <strong>Étapes</strong><br>
          ${(recipe.steps || []).map((step, index) => `${index + 1}. ${escapeHtml(step)}`).join("<br><br>")}
        </div>
        <div>
          <strong>Macros</strong><br>
          ${recipe.calories} kcal<br>
          ${recipe.prot} g protéines<br>
          ${recipe.carbs} g glucides<br>
          ${recipe.fats} g lipides
        </div>
        <div>
          <strong>Conseils pré / post training</strong><br>
          ${tips.map((tip) => `• ${escapeHtml(tip)}`).join("<br>")}
        </div>
      </div>

      <div class="actions-row two">
        <button class="btn btn-outline" data-action="add-recipe-to-plan" data-id="${recipe.id}">Ajouter au plan</button>
        <button class="btn btn-main" data-action="replace-plan-meal" data-id="${recipe.id}" data-category="${recipe.categorie}">Remplacer dans mon plan</button>
      </div>
    </div>
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

  const shouldShowTimeline = ["plan", "recipes"].includes(state.nutritionView);
  const shouldShowFeed = ["plan", "recipes"].includes(state.nutritionView);

  node.innerHTML = `
    <div class="section nutrition-screen nutrition-premium-screen">
      ${renderNutritionHeader(shared, recipes)}

      ${state.nutritionView === "courses" ? renderCoursesView(shared) : ""}
      ${state.nutritionView !== "courses" ? renderNutritionPlanner(shared) : ""}
      ${shouldShowTimeline ? renderNutritionTimeline(shared) : ""}
      ${shouldShowFeed ? renderRecipeFeed(recipes) : ""}

      ${renderFilterSheet()}
      ${renderRecipeDetailSheet()}
    </div>
  `;
}
