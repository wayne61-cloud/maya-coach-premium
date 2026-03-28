import { EXOS, EXO_BY_ID, EXO_BY_NAME, inferGoalFromExercise, inferZoneFromExercise, matchesPlace, zoneMuscles } from "./catalog.js";
import { state, sanitizeAIConfig, persistAIConfig } from "./state.js";
import { average, clamp, dayKey, extractNumeric, normalizeKey, parseDurationToken, parseRepsValue, shuffle, uid } from "./utils.js";

function catalogForAI() {
  return EXOS.map((exercise) => ({
    id: exercise.id,
    nom: exercise.nom,
    pole: exercise.pole,
    muscle: exercise.muscle,
    musclesSecondaires: exercise.musclesSecondaires,
    pattern: exercise.pattern,
    niveau: exercise.niveau,
    equipement: exercise.equipement,
    objectif: exercise.objectif
  }));
}

function recentHistoryForAI() {
  return state.history.slice(0, 10).map((entry) => ({
    id: entry.id,
    date: entry.date,
    title: entry.title,
    source: entry.source,
    type: entry.type,
    objective: entry.objective,
    zone: entry.zone,
    fatigueInput: entry.fatigueInput,
    difficulty: entry.difficulty,
    feedback: entry.feedback,
    trainingLoad: entry.trainingLoad,
    exercises: (entry.exercises || []).map((exercise) => ({
      id: exercise.id,
      nom: exercise.nom,
      repsCompleted: exercise.repsCompleted,
      skipped: exercise.skipped
    }))
  }));
}

function getAthleteProfile(inputs = {}) {
  const source = inputs.athleteProfile || state.profile || {};
  const age = parseInt(source.age, 10);
  const weightKg = parseFloat(source.weightKg);
  return {
    name: String(source.name || "").trim(),
    age: Number.isFinite(age) ? age : null,
    weightKg: Number.isFinite(weightKg) ? weightKg : null,
    level: inputs.level || state.profile?.level || "2"
  };
}

function athleteProfileSummary(inputs = {}) {
  const athlete = getAthleteProfile(inputs);
  const parts = [];
  if (athlete.name) parts.push(athlete.name);
  if (athlete.age) parts.push(`${athlete.age} ans`);
  if (athlete.weightKg) parts.push(`${athlete.weightKg} kg`);
  return parts.join(" • ");
}

function extractOutputText(responseJson) {
  if (typeof responseJson?.output_text === "string" && responseJson.output_text.trim()) {
    return responseJson.output_text;
  }
  const parts = [];
  (responseJson?.output || []).forEach((output) => {
    (output.content || []).forEach((chunk) => {
      if (chunk.type === "output_text" && chunk.text) parts.push(chunk.text);
    });
  });
  return parts.join("\n");
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("Réponse IA vide");
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end < 0 || end <= start) {
      throw new Error("JSON introuvable dans la réponse IA");
    }
    return JSON.parse(raw.slice(start, end + 1));
  }
}

function isValidRepsFormat(reps) {
  return /^(\d+(-\d+)?|\d+s|\d+x\d+)$/.test(String(reps || "").trim());
}

function normalizePlanBlock(block, inputs) {
  let exercise = null;
  if (block.exerciseId && EXO_BY_ID.has(block.exerciseId)) {
    exercise = EXO_BY_ID.get(block.exerciseId);
  } else if (block.id && EXO_BY_ID.has(block.id)) {
    exercise = EXO_BY_ID.get(block.id);
  } else if (block.nom || block.name) {
    exercise = EXO_BY_NAME.get(normalizeKey(block.nom || block.name));
  }

  if (!exercise) return null;
  if (!matchesPlace(exercise, inputs.place)) return null;

  const prescription = getPrescription(inputs.goal, inputs.energy, parseInt(inputs.level, 10), exercise, inputs.cycleWeek);
  const reps = String(block.reps || prescription.reps);
  const restSec = clamp(parseInt(block.restSec, 10) || prescription.restSec, 20, 240);
  const sets = clamp(parseInt(block.sets, 10) || prescription.sets, 1, 8);
  if (!isValidRepsFormat(reps)) return null;

  return {
    exerciseId: exercise.id,
    sets,
    reps,
    restSec,
    tempo: String(block.tempo || exercise.tempo || prescription.tempo || "2-1-1")
  };
}

function buildPlanMetadata(plan, inputs) {
  const totalSets = plan.blocks.reduce((total, block) => total + block.sets, 0);
  const estimatedReps = plan.blocks.reduce((total, block) => {
    const duration = parseDurationToken(block.reps);
    if (duration) return total + Math.round(duration / 5);
    return total + parseRepsValue(block.reps) * block.sets;
  }, 0);
  const patterns = plan.blocks.map((block) => EXO_BY_ID.get(block.exerciseId)?.pattern || "autre");
  const dominantPattern = patterns.sort((left, right) => patterns.filter((item) => item === right).length - patterns.filter((item) => item === left).length)[0] || "mixte";
  const fatigueLoad = clamp(Math.round(totalSets * 4 + estimatedReps * 0.6 + (inputs.energy === "fatigue" ? -8 : inputs.energy === "high" ? 8 : 0)), 25, 100);
  const coherenceScore = clamp(Math.round(72 + totalSets * 1.2 + (inputs.preferredExerciseId ? 5 : 0) + (inputs.cycleWeek === 4 ? -5 : 2) - Math.abs(plan.estimatedDurationMin - inputs.time)), 58, 99);
  return {
    dominantPattern,
    objective: inputs.goal,
    totalSets,
    estimatedReps,
    fatigueLoad,
    coherenceScore,
    cycleWeek: inputs.cycleWeek,
    justification: [
      `Pattern dominant: ${dominantPattern}.`,
      `Volume total: ${totalSets} séries pour ${plan.blocks.length} blocs.`,
      `Charge de fatigue estimée: ${fatigueLoad}/100.`,
      `Semaine de cycle ${inputs.cycleWeek} appliquée.`,
      athleteProfileSummary(inputs) ? `Profil pris en compte: ${athleteProfileSummary(inputs)}.` : "Profil standard utilisé."
    ]
  };
}

function normalizeExternalPlan(external, inputs) {
  const object = external?.plan || external;
  if (!object || typeof object !== "object") {
    throw new Error("Plan IA invalide: objet manquant");
  }

  const rawBlocks = Array.isArray(object.blocks) ? object.blocks : Array.isArray(object.exercises) ? object.exercises : [];
  const blocks = rawBlocks.map((block) => normalizePlanBlock(block || {}, inputs)).filter(Boolean);
  if (!blocks.length) {
    throw new Error("Plan IA invalide: aucun exercice exploitable");
  }

  const plan = {
    id: uid("plan"),
    createdAt: new Date().toISOString(),
    inputs,
    title: String(object.title || `Séance ${inputs.time} min • ${inputs.zone} • ${inputs.goal}`),
    warmup: Array.isArray(object.warmup) && object.warmup.length
      ? object.warmup.map((item) => String(item))
      : defaultWarmup(inputs.zone),
    blocks: blocks.slice(0, 6),
    finisher: String(object.finisher || defaultFinisher(inputs.goal)),
    coachReasoning: Array.isArray(object.coachReasoning) && object.coachReasoning.length
      ? object.coachReasoning.map((item) => String(item))
      : ["Plan validé par la couche de normalisation.", "Fallback local disponible en cas d'erreur cloud."],
    estimatedDurationMin: 0
  };
  plan.estimatedDurationMin = estimateDuration(plan);
  plan.metadata = buildPlanMetadata(plan, inputs);
  return plan;
}

function getRecentContext() {
  const recentSessions = state.history.filter((entry) => entry.type === "training").slice(0, 4);
  const recentExerciseIds = new Set();
  const muscleLoad = {};
  const feedbackWindow = [];
  recentSessions.forEach((session) => {
    feedbackWindow.push(session.feedback || "");
    (session.exercises || []).forEach((exercise) => {
      recentExerciseIds.add(exercise.id);
      const definition = EXO_BY_ID.get(exercise.id);
      if (!definition) return;
      muscleLoad[definition.muscle] = (muscleLoad[definition.muscle] || 0) + (exercise.repsCompleted || 0);
    });
  });
  return { recentExerciseIds, muscleLoad, feedbackWindow };
}

function getWeeklyFeedbackModifier() {
  const window = state.feedbackTrend.history?.slice(-4) || [];
  const easyCount = window.filter((item) => item === "facile").length;
  const hardCount = window.filter((item) => item === "dur").length;
  if (hardCount >= 2) return -1;
  if (easyCount >= 2) return 1;
  return 0;
}

function getCycleVolumeModifier(cycleWeek) {
  if (cycleWeek === 2) return 1;
  if (cycleWeek === 3) return 1;
  if (cycleWeek === 4) return -1;
  return 0;
}

function getCycleRestModifier(cycleWeek) {
  if (cycleWeek === 3) return -10;
  if (cycleWeek === 4) return 15;
  return 0;
}

function goalMatchScore(exercise, goal) {
  if (goal === "muscle") {
    return ["push", "pull", "squat", "hinge"].includes(exercise.pattern) ? 1.4 : 0.8;
  }
  if (goal === "force") {
    return ["push", "pull", "squat", "hinge", "carry"].includes(exercise.pattern) ? 1.3 : 0.5;
  }
  if (goal === "endurance") {
    return ["core", "conditioning", "carry"].includes(exercise.pattern) ? 1.2 : 0.75;
  }
  if (goal === "seche") {
    return ["conditioning", "core", "carry", "hinge"].includes(exercise.pattern) ? 1.2 : 0.7;
  }
  return 0.6;
}

function defaultWarmup(zone) {
  const map = {
    haut: ["Mobilité épaules 2 min", "Scapular pull ou push 1x10", "Face pull léger 1x15"],
    bas: ["Mobilité hanches 2 min", "Hip hinge au poids du corps 1x10", "Squat lent 1x10"],
    core: ["Respiration diaphragmatique 1 min", "Dead bug 1x8 par côté", "Bird dog 1x8 par côté"],
    full: ["Marche active ou jumping jacks 1 min", "Mobilité globale 2 min", "Activation core 1x30s"]
  };
  return map[zone] || map.full;
}

function defaultFinisher(goal) {
  const options = {
    muscle: "Finisher 2 rounds: face pull ou carry court + gainage.",
    force: "Finisher nerveux: farmer carry lourd 2 à 3 allers.",
    endurance: "Finisher 3 min: burpee low-impact ou mountain climbers.",
    seche: "Finisher 4 rounds: 20s effort / 20s repos."
  };
  return options[goal] || options.muscle;
}

function getPrescription(goal, energy, level, exercise, cycleWeek = 1) {
  const athlete = getAthleteProfile({ level });
  let sets = 3;
  let reps = "10-12";
  let restSec = 70;
  if (goal === "force") {
    sets = 4;
    reps = ["carry", "core"].includes(exercise.pattern) ? "20s" : "5-6";
    restSec = 120;
  } else if (goal === "endurance") {
    sets = 3;
    reps = ["core", "carry"].includes(exercise.pattern) ? "35s" : "14-18";
    restSec = 45;
  } else if (goal === "seche") {
    sets = 3;
    reps = ["core", "carry"].includes(exercise.pattern) ? "30s" : "12-15";
    restSec = 40;
  }

  if (energy === "fatigue") {
    sets = Math.max(2, sets - 1);
    restSec += 15;
  }
  if (energy === "high") {
    sets += 1;
    restSec = Math.max(30, restSec - 10);
  }

  sets += getCycleVolumeModifier(cycleWeek);
  sets += state.feedbackTrend.loadAdjust || 0;
  sets += getWeeklyFeedbackModifier();
  sets = clamp(sets, 2, 6);
  restSec = clamp(restSec + getCycleRestModifier(cycleWeek), 30, 180);

  if (level === 1 && exercise.niveau >= 3) {
    sets = Math.max(2, sets - 1);
  }

  if (athlete.age && athlete.age >= 50) {
    restSec = clamp(restSec + 10, 30, 180);
    if (exercise.pattern === "conditioning") {
      sets = Math.max(2, sets - 1);
      if (/^\d+(-\d+)?$/.test(reps)) {
        reps = `${Math.max(6, parseRepsValue(reps) - 2)}`;
      }
    }
  }

  if (athlete.weightKg && athlete.weightKg >= 95 && exercise.pattern === "conditioning") {
    if (/^\d+(-\d+)?$/.test(reps)) {
      reps = `${Math.max(6, parseRepsValue(reps) - 2)}`;
    }
    restSec = clamp(restSec + 10, 30, 180);
  }

  if (cycleWeek === 4 && /^[0-9]+(-[0-9]+)?$/.test(reps)) {
    reps = String(Math.max(5, extractNumeric(reps) - 2));
  }

  return { sets, reps, restSec, tempo: exercise.tempo };
}

export function estimateDuration(plan) {
  let total = plan.warmup.length * 1.5;
  total += plan.blocks.reduce((accumulator, block) => {
    const durationToken = parseDurationToken(block.reps);
    const workSeconds = durationToken || Math.max(30, parseRepsValue(block.reps) * 4);
    return accumulator + (workSeconds / 60 + block.restSec / 60 + 0.35) * block.sets;
  }, 0);
  total += 3;
  return Math.round(total);
}

export function generateAIPlan(inputOverrides) {
  const inputs = {
    ...inputOverrides,
    cycleWeek: inputOverrides.cycleWeek || state.cycleState.cycleWeek || 1,
    athleteProfile: getAthleteProfile(inputOverrides)
  };
  const targetMuscles = zoneMuscles(inputs.zone);
  const { recentExerciseIds, muscleLoad, feedbackWindow } = getRecentContext();
  const lastWasHard = feedbackWindow[0] === "dur" || state.history[0]?.feedback === "dur";
  const level = parseInt(inputs.level, 10);
  const athlete = getAthleteProfile(inputs);

  let pool = EXOS.filter((exercise) => matchesPlace(exercise, inputs.place));
  pool = pool.filter((exercise) => targetMuscles.includes(exercise.muscle));
  if (pool.length < 5) {
    pool = EXOS.filter((exercise) => matchesPlace(exercise, inputs.place));
  }

  const scored = pool
    .map((exercise) => {
      let score = 0;
      score += targetMuscles.includes(exercise.muscle) ? 3 : 0.2;
      score += goalMatchScore(exercise, inputs.goal);
      score += 0.25 * Math.random();
      score -= recentExerciseIds.has(exercise.id) ? 1.9 : 0;
      score -= (muscleLoad[exercise.muscle] || 0) / 120;
      score -= Math.max(0, exercise.niveau - level) * 0.9;
      if (lastWasHard) score -= 0.45 * Math.max(0, exercise.niveau - 1);
      if (inputs.preferredExerciseId && exercise.id === inputs.preferredExerciseId) score += 6;
      if ((inputs.seedExerciseIds || []).includes(exercise.id)) score += 1.2;
      if (athlete.age && athlete.age >= 50 && exercise.pattern === "conditioning") score -= 0.7;
      if (athlete.weightKg && athlete.weightKg >= 95 && exercise.pattern === "conditioning") score -= 0.5;
      if (athlete.weightKg && athlete.weightKg >= 90 && /traction|pull-up|chin-up/i.test(exercise.nom) && exercise.niveau >= 2) score -= 0.4;
      if (athlete.weightKg && athlete.weightKg >= 90 && /assiste|élastique|machine/i.test(exercise.nom)) score += 0.8;
      return { exercise, score };
    })
    .sort((left, right) => right.score - left.score);

  const targetCount = clamp(Math.round(inputs.time / 8), 3, 6);
  const blocks = [];
  const usedPatterns = new Set();
  for (const entry of scored) {
    if (blocks.length >= targetCount) break;
    const exercise = entry.exercise;
    const isPreferred = inputs.preferredExerciseId === exercise.id;
    if (usedPatterns.has(exercise.pattern) && blocks.length < targetCount - 1 && !isPreferred) continue;
    const prescription = getPrescription(inputs.goal, inputs.energy, level, exercise, inputs.cycleWeek);
    blocks.push({
      exerciseId: exercise.id,
      sets: prescription.sets,
      reps: prescription.reps,
      restSec: prescription.restSec,
      tempo: exercise.tempo
    });
    usedPatterns.add(exercise.pattern);
  }

  const selectedBlocks = inputs.preferredExerciseId
    ? [
        ...blocks.filter((block) => block.exerciseId === inputs.preferredExerciseId),
        ...blocks.filter((block) => block.exerciseId !== inputs.preferredExerciseId)
      ]
    : blocks;

  const plan = {
    id: uid("plan"),
    createdAt: new Date().toISOString(),
    inputs,
    title: `Séance ${inputs.time} min • ${inputs.zone} • ${inputs.goal}`,
    warmup: defaultWarmup(inputs.zone),
    blocks: selectedBlocks,
    finisher: defaultFinisher(inputs.goal),
    coachReasoning: [
      `Temps ${inputs.time} min -> ${selectedBlocks.length} blocs utiles.`,
      inputs.preferredExerciseId ? "Exercice focus priorisé dans la séance." : "Sélection pilotée par la rotation des patterns.",
      inputs.energy === "fatigue" ? "Énergie basse: volume conservateur et repos plus longs." : "Énergie correcte: progression standard.",
      `Semaine de cycle ${inputs.cycleWeek}: ${inputs.cycleWeek === 4 ? "deload intelligent" : "progression active"}.`,
      lastWasHard ? "Dernier feedback dur: surcharge freinée." : "Feedback récent stable.",
      athleteProfileSummary(inputs) ? `Profil athlète intégré: ${athleteProfileSummary(inputs)}.` : "Profil athlète basique."
    ],
    estimatedDurationMin: 0
  };

  plan.estimatedDurationMin = estimateDuration(plan);
  plan.metadata = buildPlanMetadata(plan, inputs);
  return plan;
}

async function requestPlanViaProxy(inputs) {
  const payload = {
    mode: "maya_coach_plan_v2",
    inputs,
    cycleWeek: inputs.cycleWeek,
    feedbackTrend: state.feedbackTrend,
    history: recentHistoryForAI(),
    exos: catalogForAI(),
    athleteProfile: getAthleteProfile(inputs),
    internetEnabled: Boolean(state.aiConfig.webSearch)
  };

  const response = await fetch(state.aiConfig.proxyEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Proxy HTTP ${response.status}`);
  }
  const json = await response.json();
  return normalizeExternalPlan(json, inputs);
}

async function requestPlanViaDirectOpenAI(inputs) {
  if (!state.aiConfig.apiKey) {
    throw new Error("API key OpenAI manquante");
  }

  const systemText = [
    "You are MAYA Coach.",
    "Return strict JSON only, no markdown.",
    "Use only exercises from the provided exos array.",
    "Every block must contain a valid exerciseId from exos.",
    "Account for cycleWeek and feedbackTrend.",
    "Use the athleteProfile to adapt intensity, impact and exercise variants.",
    "Schema:",
    "{title,warmup:string[],blocks:[{exerciseId,sets,reps,restSec,tempo}],finisher,coachReasoning:string[]}"
  ].join(" ");

  const payload = {
    inputs,
    cycleWeek: inputs.cycleWeek,
    feedbackTrend: state.feedbackTrend,
    history: recentHistoryForAI(),
    exos: catalogForAI(),
    athleteProfile: getAthleteProfile(inputs)
  };

  const requestBody = {
    model: state.aiConfig.model,
    temperature: 0.25,
    max_output_tokens: 900,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemText }]
      },
      {
        role: "user",
        content: [{ type: "input_text", text: JSON.stringify(payload) }]
      }
    ]
  };

  if (state.aiConfig.webSearch) {
    requestBody.tools = [{ type: "web_search" }];
    requestBody.tool_choice = "auto";
    requestBody.include = ["web_search_call.action.sources"];
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.aiConfig.apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}`);
  }

  const json = await response.json();
  return normalizeExternalPlan(extractJsonObject(extractOutputText(json)), inputs);
}

export async function generatePlanWithCloudFallback(inputOverrides) {
  const inputs = {
    ...inputOverrides,
    cycleWeek: inputOverrides.cycleWeek || state.cycleState.cycleWeek || 1,
    athleteProfile: getAthleteProfile(inputOverrides)
  };
  const startedAt = Date.now();
  if (state.aiConfig.mode === "local") {
    const plan = generateAIPlan(inputs);
    return { plan, source: "local", latencyMs: Date.now() - startedAt, error: "" };
  }

  try {
    const plan = state.aiConfig.mode === "proxy"
      ? await requestPlanViaProxy(inputs)
      : await requestPlanViaDirectOpenAI(inputs);
    return { plan, source: state.aiConfig.mode, latencyMs: Date.now() - startedAt, error: "" };
  } catch (error) {
    const plan = generateAIPlan(inputs);
    return {
      plan,
      source: "local-fallback",
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function testAIConfig() {
  const sample = {
    time: 25,
    place: "maison",
    zone: "haut",
    energy: "normal",
    goal: "muscle",
    level: "2",
    cycleWeek: state.cycleState.cycleWeek,
    athleteProfile: getAthleteProfile()
  };
  const result = await generatePlanWithCloudFallback(sample);
  state.aiRuntime = {
    source: result.source,
    latencyMs: result.latencyMs,
    error: result.error,
    status: result.error ? "fallback" : "ready",
    lastCheckedAt: new Date().toISOString(),
    internetEnabled: Boolean(state.aiConfig.webSearch)
  };
  return result;
}

export function updateAIConfig(config) {
  state.aiConfig = sanitizeAIConfig(config);
  persistAIConfig();
}

export function prefillAIFromExercise(exercise) {
  return {
    time: state.profile?.sessionTime || "35",
    place: exercise.pole === "mixte" ? (state.profile?.place === "salle" ? "salle" : "maison") : exercise.pole,
    zone: inferZoneFromExercise(exercise),
    energy: "normal",
    goal: inferGoalFromExercise(exercise),
    level: String(Math.max(parseInt(state.profile?.level || "2", 10), exercise.niveau > 2 ? 2 : 1)),
    preferredExerciseId: exercise.id,
    cycleWeek: state.cycleState.cycleWeek,
    athleteProfile: getAthleteProfile()
  };
}

export function buildAdaptiveInputsFromHistory(entry, mode = "adapt") {
  const baseTime = entry.durationRealMin || entry.durationMin || parseInt(state.profile?.sessionTime || "35", 10);
  return {
    time: mode === "shorter" ? clamp(baseTime - 10, 20, 60) : clamp(baseTime, 20, 60),
    place: entry.place || state.profile?.place || "maison",
    zone: entry.zone || "full",
    energy: entry.feedback === "dur" ? "fatigue" : "normal",
    goal: mode === "harder" ? "force" : entry.objective || state.profile?.goal || "muscle",
    level: state.profile?.level || "2",
    preferredExerciseId: entry.exercises?.[0]?.id || "",
    seedExerciseIds: (entry.exercises || []).map((exercise) => exercise.id),
    cycleWeek: state.cycleState.cycleWeek,
    previousEntryId: entry.id,
    athleteProfile: getAthleteProfile()
  };
}

export function getCycleHeadline() {
  const labels = {
    1: "Base technique",
    2: "Surcharge progressive",
    3: "Surcharge contrôlée",
    4: "Deload intelligent"
  };
  return `Semaine ${state.cycleState.cycleWeek} • ${labels[state.cycleState.cycleWeek] || "Cycle actif"}`;
}

export function getTodayHistoryEntries() {
  const today = dayKey(new Date());
  return state.history.filter((entry) => dayKey(entry.date) === today);
}
