import { EXOS } from "../data/exos.js";
import { RECIPES } from "../data/recipes.js";
import { NOUSHI_EXOS } from "../data/noushi.js";
import { RELAX_DATA } from "../data/relax.js";
import { normalizeKey } from "./utils.js";

const REQUIRED_EXERCISE_FIELDS = [
  "id",
  "nom",
  "pole",
  "muscle",
  "musclesSecondaires",
  "pattern",
  "variationKey",
  "niveau",
  "equipement",
  "objectif",
  "videoId",
  "setup",
  "execution",
  "respiration",
  "tempo",
  "amplitude",
  "checkpoints",
  "erreursFrequentes",
  "versionFacile",
  "versionDifficile",
  "progression",
  "volumeConseille",
  "contreIndications"
];

function validateExercises() {
  const ids = new Set();
  for (const exercise of EXOS) {
    for (const field of REQUIRED_EXERCISE_FIELDS) {
      if (!(field in exercise)) {
        throw new Error(`Champ manquant "${field}" pour ${exercise.id || exercise.nom}`);
      }
    }
    if (ids.has(exercise.id)) {
      throw new Error(`Doublon id exercice: ${exercise.id}`);
    }
    ids.add(exercise.id);
  }
}

validateExercises();

export const EXO_BY_ID = new Map(EXOS.map((exercise) => [exercise.id, exercise]));
export const EXO_BY_NAME = new Map(EXOS.map((exercise) => [normalizeKey(exercise.nom), exercise]));
export const RECIPE_BY_ID = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));
export const NOUSHI_BY_ID = new Map(NOUSHI_EXOS.map((item) => [item.id, item]));
export const RELAX_BY_ID = new Map(RELAX_DATA.map((item) => [item.id, item]));

export function matchesPlace(exercise, place) {
  if (!place || place === "all") return true;
  if (place === "maison") return exercise.pole === "maison" || exercise.pole === "mixte";
  if (place === "salle") return exercise.pole === "salle" || exercise.pole === "mixte";
  return exercise.pole === place;
}

export function hasValidVideoId(videoId) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(videoId || ""));
}

export function getAllMuscles() {
  return [...new Set(EXOS.map((exercise) => exercise.muscle))].sort();
}

export function getAllRecipeTags() {
  return [...new Set(RECIPES.flatMap((recipe) => recipe.tags))].sort();
}

export function searchExercises(query, place = "all", muscle = "all") {
  const normalized = normalizeKey(query);
  return EXOS.filter((exercise) => {
    if (!matchesPlace(exercise, place)) return false;
    if (muscle !== "all" && exercise.muscle !== muscle) return false;
    if (!normalized) return true;
    return [
      exercise.nom,
      exercise.id,
      exercise.muscle,
      exercise.pattern,
      exercise.equipement,
      ...exercise.musclesSecondaires
    ]
      .map((value) => normalizeKey(value))
      .some((value) => value.includes(normalized));
  });
}

export function searchRecipes({ query = "", category = "all", goal = "all", tag = "all" }) {
  const normalized = normalizeKey(query);
  return RECIPES.filter((recipe) => {
    if (category !== "all") {
      if (category === "rapide" && recipe.temps >= 15) return false;
      if (category !== "rapide" && recipe.categorie !== category) return false;
    }
    if (goal !== "all" && recipe.objectif !== goal) return false;
    if (tag !== "all" && !recipe.tags.includes(tag)) return false;
    if (!normalized) return true;
    return [
      recipe.nom,
      recipe.id,
      recipe.objectif,
      recipe.categorie,
      recipe.tags.join(" "),
      recipe.ingredients.join(" ")
    ]
      .map((value) => normalizeKey(value))
      .some((value) => value.includes(normalized));
  });
}

export function getSimilarExercises(exerciseId) {
  const exercise = EXO_BY_ID.get(exerciseId);
  if (!exercise) return [];
  return EXOS
    .filter((candidate) => candidate.id !== exercise.id)
    .map((candidate) => {
      let score = 0;
      if (candidate.pattern === exercise.pattern) score += 4;
      if (candidate.muscle === exercise.muscle) score += 3;
      if (candidate.pole === exercise.pole) score += 2;
      if (candidate.objectif.some((goal) => exercise.objectif.includes(goal))) score += 1;
      return { candidate, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((entry) => entry.candidate);
}

export function getGlobalSearchResults(query) {
  const normalized = normalizeKey(query);
  if (normalized.length < 2) {
    return { exercises: [], recipes: [] };
  }

  const exercises = searchExercises(normalized).slice(0, 5);
  const recipes = searchRecipes({ query: normalized }).slice(0, 5);
  return { exercises, recipes };
}

export function zoneMuscles(zone) {
  const map = {
    haut: ["poitrine", "dos", "epaules", "triceps", "arriere-epaules", "grip"],
    bas: ["jambes", "quadriceps", "fessiers", "ischios"],
    core: ["core", "grip"],
    full: ["poitrine", "dos", "jambes", "quadriceps", "fessiers", "ischios", "core", "epaules", "triceps", "arriere-epaules", "cardio", "grip"]
  };
  return map[zone] || map.full;
}

export function inferZoneFromExercise(exercise) {
  if (!exercise) return "full";
  if (["poitrine", "dos", "epaules", "triceps", "arriere-epaules", "grip"].includes(exercise.muscle)) return "haut";
  if (["jambes", "quadriceps", "fessiers", "ischios"].includes(exercise.muscle)) return "bas";
  if (["core"].includes(exercise.muscle)) return "core";
  return "full";
}

export function inferGoalFromExercise(exercise) {
  if (!exercise) return "muscle";
  if (exercise.objectif.includes("force")) return "force";
  if (exercise.objectif.includes("conditionning") || exercise.objectif.includes("seche")) return "seche";
  if (exercise.objectif.includes("endurance")) return "endurance";
  return "muscle";
}

export { EXOS, RECIPES, NOUSHI_EXOS, RELAX_DATA };
