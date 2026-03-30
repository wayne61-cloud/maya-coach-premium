import { EXOS } from "../data/exos.js";
import { RECIPES } from "../data/recipes.js";
import { NOUSHI_BEAST_SPOTLIGHTS, NOUSHI_CHALLENGES, NOUSHI_EXOS } from "../data/noushi.js";
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
export const NOUSHI_CHALLENGE_BY_ID = new Map(NOUSHI_CHALLENGES.map((item) => [item.id, item]));
export const RELAX_BY_ID = new Map(RELAX_DATA.map((item) => [item.id, item]));

const UPPER_MUSCLES = new Set(["poitrine", "dos", "epaules", "triceps", "arriere-epaules", "grip"]);
const LOWER_MUSCLES = new Set(["quadriceps", "jambes", "fessiers", "ischios", "mollets"]);

function matchesNoushiZone(exercise, zone) {
  if (!exercise) return false;
  if (zone === "haut") return UPPER_MUSCLES.has(exercise.muscle);
  if (zone === "bas") return LOWER_MUSCLES.has(exercise.muscle);
  if (zone === "core") return exercise.muscle === "core";
  return true;
}

function scoreNoushiExercise(exercise, challenge) {
  let score = exercise.niveau * 10;
  if (matchesNoushiZone(exercise, challenge.zone)) score += 12;
  if ((exercise.objectif || []).includes(challenge.objectif)) score += 6;
  if (challenge.exerciseIds.includes(exercise.id)) score += 4;
  if (exercise.pattern === "carry" || exercise.pattern === "conditioning") score -= 3;
  return score;
}

function getNoushiTargetCount(zone) {
  return zone === "full" ? 6 : 4;
}

function buildNoushiChallengeExercises(challenge, place = "mixte") {
  const safePlace = ["maison", "salle", "mixte"].includes(place) ? place : "mixte";
  const targetCount = getNoushiTargetCount(challenge.zone);
  const baseExercises = (challenge.exerciseIds || [])
    .map((exerciseId) => EXO_BY_ID.get(exerciseId))
    .filter(Boolean);

  if (safePlace === "mixte") {
    return baseExercises.slice(0, targetCount);
  }

  const selected = baseExercises.filter((exercise) => matchesPlace(exercise, safePlace));
  const selectedIds = new Set(selected.map((exercise) => exercise.id));
  const fallbackPool = EXOS
    .filter((exercise) => (
      exercise.niveau >= 2
      && matchesPlace(exercise, safePlace)
      && matchesNoushiZone(exercise, challenge.zone)
      && !selectedIds.has(exercise.id)
    ))
    .sort((left, right) => scoreNoushiExercise(right, challenge) - scoreNoushiExercise(left, challenge));

  for (const exercise of fallbackPool) {
    if (selected.length >= targetCount) break;
    selected.push(exercise);
  }

  if (!selected.length) {
    return baseExercises.slice(0, targetCount);
  }

  return selected.slice(0, targetCount);
}

export function matchesPlace(exercise, place) {
  if (!place || place === "all" || place === "mixte") return true;
  if (place === "maison") return exercise.pole === "maison" || exercise.pole === "mixte";
  if (place === "salle") return exercise.pole === "salle" || exercise.pole === "mixte";
  return exercise.pole === place;
}

export function getExercisesByPlace(place = "all") {
  return EXOS.filter((exercise) => matchesPlace(exercise, place));
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

export function getNoushiChallengeVariant(challengeId, place = "mixte") {
  const challenge = NOUSHI_CHALLENGE_BY_ID.get(challengeId);
  if (!challenge) return null;

  const safePlace = ["maison", "salle", "mixte"].includes(place) ? place : "mixte";
  const exercises = buildNoushiChallengeExercises(challenge, safePlace);
  if (!exercises.length) return null;

  const estimatedMinutes = safePlace === "mixte"
    ? challenge.temps
    : Math.max(26, Math.round(exercises.length * 7 + (challenge.zone === "full" ? 8 : 6)));

  return {
    ...challenge,
    effectivePlace: safePlace,
    variantId: `${challenge.id}:${safePlace}`,
    exerciseIds: exercises.map((exercise) => exercise.id),
    exercises,
    temps: estimatedMinutes
  };
}

export function getNoushiChallengesByPlace(place = "mixte") {
  return NOUSHI_CHALLENGES
    .map((challenge) => getNoushiChallengeVariant(challenge.id, place))
    .filter(Boolean);
}

export function getNoushiBeastSpotlights(place = "mixte") {
  const safePlace = ["maison", "salle", "mixte"].includes(place) ? place : "mixte";
  if (safePlace === "mixte") return NOUSHI_BEAST_SPOTLIGHTS;

  const filtered = NOUSHI_BEAST_SPOTLIGHTS.filter((spotlight) => {
    const exercise = EXO_BY_ID.get(spotlight.exerciseId);
    return exercise && matchesPlace(exercise, safePlace);
  });

  return filtered.length ? filtered : NOUSHI_BEAST_SPOTLIGHTS;
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

export { EXOS, RECIPES, NOUSHI_EXOS, NOUSHI_CHALLENGES, NOUSHI_BEAST_SPOTLIGHTS, RELAX_DATA };
