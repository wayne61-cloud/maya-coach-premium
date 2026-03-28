import { getAllRecipeTags, searchRecipes } from "../catalog.js";
import { state } from "../state.js";
import { buildDailyMealPlan, getTrainingAwareRecipeSuggestions } from "../nutrition.js";
import { buildEmptyState, escapeHtml } from "../utils.js";

function renderNutritionDayPlan() {
  if (!state.nutritionProfile) {
    return buildEmptyState("Profil nutrition vide", "Renseigne objectif, poids et activité pour générer une vraie journée nutrition.", "", "");
  }

  const dayPlan = buildDailyMealPlan({
    goal: state.nutritionProfile.goal,
    weightKg: state.nutritionProfile.weightKg,
    activity: state.nutritionProfile.activity,
    trainingLoad: state.nutritionProfile.trainingLoad || "medium"
  });

  return `
    <div class="plan-block">
      <div class="plan-title">Plan jour premium</div>
      <div class="muted">${dayPlan.totals.calories} kcal • P ${dayPlan.totals.proteins} g • G ${dayPlan.totals.carbs} g • L ${dayPlan.totals.fats} g • charge ${escapeHtml(dayPlan.totals.trainingLoad)}</div>
      <div class="coach-grid">
        ${dayPlan.meals.map((meal) => `<div><strong>${escapeHtml(meal.category)}:</strong> ${escapeHtml(meal.recipe.nom)}</div>`).join("")}
        ${dayPlan.coachingNotes.map((note) => `<div>• ${escapeHtml(note)}</div>`).join("")}
      </div>
    </div>
  `;
}

export function renderNutrition(node) {
  const recipes = searchRecipes({
    query: state.nutritionFilter.search,
    category: state.nutritionFilter.category,
    goal: state.nutritionFilter.goal,
    tag: state.nutritionFilter.tag
  });
  const suggestions = getTrainingAwareRecipeSuggestions(state.profile?.goal || "maintenance");

  node.innerHTML = `
    <div class="section">
      <div class="card">
        <h2>Nutrition premium</h2>
        <p class="muted">Recettes high-protein, tags étendus, options végé/vegan et plan jour relié à la charge d'entraînement.</p>
        <div class="split-3" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label" for="nutritionSearch">Recherche</label>
            <input id="nutritionSearch" type="text" placeholder="curry, bowl, tacos..." value="${escapeHtml(state.nutritionFilter.search)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="nutritionCategory">Catégorie</label>
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
          <div class="field-group">
            <label class="field-label" for="nutritionGoalFilter">Objectif</label>
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
        <div class="field-group">
          <label class="field-label" for="nutritionTagFilter">Tag</label>
          <select id="nutritionTagFilter">
            <option value="all">Tous les tags</option>
            ${getAllRecipeTags().map((tag) => `<option value="${tag}" ${state.nutritionFilter.tag === tag ? "selected" : ""}>${escapeHtml(tag)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="card">
        <h3>Nutrition IA du jour</h3>
        <div class="split-3">
          <div class="field-group">
            <label class="field-label" for="nutriGoal">Objectif</label>
            <select id="nutriGoal">
              ${["seche", "masse", "maintenance"].map((goal) => `<option value="${goal}" ${(state.nutritionProfile?.goal || state.profile?.goal || "maintenance") === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
            </select>
          </div>
          <div class="field-group">
            <label class="field-label" for="nutriWeight">Poids</label>
            <input id="nutriWeight" type="number" min="35" max="180" value="${escapeHtml(state.nutritionProfile?.weightKg || state.profile?.weightKg || 75)}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="nutriActivity">Activité</label>
            <select id="nutriActivity">
              ${["low", "medium", "high"].map((activity) => `<option value="${activity}" ${(state.nutritionProfile?.activity || "medium") === activity ? "selected" : ""}>${escapeHtml(activity)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="actions-row two">
          <button class="btn btn-main" data-action="run-nutrition-ai">Générer le plan jour</button>
          <button class="btn btn-outline" data-action="go-page" data-page="history">Voir l'entraînement lié</button>
        </div>
        <div style="margin-top: 10px;">${renderNutritionDayPlan()}</div>
      </div>

      <div class="card">
        <h3>Recettes recommandées après ta charge du jour</h3>
        <div class="coach-grid">
          ${suggestions.map((recipe) => `<div>• ${escapeHtml(recipe.nom)} <span class="muted">(${recipe.prot} g prot, ${recipe.tags.join(", ")})</span></div>`).join("")}
        </div>
      </div>

      <div class="list">
        ${recipes.length ? recipes.map((recipe) => `
          <article class="exercise-card">
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
            <div class="coach-grid">
              <div><strong>Macros:</strong> ${recipe.calories} kcal • P ${recipe.prot} g • G ${recipe.carbs} g • L ${recipe.fats} g</div>
              <div><strong>Moment:</strong> ${escapeHtml(recipe.moment)}</div>
              <div>${recipe.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join(" ")}</div>
            </div>
            <details>
              <summary>Ingrédients, étapes et substitutions</summary>
              <div class="coach-grid">
                <div><strong>Ingrédients</strong><br>${recipe.ingredients.map((ingredient) => `• ${escapeHtml(ingredient)}`).join("<br>")}</div>
                <div><strong>Étapes</strong><br>${recipe.steps.map((step, index) => `${index + 1}. ${escapeHtml(step)}`).join("<br>")}</div>
                <div><strong>Substitutions</strong><br>${recipe.substitutions.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
              </div>
            </details>
          </article>
        `).join("") : buildEmptyState("Aucune recette trouvée", "Élargis les filtres ou change d'objectif pour voir plus d'idées.", "Réinitialiser", "reset-nutrition-filters")}
      </div>
    </div>
  `;
}
