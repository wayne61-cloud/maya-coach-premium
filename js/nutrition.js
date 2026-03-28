import { RECIPES } from "./catalog.js";
import { scheduleAutoSync } from "./sync.js";
import { state, persistNutritionHistory, persistNutritionProfile } from "./state.js";
import { dayKey, sum } from "./utils.js";

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

export function buildDailyMealPlan({ goal, weightKg, activity, trainingLoad }) {
  const totals = calcNutritionPlan(goal, weightKg, activity, trainingLoad);
  const mealCategories = ["petit-dej", "dejeuner", "collation", "diner"];
  const meals = mealCategories.map((category) => {
      const match = RECIPES
      .filter((recipe) => recipe.categorie === category)
      .map((recipe) => ({ recipe, score: scoreRecipe(recipe, category, goal, trainingLoad, totals) }))
      .sort((left, right) => right.score - left.score)[0]?.recipe;
    return { category, recipe: match || RECIPES[0] };
  });

  return {
    totals,
    meals,
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
    activity
  };
  state.nutritionHistory.unshift({
    id: `nutrition_${Date.now()}`,
    date: new Date().toISOString(),
    goal,
    calories: dailyPlan.totals.calories,
    trainingLoad,
    mealIds: dailyPlan.meals.map((meal) => meal.recipe.id)
  });
  state.nutritionHistory = state.nutritionHistory.slice(0, 60);
  persistNutritionProfile();
  persistNutritionHistory();
  scheduleAutoSync();
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
