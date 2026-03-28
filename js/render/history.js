import { state } from "../state.js";
import { computeDashboardStats } from "../workout.js";
import { buildEmptyState, dayKey, escapeHtml, formatDateTime } from "../utils.js";

function renderCalendar() {
  const activeDates = new Set(state.history.map((entry) => dayKey(entry.date)));
  const now = new Date();
  const cells = [];
  for (let index = 27; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = dayKey(date);
    const isActive = activeDates.has(key);
    cells.push(`
      <div class="calendar-cell ${isActive ? "active" : ""}">
        <span>${date.getDate()}/${date.getMonth() + 1}</span>
        ${isActive ? '<span class="calendar-dot"></span>' : ""}
      </div>
    `);
  }
  return cells.join("");
}

export function renderHistory(node) {
  const stats = computeDashboardStats();
  const items = state.history;

  node.innerHTML = `
    <div class="section">
      <div class="card">
        <h2>Historique premium</h2>
        <p class="muted">Chaque entrée garde source, charge, durée réelle, volume, feedback, coach note et actions de relance.</p>
        <div class="calendar-grid">${renderCalendar()}</div>
      </div>

      <div class="card">
        <h3>Raccourcis historiques</h3>
        <div class="coach-grid">
          <div><strong>Séances total:</strong> ${stats.totalSessions}</div>
          <div><strong>IA / Focus / Quick:</strong> ${stats.aiVsQuick.ia} / ${stats.aiVsQuick.focus} / ${stats.aiVsQuick.quick}</div>
          <div><strong>NOUSHI / Relax:</strong> ${stats.sessionsByType.noushi || 0} / ${stats.sessionsByType.relax || 0}</div>
        </div>
      </div>

      <div class="list">
        ${items.length ? items.map((entry) => `
          <article class="exercise-card">
            <div class="exercise-head">
              <div>
                <div class="exercise-title">${escapeHtml(entry.title)}</div>
                <div class="exercise-meta">
                  <span class="pill">${escapeHtml(entry.type)}</span>
                  <span class="pill">${escapeHtml(entry.source)}</span>
                  <span class="pill">${entry.durationRealMin || entry.durationMin} min</span>
                  <span class="pill">${escapeHtml(entry.trainingLoad || "low")}</span>
                </div>
              </div>
              <button class="icon-btn ${state.favorites.has(`session:${entry.id}`) ? "active" : ""}" data-action="toggle-favorite" data-type="session" data-id="${entry.id}">⭐</button>
            </div>

            <div class="coach-grid">
              <div><strong>Date:</strong> ${escapeHtml(formatDateTime(entry.date))}</div>
              <div><strong>Objectif:</strong> ${escapeHtml(entry.objective || "-")} • Zone ${escapeHtml(entry.zone || "-")} • Lieu ${escapeHtml(entry.place || "-")}</div>
              <div><strong>Durée réelle:</strong> ${entry.durationRealMin || entry.durationMin} min • Séries terminées ${entry.seriesTerminees || entry.completedSets || 0} • Volume ${entry.volume || 0}</div>
              <div><strong>Feedback:</strong> ${escapeHtml(entry.feedback || "-")} • RPE ${entry.difficultyRpe || "-"} • Coach note ${escapeHtml(entry.coachNote || "-")}</div>
            </div>

            <div class="actions-row two">
              ${entry.type === "training" ? `
                <button class="btn btn-main" data-action="replay-session" data-id="${entry.id}">Refaire cette séance</button>
                <button class="btn btn-soft" data-action="adapt-session" data-id="${entry.id}">Adapter avec IA</button>
                <button class="btn btn-outline" data-action="duplicate-session" data-id="${entry.id}" data-mode="harder">Version plus dure</button>
                <button class="btn btn-outline" data-action="duplicate-session" data-id="${entry.id}" data-mode="shorter">Version plus courte</button>
              ` : `
                <button class="btn btn-soft" data-action="go-page" data-page="${entry.type === "noushi" ? "noushi" : "relax"}">Relancer ce module</button>
              `}
            </div>

            <details>
              <summary>Voir détails</summary>
              <div class="coach-grid">
                <div><strong>Matériel:</strong> ${escapeHtml((entry.equipmentUsed || []).join(", ") || "Aucun")}</div>
                <div><strong>Metadata coach:</strong><br>${(entry.metadata?.justification || []).map((item) => `• ${escapeHtml(item)}`).join("<br>") || "Aucune"}</div>
                ${(entry.exercises || []).length ? `<div><strong>Exercices</strong><br>${entry.exercises.map((exercise) => `• ${escapeHtml(exercise.nom)} — ${exercise.setsDone}/${exercise.setsPlanned} séries • ${exercise.repsCompleted} reps`).join("<br>")}</div>` : "<div><strong>Protocole recovery</strong><br>Entrée non-training, comptée dans les stats et le streak.</div>"}
              </div>
            </details>
          </article>
        `).join("") : buildEmptyState("Historique vide", "Fais ta première séance ou lance un protocole NOUSHI / Relax pour démarrer les stats.", "Générer une séance", "go-ia")}
      </div>
    </div>
  `;
}
