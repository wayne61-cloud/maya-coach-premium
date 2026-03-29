import { EXO_BY_ID, EXOS } from "../catalog.js";
import { defaultCustomWorkoutDraft, state } from "../state.js";
import { getLatestPostWorkoutEntry } from "../workout.js";
import { buildEmptyState, escapeHtml, formatShortDate } from "../utils.js";

function groupedExercises() {
  return [
    ["Maison", EXOS.filter((exercise) => exercise.pole === "maison")],
    ["Salle", EXOS.filter((exercise) => exercise.pole === "salle")],
    ["Mixte", EXOS.filter((exercise) => exercise.pole === "mixte")]
  ];
}

function renderExerciseOptions(selectedId) {
  return groupedExercises().map(([label, exercises]) => `
    <optgroup label="${escapeHtml(label)}">
      ${exercises.map((exercise) => `
        <option value="${escapeHtml(exercise.id)}" ${exercise.id === selectedId ? "selected" : ""}>
          ${escapeHtml(exercise.nom)} • ${escapeHtml(exercise.muscle)}
        </option>
      `).join("")}
    </optgroup>
  `).join("");
}

function comparisonPillClass(status) {
  if (status === "up") return "pill-success";
  if (status === "down") return "pill-alert";
  if (status === "equal") return "pill-calm";
  return "";
}

function comparisonLabel(status) {
  if (status === "up") return "Progression";
  if (status === "down") return "En retrait";
  if (status === "equal") return "Stable";
  return "Nouvelle réf";
}

function renderComparisonDelta(exercise) {
  const comparison = exercise.comparison || {};
  if (comparison.status === "first") {
    return `<div class="muted">Première séance enregistrée sur cet exercice.</div>`;
  }
  const volumePrefix = comparison.deltaVolume > 0 ? "+" : "";
  const setPrefix = comparison.deltaSets > 0 ? "+" : "";
  return `
    <div class="muted">
      ${escapeHtml(comparison.label)} • ${volumePrefix}${comparison.deltaVolume || 0} reps • ${setPrefix}${comparison.deltaSets || 0} séries
    </div>
    <div class="muted">Référence précédente: ${comparison.previousRepsCompleted || 0} reps • ${comparison.previousSetsDone || 0} séries</div>
  `;
}

function renderLatestResult(latest) {
  const summary = latest.comparison || {};
  const deltaPrefix = summary.deltaTotalVolume > 0 ? "+" : "";
  return `
    <div class="card module-stats glow-blue">
      <div class="eyebrow">Fiche résultat final</div>
      <h3>${escapeHtml(latest.title)}</h3>
      <p class="muted">Durée réelle ${latest.durationRealMin} min • Charge ${escapeHtml(latest.trainingLoad)} • Difficulté ${escapeHtml(latest.difficulty)}</p>
      <div class="stats-grid">
        <div class="stat-box stat-box-blue"><div class="stat-label">Volume total</div><div class="stat-value">${latest.volume}</div></div>
        <div class="stat-box stat-box-green"><div class="stat-label">Séries</div><div class="stat-value">${latest.completedSets}</div></div>
        <div class="stat-box stat-box-coral"><div class="stat-label">Exos en hausse</div><div class="stat-value">${summary.improvedExercises || 0}</div></div>
        <div class="stat-box stat-box-blue"><div class="stat-label">Delta session</div><div class="stat-value">${deltaPrefix}${summary.deltaTotalVolume || 0}</div></div>
      </div>
      <div class="helper-note info-note">
        ${summary.previousSessionDate
          ? `Comparaison à la séance du ${escapeHtml(formatShortDate(summary.previousSessionDate))} • ${summary.overlapCount || 0} exos en commun • volume précédent ${summary.previousSessionVolume || 0}`
          : "Pas encore de séance comparable dans l’historique. Cette séance devient ta première référence."}
      </div>
      <div class="list" style="margin-top: 10px;">
        ${(latest.exercises || []).map((exercise) => `
          <div class="exercise-card">
            <div class="exercise-head">
              <div>
                <div class="exercise-title">${escapeHtml(exercise.nom)}</div>
                <div class="exercise-meta">
                  <span class="pill">${exercise.setsDone}/${exercise.setsPlanned} séries</span>
                  <span class="pill">${exercise.repsCompleted} reps</span>
                  <span class="pill ${comparisonPillClass(exercise.comparison?.status)}">${escapeHtml(comparisonLabel(exercise.comparison?.status))}</span>
                </div>
              </div>
            </div>
            ${renderComparisonDelta(exercise)}
          </div>
        `).join("")}
      </div>
      <div class="actions-row two" style="margin-top: 10px;">
        <button class="btn btn-soft" data-action="go-page" data-page="history">Ouvrir le pôle progression</button>
        <button class="btn btn-outline" data-action="replay-session" data-id="${latest.id}">Refaire cette séance</button>
      </div>
      <div class="session-actions" style="margin-top: 10px;">
        <button class="btn btn-good" data-action="apply-feedback" data-id="${latest.id}" data-feedback="facile">Facile</button>
        <button class="btn btn-main" data-action="apply-feedback" data-id="${latest.id}" data-feedback="ok">OK</button>
        <button class="btn btn-warn" data-action="apply-feedback" data-id="${latest.id}" data-feedback="dur">Dur</button>
      </div>
    </div>
  `;
}

function renderCustomBuilder() {
  const draft = state.customWorkoutDraft || structuredClone(defaultCustomWorkoutDraft);
  return `
    <div class="card module-exos glow-coral">
      <div class="eyebrow">Séance personnalisée</div>
      <h3>Construire ma propre séance</h3>
      <p class="muted">Choisis toi-même les exercices, le nombre de séries, les reps et le repos. Le suivi live et la comparaison à la dernière fois restent actifs.</p>

      <div class="settings-grid compact-grid" style="margin-top: 10px;">
        <div class="field-stack full-span">
          <label class="field-label" for="customWorkoutTitle">Nom de la séance</label>
          <div class="field-shell surface-form">
            <input id="customWorkoutTitle" data-custom-workout-field="title" type="text" value="${escapeHtml(draft.title || "")}" placeholder="Upper 1, Full body du lundi..." />
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="customWorkoutObjective">Objectif</label>
          <div class="field-shell surface-form">
            <select id="customWorkoutObjective" data-custom-workout-field="objective">
              ${["muscle", "force", "endurance", "seche"].map((goal) => `<option value="${goal}" ${draft.objective === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="customWorkoutPlace">Lieu</label>
          <div class="field-shell surface-form">
            <select id="customWorkoutPlace" data-custom-workout-field="place">
              ${["maison", "salle", "mixte"].map((place) => `<option value="${place}" ${draft.place === place ? "selected" : ""}>${escapeHtml(place)}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>

      <div class="list" style="margin-top: 12px;">
        ${(draft.blocks || []).map((block, index) => `
          <div class="custom-block-card">
            <div class="exercise-head">
              <div>
                <div class="exercise-title">Bloc ${index + 1}</div>
                <div class="muted">Prescription manuelle</div>
              </div>
              <button class="btn btn-outline" data-action="remove-custom-block" data-id="${escapeHtml(block.id)}" ${(draft.blocks || []).length <= 1 ? "disabled" : ""}>Retirer</button>
            </div>

            <div class="settings-grid compact-grid">
              <div class="field-stack full-span">
                <label class="field-label" for="customExercise-${escapeHtml(block.id)}">Exercice</label>
                <div class="field-shell surface-form">
                  <select id="customExercise-${escapeHtml(block.id)}" data-custom-block-id="${escapeHtml(block.id)}" data-custom-block-field="exerciseId">
                    ${renderExerciseOptions(block.exerciseId)}
                  </select>
                </div>
              </div>
              <div class="field-stack">
                <label class="field-label" for="customSets-${escapeHtml(block.id)}">Séries</label>
                <div class="field-shell surface-form">
                  <input id="customSets-${escapeHtml(block.id)}" data-custom-block-id="${escapeHtml(block.id)}" data-custom-block-field="sets" type="number" min="1" max="8" value="${escapeHtml(block.sets)}" />
                </div>
              </div>
              <div class="field-stack">
                <label class="field-label" for="customReps-${escapeHtml(block.id)}">Reps / durée</label>
                <div class="field-shell surface-form">
                  <input id="customReps-${escapeHtml(block.id)}" data-custom-block-id="${escapeHtml(block.id)}" data-custom-block-field="reps" type="text" value="${escapeHtml(block.reps)}" placeholder="10-12 ou 30s" />
                </div>
              </div>
              <div class="field-stack full-span">
                <label class="field-label" for="customRest-${escapeHtml(block.id)}">Repos (sec)</label>
                <div class="field-shell surface-form">
                  <input id="customRest-${escapeHtml(block.id)}" data-custom-block-id="${escapeHtml(block.id)}" data-custom-block-field="restSec" type="number" min="20" max="240" value="${escapeHtml(block.restSec)}" />
                </div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="actions-row three" style="margin-top: 12px;">
        <button class="btn btn-soft" data-action="add-custom-block">Ajouter un exercice</button>
        <button class="btn btn-outline" data-action="reset-custom-workout">Réinitialiser</button>
        <button class="btn btn-main" data-action="start-custom-workout">Démarrer ma séance</button>
      </div>
    </div>
  `;
}

export function renderWorkout(node) {
  if (!state.workout) {
    const latest = getLatestPostWorkoutEntry();
    node.innerHTML = `
      <div class="section">
        ${latest ? renderLatestResult(latest) : `
          <div class="card">
            ${buildEmptyState("Aucune séance en cours", "Génère une séance IA, crée ta séance personnalisée ou repars d'un exercice.", "Générer avec IA", "go-ia")}
          </div>
        `}
        ${renderCustomBuilder()}
      </div>
    `;
    return;
  }

  const workout = state.workout;
  const block = workout.plan.blocks[workout.exerciseIndex];
  const exercise = EXO_BY_ID.get(block.exerciseId);
  const progress = workout.progress[workout.exerciseIndex];
  const currentSet = Math.min(progress.completedSets + 1, block.sets);

  node.innerHTML = `
    <div class="section">
      <div class="card module-coach glow-gold">
        <div class="pill">Exercice ${workout.exerciseIndex + 1} / ${workout.plan.blocks.length}</div>
        <div class="workout-focus">${escapeHtml(exercise.nom)}</div>
        <div class="workout-sub">Série ${currentSet} / ${block.sets} • Cible ${escapeHtml(block.reps)} • Tempo ${escapeHtml(block.tempo)}</div>
        <div class="plan-block">
          <div class="plan-title">Mode séance live</div>
          <div class="muted">Repos affiché: ${workout.phase === "rest" ? `${workout.restRemaining}s` : `${block.restSec}s`}</div>
          <div class="muted">Progression: ${progress.completedSets}/${block.sets} séries • ${progress.repsCompleted} cumulés</div>
          <div class="muted">${escapeHtml(exercise.setup)}</div>
        </div>
        <details>
          <summary>Rappels techniques</summary>
          <div class="coach-grid">
            <div><strong>Checkpoints</strong><br>${exercise.checkpoints.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
            <div><strong>Erreurs fréquentes</strong><br>${exercise.erreursFrequentes.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
          </div>
        </details>
      </div>
      <div class="card">
        <div class="session-actions">
          <button class="btn btn-good" data-action="workout-done">Fait</button>
          <button class="btn btn-soft" data-action="open-modify-workout">Modifier</button>
          <button class="btn btn-warn" data-action="workout-skip">Passer</button>
        </div>
        <button class="btn btn-bad" style="margin-top: 10px; width: 100%;" data-action="finish-workout-now">Terminer maintenant</button>
      </div>
    </div>
  `;
}
