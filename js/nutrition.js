import { RECIPES, RECIPE_BY_ID } from "./catalog.js";
import { scheduleAutoSync } from "./sync.js";
import { state, persistNutritionHistory, persistNutritionProfile } from "./state.js";
import { dayKey, sum } from "./utils.js";

const MEAL_CATEGORIES = ["petit-dej", "dejeuner", "collation", "diner"];

export function inferTrainingLoad(planOrEntry) {
  if (!planOrEntry) return "medium";
  const blocks = planOrEntry.blocks || planOrEntry.exercises || [];
  const totalSets = sum(blocks.map((block) => block.sets || block.setsPlanned || 0));
  if (totalSets >= 18) return "high";
  if (totalSets <= 8) return "low";
  return "medium";
}

export function calcNutritionPlan(goal, weightKg, activity, trainingLoad = "medium") {
  const activityFactor = activity === "high" ? 1.85 : activity === "low" ? 1.45 : 1.65;
  const loadBonus = trainingLoad === "high" ? 220 : trainingLoad === "low" ? -80 : 0;
  const maintenance = Math.round(weightKg * 22 * activityFactor) + loadBonus;
  let calories = maintenance;
  if (goal === "seche") calories -= 320;
  if (goal === "masse") calories += 260;
  const proteins = Math.round(weightKg * (goal === "seche" ? 2.2 : goal === "masse" ? 2.0 : 1.8));
  const fats = Math.round(weightKg * 0.9);
  const carbs = Math.max(70, Math.round((calories - proteins * 4 - fats * 9) / 4));
  return { calories, proteins, fats, carbs, trainingLoad };
}

function categoryTarget(category, totals) {
  const map = {
    "petit-dej": Math.round(totals.calories * 0.24),
    dejeuner: Math.round(totals.calories * 0.3),
    collation: Math.round(totals.calories * 0.16),
    diner: Math.round(totals.calories * 0.3)
  };
  return map[category];
}

function loadTags(trainingLoad) {
  if (trainingLoad === "high") return ["post-workout", "high-protein"];
  if (trainingLoad === "low") return ["speed"];
  return ["high-protein"];
}

function scoreRecipe(recipe, category, goal, trainingLoad, totals) {
  let score = 0;
  if (recipe.categorie === category) score += 4;
  if (recipe.objectif === goal) score += 2;
  if (recipe.tags.includes("high-protein")) score += 2;
  if (loadTags(trainingLoad).some((tag) => recipe.tags.includes(tag))) score += 2;
  score -= Math.abs(recipe.calories - categoryTarget(category, totals)) / 120;
  return score;
}

function sanitizeExtraMealIds(extraMealIds = []) {
  return [...new Set(
    (Array.isArray(extraMealIds) ? extraMealIds : [])
      .map((recipeId) => String(recipeId || "").trim())
      .filter((recipeId) => RECIPE_BY_ID.has(recipeId))
  )];
}

function resolveRecipeForCategory({ category, goal, trainingLoad, totals, overrideId = "" }) {
  const preferred = overrideId ? RECIPE_BY_ID.get(overrideId) : null;
  if (preferred && preferred.categorie === category) {
    return preferred;
  }

  return RECIPES
    .filter((recipe) => recipe.categorie === category)
    .map((recipe) => ({ recipe, score: scoreRecipe(recipe, category, goal, trainingLoad, totals) }))
    .sort((left, right) => right.score - left.score)[0]?.recipe || RECIPES[0];
}

function buildActiveNutritionProfile() {
  const profile = state.profile || {};
  const goal = state.nutritionProfile?.goal || profile.goal || "maintenance";
  const weightKg = Number(state.nutritionProfile?.weightKg || profile.weightKg || 72) || 72;
  const activity = state.nutritionProfile?.activity || "medium";
  const trainingLoad = state.nutritionProfile?.trainingLoad || inferTrainingLoad(state.currentPlan || state.history.find((entry) => entry.type === "training"));
  return {
    goal,
    weightKg,
    activity,
    trainingLoad
  };
}

function patchLatestNutritionHistory(entryPatch) {
  if (!state.nutritionHistory.length) return;
  state.nutritionHistory[0] = {
    ...(state.nutritionHistory[0] || {}),
    ...entryPatch,
    date: state.nutritionHistory[0]?.date || new Date().toISOString()
  };
  persistNutritionHistory();
}

export function buildDailyMealPlan({ goal, weightKg, activity, trainingLoad, mealOverrides = {}, extraMealIds = [] }) {
  const totals = calcNutritionPlan(goal, weightKg, activity, trainingLoad);
  const normalizedOverrides = Object.fromEntries(
    Object.entries(mealOverrides || {})
      .filter(([category]) => MEAL_CATEGORIES.includes(category))
      .map(([category, recipeId]) => [category, String(recipeId || "").trim()])
  );
  const meals = MEAL_CATEGORIES.map((category) => ({
    category,
    recipe: resolveRecipeForCategory({
      category,
      goal,
      trainingLoad,
      totals,
      overrideId: normalizedOverrides[category] || ""
    }),
    overridden: Boolean(normalizedOverrides[category])
  }));
  const extraMeals = sanitizeExtraMealIds(extraMealIds)
    .map((recipeId) => RECIPE_BY_ID.get(recipeId))
    .filter(Boolean);

  return {
    totals,
    meals,
    extraMeals,
    coachingNotes: [
      trainingLoad === "high"
        ? "Charge d'entraînement élevée: priorité aux protéines hautes et aux glucides autour de la séance."
        : trainingLoad === "low"
          ? "Journée légère: on garde la protéine haute avec un total calorique un peu plus bas."
          : "Journée normale: équilibre entre protéines, glucides de qualité et récupération.",
      goal === "seche"
        ? "Objectif sèche: fibres, satiété et répartition stable des repas."
        : goal === "masse"
          ? "Objectif masse: ajoute du volume calorique autour du déjeuner et du dîner."
          : "Objectif maintenance: tenir un rythme simple et soutenable."
    ]
  };
}

export function saveNutritionPlan(goal, weightKg, activity, trainingLoad, dailyPlan) {
  state.nutritionProfile = {
    ...dailyPlan.totals,
    goal,
    weightKg,
    activity,
    mealOverrides: Object.fromEntries(dailyPlan.meals.map((meal) => [meal.category, meal.recipe.id])),
    extraMealIds: (dailyPlan.extraMeals || []).map((recipe) => recipe.id)
  };
  state.nutritionHistory.unshift({
    id: `nutrition_${Date.now()}`,
    date: new Date().toISOString(),
    goal,
    calories: dailyPlan.totals.calories,
    trainingLoad,
    mealIds: dailyPlan.meals.map((meal) => meal.recipe.id),
    extraMealIds: (dailyPlan.extraMeals || []).map((recipe) => recipe.id)
  });
  state.nutritionHistory = state.nutritionHistory.slice(0, 60);
  persistNutritionProfile();
  persistNutritionHistory();
  scheduleAutoSync();
}

export function replaceRecipeInNutritionPlan(category, recipeId) {
  if (!MEAL_CATEGORIES.includes(category)) return null;
  const recipe = RECIPE_BY_ID.get(recipeId);
  if (!recipe || recipe.categorie !== category) return null;

  const current = buildActiveNutritionProfile();
  const mealOverrides = {
    ...(state.nutritionProfile?.mealOverrides || {}),
    [category]: recipeId
  };
  const nextPlan = buildDailyMealPlan({
    ...current,
    mealOverrides,
    extraMealIds: state.nutritionProfile?.extraMealIds || []
  });

  state.nutritionProfile = {
    ...state.nutritionProfile,
    ...nextPlan.totals,
    goal: current.goal,
    weightKg: current.weightKg,
    activity: current.activity,
    trainingLoad: current.trainingLoad,
    mealOverrides,
    extraMealIds: sanitizeExtraMealIds(state.nutritionProfile?.extraMealIds || [])
  };
  persistNutritionProfile();
  patchLatestNutritionHistory({
    goal: current.goal,
    calories: nextPlan.totals.calories,
    trainingLoad: current.trainingLoad,
    mealIds: nextPlan.meals.map((meal) => meal.recipe.id),
    extraMealIds: state.nutritionProfile.extraMealIds
  });
  scheduleAutoSync();
  return nextPlan;
}

export function addRecipeToNutritionPlan(recipeId) {
  const recipe = RECIPE_BY_ID.get(recipeId);
  if (!recipe) return null;

  const current = buildActiveNutritionProfile();
  const extraMealIds = sanitizeExtraMealIds([
    ...(state.nutritionProfile?.extraMealIds || []),
    recipeId
  ]);
  const nextPlan = buildDailyMealPlan({
    ...current,
    mealOverrides: state.nutritionProfile?.mealOverrides || {},
    extraMealIds
  });

  state.nutritionProfile = {
    ...state.nutritionProfile,
    ...nextPlan.totals,
    goal: current.goal,
    weightKg: current.weightKg,
    activity: current.activity,
    trainingLoad: current.trainingLoad,
    mealOverrides: state.nutritionProfile?.mealOverrides || {},
    extraMealIds
  };
  persistNutritionProfile();
  patchLatestNutritionHistory({
    goal: current.goal,
    calories: nextPlan.totals.calories,
    trainingLoad: current.trainingLoad,
    mealIds: nextPlan.meals.map((meal) => meal.recipe.id),
    extraMealIds
  });
  scheduleAutoSync();
  return nextPlan;
}

export function buildNutritionGroceryList(dayPlan) {
  const recipes = [
    ...(dayPlan?.meals || []).map((meal) => meal.recipe),
    ...(dayPlan?.extraMeals || [])
  ].filter(Boolean);

  return recipes.flatMap((recipe) => (recipe.ingredients || []).map((ingredient) => ({
    recipeName: recipe.nom,
    ingredient
  })));
}

export function getNutritionRegularity(days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const entries = state.nutritionHistory.filter((entry) => new Date(entry.date).getTime() >= cutoff);
  const distinctDays = new Set(entries.map((entry) => dayKey(entry.date)));
  return {
    entries: entries.length,
    trackedDays: distinctDays.size,
    score: Math.round((distinctDays.size / days) * 100)
  };
}

export function getTrainingAwareRecipeSuggestions(targetGoal) {
  const latestTraining = state.history.find((entry) => entry.type === "training");
  const trainingLoad = inferTrainingLoad(latestTraining || state.currentPlan);
  return RECIPES
    .map((recipe) => {
      let score = 0;
      if (recipe.objectif === targetGoal) score += 2;
      if (recipe.tags.includes("high-protein")) score += 2;
      if (trainingLoad === "high" && recipe.tags.includes("post-workout")) score += 3;
      if (trainingLoad !== "high" && recipe.tags.includes("speed")) score += 1;
      return { recipe, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 4)
    .map((entry) => entry.recipe);
}
