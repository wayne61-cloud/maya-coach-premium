import { EXO_BY_ID, EXOS, getExercisesByPlace, getNoushiChallengeVariant, getSimilarExercises, matchesPlace, zoneMuscles } from "./catalog.js";
import { estimateDuration } from "./ai.js";
import { scheduleAutoSync } from "./sync.js";
import { defaultCustomWorkoutDraft, setCustomWorkoutLibraryState, state, persistCycleState, persistFeedbackTrend, persistHistory } from "./state.js";
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
      place: focusExercise.pole === "mixte" ? (state.profile?.place || defaultCustomWorkoutDraft.place) : focusExercise.pole,
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

function inferZoneFromBlocks(blocks) {
  const muscles = blocks
    .map((block) => EXO_BY_ID.get(block.exerciseId)?.muscle || "")
    .filter(Boolean);
  const upper = ["poitrine", "dos", "epaules", "triceps", "biceps", "arriere-epaules", "grip"];
  const lower = ["quadriceps", "ischios", "fessiers", "mollets"];
  if (muscles.length && muscles.every((muscle) => upper.includes(muscle))) return "haut";
  if (muscles.length && muscles.every((muscle) => lower.includes(muscle))) return "bas";
  if (muscles.length && muscles.every((muscle) => muscle === "core")) return "core";
  return "full";
}

function pickExerciseForPlace(place, usedExerciseIds = new Set(), preferredMuscle = "") {
  const pool = getExercisesByPlace(place || "mixte");
  return pool.find((exercise) => preferredMuscle && exercise.muscle === preferredMuscle && !usedExerciseIds.has(exercise.id))
    || pool.find((exercise) => !usedExerciseIds.has(exercise.id))
    || pool[0]
    || EXOS[0];
}

function buildCustomWorkoutSessionId() {
  return `session_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function normalizeCustomWorkoutDraftForPlace(draft = state.customWorkoutDraft, place = draft?.place || defaultCustomWorkoutDraft.place) {
  const nextPlace = ["maison", "salle", "mixte"].includes(place) ? place : defaultCustomWorkoutDraft.place;
  const base = {
    ...structuredClone(defaultCustomWorkoutDraft),
    ...(draft || {}),
    place: nextPlace
  };
  const targetExerciseCount = clamp(parseInt(base.targetExerciseCount, 10) || 0, 1, 12);
  const usedExerciseIds = new Set();
  const blocks = (base.blocks || []).slice(0, 12).map((block, index) => {
    const currentExercise = EXO_BY_ID.get(block.exerciseId);
    const nextExercise = currentExercise && matchesPlace(currentExercise, nextPlace)
      ? currentExercise
      : pickExerciseForPlace(nextPlace, usedExerciseIds, currentExercise?.muscle);
    if (nextExercise) usedExerciseIds.add(nextExercise.id);
    return {
      id: String(block.id || `block_${index + 1}`),
      exerciseId: nextExercise?.id || "pushup_classic",
      sets: String(block.sets || "3"),
      reps: String(block.reps || inferRepsGuess(nextExercise || EXOS[0]) || "10-12"),
      restSec: String(block.restSec || exerciseRestGuess(nextExercise || EXOS[0]) || "60")
    };
  });

  while (blocks.length < targetExerciseCount) {
    const nextExercise = pickExerciseForPlace(nextPlace, usedExerciseIds);
    if (nextExercise) usedExerciseIds.add(nextExercise.id);
    blocks.push({
      id: `block_${Date.now().toString(36)}_${blocks.length + 1}`,
      exerciseId: nextExercise?.id || "pushup_classic",
      sets: "3",
      reps: inferRepsGuess(nextExercise || EXOS[0]) || "10-12",
      restSec: String(exerciseRestGuess(nextExercise || EXOS[0]) || "60")
    });
  }

  return {
    ...base,
    id: String(base.id || buildCustomWorkoutSessionId()),
    place: nextPlace,
    targetExerciseCount: String(targetExerciseCount),
    blocks: (blocks.length ? blocks : structuredClone(defaultCustomWorkoutDraft.blocks)).slice(0, targetExerciseCount)
  };
}

export function setActiveCustomWorkoutSession(sessionId) {
  const sessions = Array.isArray(state.customWorkoutLibrary) ? state.customWorkoutLibrary : [];
  const target = sessions.find((session) => session.id === sessionId);
  if (!target) return null;
  return setCustomWorkoutLibraryState({
    sessions,
    activeId: target.id
  });
}

export function createCustomWorkoutSession(seed = {}) {
  const nextSession = normalizeCustomWorkoutDraftForPlace({
    ...structuredClone(defaultCustomWorkoutDraft),
    id: seed.id || buildCustomWorkoutSessionId(),
    title: seed.title || `Ma séance ${((state.customWorkoutLibrary || []).length || 0) + 1}`,
    blocks: seed.blocks || structuredClone(defaultCustomWorkoutDraft.blocks),
    ...seed
  }, seed.place || state.profile?.place || defaultCustomWorkoutDraft.place);

  return setCustomWorkoutLibraryState({
    sessions: [...(state.customWorkoutLibrary || []), nextSession],
    activeId: nextSession.id
  });
}

export function removeCustomWorkoutSession(sessionId) {
  const sessions = (state.customWorkoutLibrary || []).filter((session) => session.id !== sessionId);
  if (!sessions.length) {
    return setCustomWorkoutLibraryState({
      sessions: [
        normalizeCustomWorkoutDraftForPlace({
          ...structuredClone(defaultCustomWorkoutDraft),
          id: buildCustomWorkoutSessionId(),
          place: state.profile?.place || defaultCustomWorkoutDraft.place
        }, state.profile?.place || defaultCustomWorkoutDraft.place)
      ]
    });
  }
  const fallbackId = state.activeCustomWorkoutId === sessionId ? sessions[0].id : state.activeCustomWorkoutId;
  return setCustomWorkoutLibraryState({
    sessions,
    activeId: fallbackId
  });
}

export function setCustomWorkoutDraft(nextDraft) {
  const baseId = nextDraft?.id || state.activeCustomWorkoutId || state.customWorkoutDraft?.id || buildCustomWorkoutSessionId();
  const normalizedDraft = normalizeCustomWorkoutDraftForPlace(
    { ...(state.customWorkoutDraft || defaultCustomWorkoutDraft), ...(nextDraft || {}), id: baseId },
    nextDraft?.place || state.customWorkoutDraft?.place || defaultCustomWorkoutDraft.place
  );
  const existingSessions = Array.isArray(state.customWorkoutLibrary) ? state.customWorkoutLibrary : [];
  const nextSessions = existingSessions.some((session) => session.id === normalizedDraft.id)
    ? existingSessions.map((session) => session.id === normalizedDraft.id ? normalizedDraft : session)
    : [...existingSessions, normalizedDraft];
  return setCustomWorkoutLibraryState({
    sessions: nextSessions,
    activeId: normalizedDraft.id
  });
}

export function appendExerciseToCustomWorkout(exerciseId, sessionId = state.activeCustomWorkoutId) {
  const exercise = EXO_BY_ID.get(exerciseId);
  if (!exercise) return null;
  const targetSession = (state.customWorkoutLibrary || []).find((session) => session.id === sessionId) || state.customWorkoutDraft;
  if (!targetSession) return null;

  const currentDraft = normalizeCustomWorkoutDraftForPlace(
    targetSession,
    targetSession?.place || exercise.pole || state.profile?.place || defaultCustomWorkoutDraft.place
  );
  const usedExerciseIds = new Set((currentDraft.blocks || []).map((block) => block.exerciseId));
  const nextPlace = currentDraft.place === "mixte"
    ? "mixte"
    : matchesPlace(exercise, currentDraft.place)
      ? currentDraft.place
      : exercise.pole === "mixte"
        ? currentDraft.place
        : exercise.pole;

  return setCustomWorkoutDraft({
    ...currentDraft,
    id: currentDraft.id,
    place: nextPlace,
    targetExerciseCount: String(Math.max(parseInt(currentDraft.targetExerciseCount, 10) || 1, usedExerciseIds.has(exercise.id) ? currentDraft.blocks.length : currentDraft.blocks.length + 1)),
    blocks: usedExerciseIds.has(exercise.id)
      ? currentDraft.blocks
      : [
          ...(currentDraft.blocks || []),
          {
            id: `block_${Date.now()}`,
            exerciseId: exercise.id,
            sets: exercise.niveau >= 3 ? "4" : "3",
            reps: inferRepsGuess(exercise),
            restSec: String(exerciseRestGuess(exercise))
          }
        ]
  });
}

export function buildCustomPlanFromDraft(draft = state.customWorkoutDraft) {
  const normalizedDraft = normalizeCustomWorkoutDraftForPlace(
    draft,
    draft?.place || state.profile?.place || defaultCustomWorkoutDraft.place
  );
  const rawBlocks = Array.isArray(normalizedDraft?.blocks) ? normalizedDraft.blocks : [];
  const blocks = rawBlocks
    .map((block) => {
      const exercise = EXO_BY_ID.get(block.exerciseId);
      if (!exercise) return null;
      if (!matchesPlace(exercise, normalizedDraft.place)) return null;
      const sets = clamp(parseInt(block.sets, 10) || 0, 1, 8);
      const restSec = clamp(parseInt(block.restSec, 10) || 0, 20, 240);
      const reps = String(block.reps || "").trim();
      if (!sets || !restSec || !reps) return null;
      return {
        exerciseId: exercise.id,
        sets,
        reps,
        restSec,
        tempo: exercise.tempo
      };
    })
    .filter(Boolean);

  if (!blocks.length) return null;

  const plan = {
    id: uid("plan"),
    createdAt: new Date().toISOString(),
    title: String(normalizedDraft?.title || "Séance personnalisée").trim() || "Séance personnalisée",
    inputs: {
      time: 0,
      place: normalizedDraft?.place || state.profile?.place || defaultCustomWorkoutDraft.place,
      zone: inferZoneFromBlocks(blocks),
      goal: normalizedDraft?.objective || state.profile?.goal || "muscle",
      energy: "normal",
      level: state.profile?.level || "2",
      cycleWeek: state.cycleState.cycleWeek,
      manual: true
    },
    warmup: ["2 min mobilisation générale", "1 série légère sur le premier exo", "Respiration + mise en route"],
    blocks,
    finisher: "Finisher libre selon ton énergie du jour.",
    coachReasoning: [
      "Séance construite manuellement par l’athlète.",
      "Le suivi live, la fiche de résultat et la comparaison à la dernière fois restent actifs."
    ],
    estimatedDurationMin: 0
  };
  plan.estimatedDurationMin = estimateDuration(plan);
  return plan;
}

export function resetCustomWorkoutDraft(seed = {}) {
  const nextPlace = seed.place || state.customWorkoutDraft?.place || state.profile?.place || defaultCustomWorkoutDraft.place;
  return setCustomWorkoutDraft({
    ...structuredClone(defaultCustomWorkoutDraft),
    id: state.activeCustomWorkoutId || state.customWorkoutDraft?.id || buildCustomWorkoutSessionId(),
    ...seed,
    place: nextPlace
  });
}

export function getCustomWorkoutMetrics(draft = state.customWorkoutDraft) {
  const normalizedDraft = normalizeCustomWorkoutDraftForPlace(
    draft,
    draft?.place || state.profile?.place || defaultCustomWorkoutDraft.place
  );
  const exercises = (normalizedDraft.blocks || [])
    .map((block) => EXO_BY_ID.get(block.exerciseId))
    .filter(Boolean);
  const rests = (normalizedDraft.blocks || []).map((block) => parseInt(block.restSec, 10)).filter(Number.isFinite);
  const plan = buildCustomPlanFromDraft(normalizedDraft);
  return {
    draft: normalizedDraft,
    plan,
    exercises,
    averageLevel: exercises.length ? average(exercises.map((exercise) => exercise.niveau || 1)) : 0,
    averageRest: rests.length ? Math.round(average(rests)) : 0,
    totalSets: sum((normalizedDraft.blocks || []).map((block) => parseInt(block.sets, 10) || 0)),
    hardCount: exercises.filter((exercise) => exercise.niveau >= 3).length,
    muscleCount: new Set(exercises.map((exercise) => exercise.muscle)).size,
    patternCount: new Set(exercises.map((exercise) => exercise.pattern)).size
  };
}

export function buildCustomWorkoutCoachAlerts(draft = state.customWorkoutDraft) {
  const metrics = getCustomWorkoutMetrics(draft);
  const alerts = [];

  if (!metrics.exercises.length) {
    return [{
      id: "empty",
      tone: "calm",
      title: "Maya attend ton premier exercice",
      body: "Ajoute un bloc pour que Maya Coach lise l’intensité, la densité et l’équilibre de ta séance."
    }];
  }

  if (metrics.hardCount >= 2 && metrics.averageRest < 90) {
    alerts.push({
      id: "rest-up",
      tone: "alert",
      title: "Monte le repos sur les blocs les plus durs",
      body: `Ta séance contient ${metrics.hardCount} exercice(s) très exigeant(s). Maya Coach conseille 90 à 140 secondes de repos pour garder une vraie qualité d’exécution.`
    });
  }

  if (metrics.totalSets >= 18 || (metrics.plan?.estimatedDurationMin || 0) > 50) {
    alerts.push({
      id: "density-down",
      tone: "warn",
      title: "Densité haute détectée",
      body: `En l’état, la séance part sur ${metrics.totalSets} séries et environ ${metrics.plan?.estimatedDurationMin || 0} minutes. Coupe un bloc ou répartis-la sur deux jours si tu veux rester explosif.`
    });
  }

  if (metrics.muscleCount <= 1 && metrics.exercises.length >= 3) {
    alerts.push({
      id: "balance",
      tone: "warn",
      title: "Séance très mono-zone",
      body: "Tu attaques presque toujours le même groupe. Ajoute un antagoniste ou du gainage pour mieux tenir la qualité globale et protéger la récup."
    });
  }

  if ((metrics.draft.objective || "muscle") === "force" && metrics.averageRest < 110) {
    alerts.push({
      id: "force-rest",
      tone: "info",
      title: "Objectif force = repos plus long",
      body: "Pour pousser plus lourd, Maya Coach recommande de rallonger les récupérations plutôt que d’empiler des reps fatiguées."
    });
  }

  if (!alerts.length) {
    alerts.push({
      id: "ready",
      tone: "success",
      title: "Séance propre et exploitable",
      body: `Structure cohérente: ${metrics.exercises.length} exercice(s), ${metrics.totalSets} séries et un niveau moyen ${metrics.averageLevel.toFixed(1)}/3. Tu peux la lancer telle quelle.`
    });
  }

  return alerts.slice(0, 4);
}

function findPreviousExercisePerformance(exerciseId) {
  for (const entry of state.history) {
    if (entry.type !== "training") continue;
    const previousExercise = (entry.exercises || []).find((exercise) => exercise.id === exerciseId);
    if (previousExercise) {
      return {
        entry,
        exercise: previousExercise
      };
    }
  }
  return null;
}

function findPreviousComparableSession(exerciseIds) {
  for (const entry of state.history) {
    if (entry.type !== "training") continue;
    const overlap = (entry.exercises || []).filter((exercise) => exerciseIds.includes(exercise.id)).length;
    if (overlap > 0) {
      return { entry, overlap };
    }
  }
  return null;
}

function compareExercises(exercises) {
  return exercises.map((exercise) => {
    const previous = findPreviousExercisePerformance(exercise.id);
    if (!previous) {
      return {
        ...exercise,
        comparison: {
          status: "first",
          label: "Première référence enregistrée",
          deltaVolume: exercise.repsCompleted,
          deltaSets: exercise.setsDone,
          previousDate: "",
          previousRepsCompleted: 0,
          previousSetsDone: 0
        }
      };
    }
    const deltaVolume = exercise.repsCompleted - (previous.exercise.repsCompleted || 0);
    const deltaSets = exercise.setsDone - (previous.exercise.setsDone || 0);
    const status = deltaVolume > 0 || deltaSets > 0
      ? "up"
      : deltaVolume < 0 || deltaSets < 0
        ? "down"
        : "equal";
    const label = status === "up"
      ? `Progression vs ${formatShortDate(previous.entry.date)}`
      : status === "down"
        ? `En dessous du ${formatShortDate(previous.entry.date)}`
        : `Stable vs ${formatShortDate(previous.entry.date)}`;
    return {
      ...exercise,
      comparison: {
        status,
        label,
        deltaVolume,
        deltaSets,
        previousDate: previous.entry.date,
        previousRepsCompleted: previous.exercise.repsCompleted || 0,
        previousSetsDone: previous.exercise.setsDone || 0
      }
    };
  });
}

function buildSessionComparison(exercises, volume) {
  const exerciseIds = exercises.map((exercise) => exercise.id);
  const comparable = findPreviousComparableSession(exerciseIds);
  const comparedExercises = exercises.filter((exercise) => exercise.comparison?.status && exercise.comparison.status !== "first");
  const improvedExercises = exercises.filter((exercise) => exercise.comparison?.status === "up").length;
  const regressedExercises = exercises.filter((exercise) => exercise.comparison?.status === "down").length;
  const stableExercises = exercises.filter((exercise) => exercise.comparison?.status === "equal").length;
  const previousVolume = comparable?.entry?.volume || 0;
  return {
    comparedExercises: comparedExercises.length,
    improvedExercises,
    regressedExercises,
    stableExercises,
    previousSessionDate: comparable?.entry?.date || "",
    previousSessionTitle: comparable?.entry?.title || "",
    previousSessionVolume: previousVolume,
    deltaTotalVolume: comparable ? volume - previousVolume : volume,
    overlapCount: comparable?.overlap || 0
  };
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
  if (entry.metadata?.noushiMode) {
    return entry.difficulty === "tenue"
      ? "NOUSHI terminé. Tu as tenu toute la séance: badge spécial en approche dans le suivi."
      : "NOUSHI t’a stoppé avant la ligne. Reviens plus frais et plus propre."
  }
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
  const comparedExercises = compareExercises(exercises);
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
    source: plan.metadata?.noushiMode || plan.inputs?.noushiMode
      ? "noushi-mode"
      : plan.inputs?.manual
      ? "manual"
      : plan.inputs?.quick
        ? "quick"
        : plan.inputs?.preferredExerciseId
          ? "focus"
          : "ia",
    type: "training",
    objective: plan.inputs?.goal || "muscle",
    zone: plan.inputs?.zone || "full",
    place: plan.inputs?.place || defaultCustomWorkoutDraft.place,
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
    exercises: comparedExercises,
    warmup: plan.warmup,
    finisher: plan.finisher,
    metadata: plan.metadata || null,
    feedback: null,
    coachNote: "",
    comparison: null
  };
  entry.comparison = buildSessionComparison(comparedExercises, volume);
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

export function buildNoushiChallengePlan(challengeId, requestedPlace = "mixte") {
  const challenge = getNoushiChallengeVariant(challengeId, requestedPlace);
  if (!challenge) return null;

  const blocks = (challenge.exercises || [])
    .map((exercise, index) => {
      const reps = exercise.pattern === "core"
        ? "35s"
        : exercise.pattern === "carry"
          ? "40s"
          : exercise.objectif.includes("force")
            ? "5-6"
            : exercise.niveau >= 3
              ? "6-8"
              : "8-10";
      const restSec = Math.max(exerciseRestGuess(exercise), exercise.niveau >= 3 ? 95 : 80) + (index === 0 ? 20 : 0);
      return {
        exerciseId: exercise.id,
        sets: index < 2 ? 4 : 3,
        reps,
        restSec,
        tempo: exercise.tempo
      };
    })
    .filter(Boolean);

  if (!blocks.length) return null;

  const plan = {
    id: uid("plan"),
    createdAt: new Date().toISOString(),
    title: `NOUSHI • ${challenge.nom}`,
    inputs: {
      time: challenge.temps || 40,
      place: challenge.effectivePlace || challenge.place || "mixte",
      zone: challenge.zone || "full",
      goal: challenge.objectif || "force",
      energy: "high",
      level: "3",
      cycleWeek: state.cycleState.cycleWeek,
      noushiMode: true
    },
    warmup: [
      "3 min montée de température",
      String(challenge.prep || "Activation spécifique haute tension"),
      "1 série technique par mouvement principal"
    ],
    blocks,
    finisher: "Aucun confort: marche lente, respiration contrôlée et feedback immédiat.",
    coachReasoning: [
      String(challenge.promesse || "Défi NOUSHI à forte exigence technique."),
      String(challenge.mantra || "Tu es venu pour finir la séance complète."),
      "Le badge spécial se débloque uniquement si la séance est tenue sans abandon."
    ],
    estimatedDurationMin: 0
  };
  plan.estimatedDurationMin = estimateDuration(plan);
  plan.metadata = {
    dominantPattern: challenge.zone || "full",
    objective: challenge.objectif || "force",
    totalSets: sum(blocks.map((block) => block.sets)),
    fatigueLoad: 94,
    coherenceScore: 96,
    cycleWeek: state.cycleState.cycleWeek,
    noushiMode: true,
    badgeKey: "noushi-complete",
    challengeId: challenge.id,
    challengePlace: challenge.effectivePlace || challenge.place || "mixte",
    justification: [
      `Challenge ${challenge.nom} prêt.`,
      challenge.mantra || "Reste propre malgré la fatigue.",
      "Badge spécial lié à la complétion intégrale."
    ]
  };
  return plan;
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
  if (state.postWorkoutId) {
    return state.history.find((entry) => entry.id === state.postWorkoutId) || null;
  }
  return state.history.find((entry) => entry.type === "training") || null;
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
  const aiVsQuick = { ia: 0, quick: 0, focus: 0, manual: 0 };
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
    if (entry.source === "manual") aiVsQuick.manual += 1;
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
