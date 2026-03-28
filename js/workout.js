import { EXO_BY_ID, EXOS, getSimilarExercises, zoneMuscles } from "./catalog.js";
import { scheduleAutoSync } from "./sync.js";
import { state, persistCycleState, persistFeedbackTrend, persistHistory } from "./state.js";
import { getNutritionRegularity } from "./nutrition.js";
import { average, clamp, dayKey, formatShortDate, parseDurationToken, parseRepsValue, sameWeek, sum, uid } from "./utils.js";

function exerciseRestGuess(exercise) {
  if (exercise.pattern === "conditioning") return 35;
  if (exercise.pattern === "carry") return 45;
  if (exercise.pattern === "core") return 40;
  return 75;
}

function inferRepsGuess(exercise) {
  if (exercise.pattern === "carry") return "30s";
  if (exercise.pattern === "core") return "30s";
  if (exercise.pattern === "conditioning") return "12";
  return "8-12";
}

export function estimateTrainingLoad(blocks) {
  const totalSets = sum(blocks.map((block) => block.sets || block.setsPlanned || 0));
  const totalWork = sum(blocks.map((block) => {
    const duration = parseDurationToken(block.reps || block.repsTarget);
    return duration || parseRepsValue(block.reps || block.repsTarget) * 4;
  }));
  if (totalSets >= 18 || totalWork >= 260) return "high";
  if (totalSets <= 9 || totalWork <= 120) return "low";
  return "medium";
}

export function historyEntryToPlan(entry) {
  const blocks = (entry.exercises || [])
    .map((exercise) => {
      const definition = EXO_BY_ID.get(exercise.id);
      if (!definition) return null;
      return {
        exerciseId: definition.id,
        sets: exercise.setsPlanned || Math.max(2, exercise.setsDone || 3),
        reps: exercise.repsTarget || inferRepsGuess(definition),
        restSec: exercise.restSec || exerciseRestGuess(definition),
        tempo: definition.tempo
      };
    })
    .filter(Boolean);

  return {
    id: uid("plan"),
    createdAt: new Date().toISOString(),
    title: entry.title,
    inputs: {
      time: entry.durationMin || entry.durationRealMin || 30,
      place: entry.place || "maison",
      zone: entry.zone || "full",
      goal: entry.objective || "muscle",
      energy: entry.fatigueInput || "normal",
      level: state.profile?.level || "2",
      cycleWeek: state.cycleState.cycleWeek
    },
    warmup: entry.warmup || ["Mobilité générale 2 min", "Activation ciblée 1 à 2 min"],
    blocks,
    finisher: entry.finisher || "Finisher libre 2 min",
    coachReasoning: ["Plan reconstruit depuis l'historique pour rejouer une séance connue."],
    estimatedDurationMin: entry.durationMin || entry.durationRealMin || 30,
    metadata: entry.metadata || null
  };
}

export function buildMinimalPlanAroundExercise(exerciseId) {
  const focusExercise = EXO_BY_ID.get(exerciseId);
  if (!focusExercise) return null;
  const zoneKey = focusExercise.muscle === "core"
    ? "core"
    : ["poitrine", "dos", "epaules", "triceps", "arriere-epaules", "grip"].includes(focusExercise.muscle)
      ? "haut"
      : "bas";
  const zone = zoneMuscles(zoneKey);
  const similar = getSimilarExercises(exerciseId)
    .filter((exercise) => exercise.pattern !== focusExercise.pattern || exercise.muscle !== focusExercise.muscle)
    .slice(0, 2);

  const complementary = EXOS.find((exercise) => zone.includes(exercise.muscle) && exercise.pattern === "core") || EXOS.find((exercise) => exercise.pattern === "core");
  const planBlocks = [focusExercise, ...similar, complementary]
    .filter(Boolean)
    .slice(0, 4)
    .map((exercise, index) => ({
      exerciseId: exercise.id,
      sets: index === 0 ? 4 : 3,
      reps: inferRepsGuess(exercise),
      restSec: exerciseRestGuess(exercise),
      tempo: exercise.tempo
    }));

  return {
    id: uid("plan"),
    createdAt: new Date().toISOString(),
    title: `Focus ${focusExercise.nom}`,
    inputs: {
      time: parseInt(state.profile?.sessionTime || "30", 10),
      place: focusExercise.pole === "mixte" ? "maison" : focusExercise.pole,
      zone: zoneKey,
      goal: focusExercise.objectif[0] || "muscle",
      energy: "normal",
      level: state.profile?.level || "2",
      cycleWeek: state.cycleState.cycleWeek,
      preferredExerciseId: focusExercise.id
    },
    warmup: ["2 min cardio léger", `Activation spécifique ${focusExercise.muscle}`, "1 série de mise en route technique"],
    blocks: planBlocks,
    finisher: complementary ? `Finisher stabilité: ${complementary.nom} 2 séries.` : "Finisher respiration 2 min.",
    coachReasoning: [
      "Plan minimal construit autour de l'exercice sélectionné.",
      "Complément ajouté pour équilibrer la séance et garder une structure premium."
    ],
    estimatedDurationMin: 26,
    metadata: {
      dominantPattern: focusExercise.pattern,
      objective: focusExercise.objectif[0] || "muscle",
      totalSets: sum(planBlocks.map((block) => block.sets)),
      fatigueLoad: focusExercise.pattern === "conditioning" ? 74 : 62,
      coherenceScore: 87,
      cycleWeek: state.cycleState.cycleWeek,
      justification: ["Exercice focus prioritaire.", "Complément de pattern et de gainage ajouté."]
    }
  };
}

export function buildAdjustedPlan(entry, mode) {
  const basePlan = historyEntryToPlan(entry);
  if (mode === "harder") {
    basePlan.title = `${entry.title} • version plus dure`;
    basePlan.blocks = basePlan.blocks.map((block, index) => ({
      ...block,
      sets: clamp(block.sets + (index === 0 ? 1 : 0), 2, 6),
      reps: /^\d/.test(String(block.reps)) ? `${parseRepsValue(block.reps) + 2}` : block.reps,
      restSec: Math.max(30, block.restSec - 10)
    }));
  }
  if (mode === "shorter") {
    basePlan.title = `${entry.title} • version plus courte`;
    basePlan.blocks = basePlan.blocks.slice(0, Math.max(2, basePlan.blocks.length - 1)).map((block) => ({
      ...block,
      sets: Math.max(2, block.sets - 1)
    }));
    basePlan.finisher = "Finisher retiré pour raccourcir la séance.";
  }
  basePlan.metadata = {
    ...(basePlan.metadata || {}),
    coherenceScore: mode === "harder" ? 89 : 84
  };
  return basePlan;
}

export function startPlan(plan) {
  if (!plan?.blocks?.length) return false;
  if (state.workout?.timer) {
    clearInterval(state.workout.timer);
  }

  state.currentPlan = plan;
  state.workout = {
    id: uid("workout"),
    plan: structuredClone(plan),
    exerciseIndex: 0,
    phase: "work",
    restRemaining: 0,
    startedAt: Date.now(),
    timer: null,
    progress: plan.blocks.map(() => ({ completedSets: 0, repsCompleted: 0, skipped: false, modified: false }))
  };
  state.postWorkoutId = null;
  return true;
}

export function getCurrentBlock() {
  if (!state.workout) return null;
  return state.workout.plan.blocks[state.workout.exerciseIndex] || null;
}

function startRest(seconds) {
  if (!state.workout) return;
  state.workout.phase = "rest";
  state.workout.restRemaining = seconds;
  if (state.workout.timer) clearInterval(state.workout.timer);
  state.workout.timer = setInterval(() => {
    if (!state.workout) return;
    state.workout.restRemaining -= 1;
    if (state.workout.restRemaining <= 0) {
      clearInterval(state.workout.timer);
      state.workout.timer = null;
      state.workout.phase = "work";
      state.workout.restRemaining = 0;
    }
  }, 1000);
}

function advanceExercise(skipped = false) {
  if (!state.workout) return false;
  const currentIndex = state.workout.exerciseIndex;
  if (skipped) state.workout.progress[currentIndex].skipped = true;
  state.workout.exerciseIndex += 1;
  state.workout.phase = "work";
  if (state.workout.exerciseIndex >= state.workout.plan.blocks.length) {
    finishWorkout(false);
    return true;
  }
  return false;
}

export function workoutDoneAction() {
  if (!state.workout) return;
  if (state.workout.phase === "rest") {
    if (state.workout.timer) clearInterval(state.workout.timer);
    state.workout.phase = "work";
    state.workout.restRemaining = 0;
    return;
  }

  const block = getCurrentBlock();
  if (!block) return;
  const progress = state.workout.progress[state.workout.exerciseIndex];
  progress.completedSets += 1;
  progress.repsCompleted += parseDurationToken(block.reps) || parseRepsValue(block.reps);

  if (progress.completedSets >= block.sets) {
    advanceExercise(false);
  } else {
    startRest(block.restSec);
  }
}

export function workoutModifyAction(nextBlockValues) {
  if (!state.workout) return false;
  const block = getCurrentBlock();
  if (!block) return false;
  const sets = parseInt(nextBlockValues.sets, 10);
  const restSec = parseInt(nextBlockValues.restSec, 10);
  const reps = String(nextBlockValues.reps || "").trim();
  if (!Number.isFinite(sets) || sets <= 0 || !reps || !Number.isFinite(restSec) || restSec <= 0) {
    return false;
  }
  block.sets = sets;
  block.reps = reps;
  block.restSec = restSec;
  state.workout.progress[state.workout.exerciseIndex].modified = true;
  return true;
}

export function workoutSkipAction() {
  if (!state.workout) return;
  if (state.workout.timer) {
    clearInterval(state.workout.timer);
    state.workout.timer = null;
  }
  advanceExercise(true);
}

function updateCycleAfterTraining() {
  state.cycleState.sessionsInWeek += 1;
  if (state.cycleState.sessionsInWeek >= 3) {
    state.cycleState.sessionsInWeek = 0;
    state.cycleState.cycleWeek += 1;
    if (state.cycleState.cycleWeek > state.cycleState.cycleLength) {
      state.cycleState.cycleWeek = 1;
    }
  }
  persistCycleState();
}

function buildCoachNote(entry) {
  if (entry.trainingLoad === "high") {
    return "Séance dense. Priorité récupération, hydratation et repas post-workout protéiné.";
  }
  if (entry.feedback === "dur") {
    return "Feedback dur repéré. La prochaine génération réduira légèrement le volume.";
  }
  return "Séance bien calibrée. Tu peux soit stabiliser, soit progresser sur une variable la prochaine fois.";
}

export function finishWorkout(forceStop = false) {
  if (!state.workout) return null;
  if (state.workout.timer) {
    clearInterval(state.workout.timer);
    state.workout.timer = null;
  }

  const { plan, progress } = state.workout;
  const durationRealMin = Math.max(1, Math.round((Date.now() - state.workout.startedAt) / 60000));
  const exercises = plan.blocks.map((block, index) => {
    const definition = EXO_BY_ID.get(block.exerciseId);
    const entryProgress = progress[index];
    return {
      id: definition.id,
      nom: definition.nom,
      setsPlanned: block.sets,
      setsDone: entryProgress.completedSets,
      repsTarget: block.reps,
      repsCompleted: entryProgress.repsCompleted,
      restSec: block.restSec,
      skipped: entryProgress.skipped,
      modified: entryProgress.modified
    };
  });
  const completedSets = sum(exercises.map((exercise) => exercise.setsDone));
  const volume = sum(exercises.map((exercise) => exercise.repsCompleted));
  const volumeByMuscle = exercises.reduce((accumulator, exercise) => {
    const definition = EXO_BY_ID.get(exercise.id);
    if (!definition) return accumulator;
    accumulator[definition.muscle] = (accumulator[definition.muscle] || 0) + exercise.repsCompleted;
    return accumulator;
  }, {});
  const difficulty = forceStop
    ? "interrompue"
    : completedSets >= sum(plan.blocks.map((block) => block.sets)) * 0.9
      ? "tenue"
      : "partielle";
  const trainingLoad = estimateTrainingLoad(plan.blocks);
  const entry = {
    id: uid("session"),
    date: new Date().toISOString(),
    title: plan.title,
    source: plan.inputs?.quick ? "quick" : plan.inputs?.preferredExerciseId ? "focus" : "ia",
    type: "training",
    objective: plan.inputs?.goal || "muscle",
    zone: plan.inputs?.zone || "full",
    place: plan.inputs?.place || "maison",
    equipmentUsed: [...new Set(plan.blocks.map((block) => EXO_BY_ID.get(block.exerciseId)?.equipement || "Aucun"))],
    durationMin: plan.estimatedDurationMin || plan.inputs?.time || durationRealMin,
    durationRealMin,
    caloriesEstimate: Math.round(durationRealMin * (trainingLoad === "high" ? 7 : trainingLoad === "low" ? 4 : 6)),
    completedSets,
    seriesTerminees: completedSets,
    volume,
    volumeByMuscle,
    trainingLoad,
    fatigueInput: plan.inputs?.energy || "normal",
    difficulty,
    difficultyRpe: forceStop ? 9 : trainingLoad === "high" ? 8 : trainingLoad === "low" ? 6 : 7,
    exercises,
    warmup: plan.warmup,
    finisher: plan.finisher,
    metadata: plan.metadata || null,
    feedback: null,
    coachNote: ""
  };
  entry.coachNote = buildCoachNote(entry);

  state.history.unshift(entry);
  state.postWorkoutId = entry.id;
  state.workout = null;
  state.currentPlan = null;
  persistHistory();
  scheduleAutoSync();
  updateCycleAfterTraining();
  return entry;
}

export function createProtocolHistoryEntry(kind, item) {
  const entry = {
    id: uid(kind),
    date: new Date().toISOString(),
    title: item.nom,
    source: kind,
    type: kind === "noushi" ? "noushi" : "relax",
    objective: item.objectif || "recovery",
    zone: "full",
    place: "maison",
    equipmentUsed: ["Aucun"],
    durationMin: item.temps,
    durationRealMin: item.temps,
    caloriesEstimate: Math.round(item.temps * 2.2),
    completedSets: 1,
    seriesTerminees: 1,
    volume: item.temps,
    volumeByMuscle: {},
    trainingLoad: "low",
    fatigueInput: "recovery",
    difficulty: "completed",
    difficultyRpe: kind === "relax" ? 2 : 3,
    exercises: [],
    warmup: [],
    finisher: "",
    metadata: {
      dominantPattern: kind,
      objective: item.objectif || "recovery",
      totalSets: 1,
      fatigueLoad: Math.max(10, 28 - item.temps),
      coherenceScore: 90,
      cycleWeek: state.cycleState.cycleWeek,
      justification: [`Entrée créée depuis ${kind.toUpperCase()}.`, `Impact récupération: ${item.impactRecuperation || 0}.`]
    },
    feedback: null,
    coachNote: item.benefices
  };
  state.history.unshift(entry);
  persistHistory();
  scheduleAutoSync();
  return entry;
}

export function applyFeedback(entryId, feedback) {
  const entry = state.history.find((item) => item.id === entryId);
  if (!entry) return false;
  entry.feedback = feedback;
  state.feedbackTrend.history = [...(state.feedbackTrend.history || []), feedback].slice(-10);
  if (feedback === "dur") {
    state.feedbackTrend.loadAdjust = clamp((state.feedbackTrend.loadAdjust || 0) - 1, -2, 2);
  } else if (feedback === "facile") {
    state.feedbackTrend.loadAdjust = clamp((state.feedbackTrend.loadAdjust || 0) + 1, -2, 2);
  } else {
    state.feedbackTrend.loadAdjust = clamp(state.feedbackTrend.loadAdjust || 0, -2, 2);
  }
  entry.coachNote = buildCoachNote({ ...entry, feedback });
  persistHistory();
  persistFeedbackTrend();
  scheduleAutoSync();
  return true;
}

export function getLatestPostWorkoutEntry() {
  return state.postWorkoutId ? state.history.find((entry) => entry.id === state.postWorkoutId) : null;
}

export function computeDashboardStats() {
  const now = new Date();
  const sessions = state.history;
  const trainingSessions = sessions.filter((entry) => entry.type === "training");
  const streakKeys = [...new Set(sessions.map((entry) => dayKey(entry.date)).filter(Boolean))].sort().reverse();

  let streak = 0;
  let cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  const todayKey = dayKey(cursor);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);
  const startAllowed = streakKeys.includes(todayKey) || streakKeys.includes(dayKey(yesterday));
  if (startAllowed) {
    while (streakKeys.includes(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const volume7d = {};
  const volume4w = {};
  const sessionsByType = {};
  const placeSplit = { maison: 0, salle: 0, mixte: 0 };
  const aiVsQuick = { ia: 0, quick: 0, focus: 0 };
  const monthlyCalories = {};
  const bestSetByExercise = {};
  let weekSessions = 0;
  let weekCalories = 0;
  let activeMinutes = 0;

  for (const entry of sessions) {
    sessionsByType[entry.type] = (sessionsByType[entry.type] || 0) + 1;
    placeSplit[entry.place || "maison"] = (placeSplit[entry.place || "maison"] || 0) + 1;
    if (entry.source === "ia") aiVsQuick.ia += 1;
    if (entry.source === "quick") aiVsQuick.quick += 1;
    if (entry.source === "focus") aiVsQuick.focus += 1;
    activeMinutes += entry.durationRealMin || entry.durationMin || 0;

    const monthDate = new Date(entry.date);
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    monthlyCalories[monthKey] = (monthlyCalories[monthKey] || 0) + (entry.caloriesEstimate || 0);

    if (sameWeek(entry.date, now)) {
      weekSessions += 1;
      weekCalories += entry.caloriesEstimate || 0;
    }

    const ageDays = Math.floor((Date.now() - new Date(entry.date).getTime()) / (24 * 60 * 60 * 1000));
    if (ageDays <= 6) {
      Object.entries(entry.volumeByMuscle || {}).forEach(([muscle, value]) => {
        volume7d[muscle] = (volume7d[muscle] || 0) + value;
      });
    }
    if (ageDays <= 27) {
      Object.entries(entry.volumeByMuscle || {}).forEach(([muscle, value]) => {
        volume4w[muscle] = (volume4w[muscle] || 0) + value;
      });
    }

    (entry.exercises || []).forEach((exercise) => {
      const best = bestSetByExercise[exercise.id] || 0;
      bestSetByExercise[exercise.id] = Math.max(best, exercise.repsCompleted || 0);
    });
  }

  const weekSeries = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const reference = new Date(now);
    reference.setDate(reference.getDate() - offset * 7);
    const weekStart = new Date(reference);
    const day = (weekStart.getDay() + 6) % 7;
    weekStart.setDate(weekStart.getDate() - day);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = sessions.filter((entry) => {
      const date = new Date(entry.date);
      return date >= weekStart && date < weekEnd;
    }).length;
    weekSeries.push({ label: formatShortDate(weekStart), count });
  }

  const pushupRecord = bestSetByExercise.pushup_classic || bestSetByExercise.pushup_decline || 0;
  const nutritionRegularity = getNutritionRegularity(7);

  return {
    totalSessions: sessions.length,
    trainingSessions: trainingSessions.length,
    streak,
    weekSessions,
    weekCalories,
    pushupRecord,
    volume7d,
    volume4w,
    sessionsByType,
    placeSplit,
    aiVsQuick,
    bestSetByExercise,
    activeMinutes,
    monthlyCalories,
    weekSeries,
    nutritionRegularity
  };
}
