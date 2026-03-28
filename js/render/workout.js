import { EXO_BY_ID } from "../catalog.js";
import { state } from "../state.js";
import { getLatestPostWorkoutEntry } from "../workout.js";
import { buildEmptyState, escapeHtml } from "../utils.js";

export function renderWorkout(node) {
  if (!state.workout) {
    const latest = getLatestPostWorkoutEntry();
    if (!latest) {
      node.innerHTML = `
        <div class="section">
          <div class="card">
            ${buildEmptyState("Aucune séance en cours", "Génère une séance IA, lance une séance rapide ou repars d'un exercice.", "Générer avec IA", "go-ia")}
          </div>
        </div>
      `;
      return;
    }

    node.innerHTML = `
      <div class="section">
        <div class="card">
          <h3>Résumé séance</h3>
          <p class="muted">${escapeHtml(latest.title)}</p>
          <p class="muted">Durée réelle ${latest.durationRealMin} min • Charge ${escapeHtml(latest.trainingLoad)} • Difficulté ${escapeHtml(latest.difficulty)}</p>
          <div class="coach-grid">
            <div><strong>Volume:</strong> ${latest.volume} • séries terminées ${latest.completedSets}</div>
            <div><strong>Coach note:</strong> ${escapeHtml(latest.coachNote)}</div>
            ${(latest.exercises || []).map((exercise) => `<div>• ${escapeHtml(exercise.nom)} — ${exercise.setsDone}/${exercise.setsPlanned} séries • ${exercise.repsCompleted}</div>`).join("")}
          </div>
        </div>
        <div class="card">
          <h3>Feedback post-séance</h3>
          <div class="session-actions">
            <button class="btn btn-good" data-action="apply-feedback" data-id="${latest.id}" data-feedback="facile">Facile</button>
            <button class="btn btn-main" data-action="apply-feedback" data-id="${latest.id}" data-feedback="ok">OK</button>
            <button class="btn btn-warn" data-action="apply-feedback" data-id="${latest.id}" data-feedback="dur">Dur</button>
          </div>
          <div class="actions-row two" style="margin-top: 10px;">
            <button class="btn btn-soft" data-action="go-page" data-page="history">Voir l'historique</button>
            <button class="btn btn-outline" data-action="go-page" data-page="ia">Nouvelle séance IA</button>
          </div>
        </div>
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
      <div class="card">
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
