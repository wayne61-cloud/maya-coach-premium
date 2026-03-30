import { getSharedDashboardData } from "../insights.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, formatDateTime, formatShortDate } from "../utils.js";
import { icon, renderActivityHeatmap, renderActivityRings, renderCountup, renderMiniAreaChart } from "../ui.js";

function renderBadgeBoard(shared) {
  return `
    <div class="card module-stats progress-badge-card">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Badges</div>
          <h3>Récompenses compactes</h3>
        </div>
        <span class="pill pill-success">${shared.badges.filter((badge) => badge.unlocked).length} débloqués</span>
      </div>

      <div class="badge-grid progress-badge-grid">
        ${shared.badges.map((badge) => `
          <div class="badge-card ${badge.unlocked ? "unlocked" : "locked"} progress-badge-item">
            <div class="badge-mark">${icon(badge.icon, "", 16)}</div>
            <div class="badge-copy">
              <strong>${escapeHtml(badge.title)}</strong>
              <span>${escapeHtml(badge.detail)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderHistoryEntry(entry) {
  const isTraining = entry.type === "training";

  return `
    <article class="exercise-card history-entry-card progress-entry-card">
      <div class="exercise-head">
        <div>
          <div class="exercise-title">${escapeHtml(entry.title)}</div>
          <div class="exercise-meta">
            <span class="pill">${escapeHtml(entry.type)}</span>
            <span class="pill">${entry.durationRealMin || entry.durationMin || 0} min</span>
            <span class="pill">${escapeHtml(entry.trainingLoad || "low")}</span>
          </div>
        </div>
        <button class="icon-btn ${state.favorites.has(`session:${entry.id}`) ? "active" : ""}" data-action="toggle-favorite" data-type="session" data-id="${entry.id}">⭐</button>
      </div>

      <div class="progress-entry-meta">
        <span>${icon("calendar", "", 14)} ${escapeHtml(formatDateTime(entry.date))}</span>
        <span>${icon("target", "", 14)} ${escapeHtml(entry.objective || "-")} • ${escapeHtml(entry.zone || "-")}</span>
        <span>${icon("bolt", "", 14)} ${entry.volume || 0} volume</span>
        <span>${icon("moon", "", 14)} ${escapeHtml(entry.coachNote || "Aucune note coach")}</span>
      </div>

      ${entry.comparison ? `
        <div class="helper-note ${entry.comparison.improvedExercises > 0 ? "success-note" : "calm-note"}">
          ${entry.comparison.previousSessionDate
            ? `Vs ${escapeHtml(formatShortDate(entry.comparison.previousSessionDate))}: ${entry.comparison.improvedExercises || 0} exo(s) en hausse • delta ${entry.comparison.deltaTotalVolume > 0 ? "+" : ""}${entry.comparison.deltaTotalVolume || 0}.`
            : "Première séance de référence sur ce format."}
        </div>
      ` : ""}

      ${isTraining ? `
        <div class="feedback-strip">
          <button class="feedback-chip ${entry.feedback === "dur" ? "active feedback-hard" : ""}" data-action="apply-feedback" data-id="${entry.id}" data-feedback="dur">Trop dur</button>
          <button class="feedback-chip ${entry.feedback === "ok" ? "active feedback-good" : ""}" data-action="apply-feedback" data-id="${entry.id}" data-feedback="ok">Bien dosé</button>
          <button class="feedback-chip ${entry.feedback === "facile" ? "active feedback-easy" : ""}" data-action="apply-feedback" data-id="${entry.id}" data-feedback="facile">Trop facile</button>
        </div>
      ` : ""}

      <div class="actions-row two">
        ${isTraining ? `
          <button class="btn btn-main" data-action="replay-session" data-id="${entry.id}">Refaire</button>
          <button class="btn btn-soft" data-action="adapt-session" data-id="${entry.id}">Adapter</button>
          <button class="btn btn-outline" data-action="duplicate-session" data-id="${entry.id}" data-mode="harder">Plus dure</button>
          <button class="btn btn-outline" data-action="duplicate-session" data-id="${entry.id}" data-mode="shorter">Plus courte</button>
        ` : `
          <button class="btn btn-soft" data-action="go-page" data-page="${entry.type === "noushi" ? "noushi" : "relax"}">Relancer ce module</button>
        `}
      </div>
    </article>
  `;
}

export function renderHistory(node) {
  const shared = getSharedDashboardData();
  const entries = state.history.slice(0, 8);

  node.innerHTML = `
    <div class="section progress-screen">
      <div class="card module-stats progress-overview-card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Suivi</div>
            <h2>Progression connectée</h2>
            <p class="muted">Rings compacts, heatmap réelle, mini-chart et badges denses reliés à l’historique.</p>
          </div>
          <span class="pill">${shared.stats.totalSessions} entrées</span>
        </div>

        <div class="progress-overview-grid">
          ${renderActivityRings({
            centerValue: renderCountup(shared.weeklySummary.trainingSessions, { suffix: "" }),
            centerLabel: "séances",
            centerCaption: "cette semaine",
            rings: [
              {
                tone: "brand",
                label: "Sessions",
                valueLabel: `${shared.weeklySummary.trainingSessions}/${shared.sessionTarget}`,
                value: shared.weeklySummary.trainingSessions,
                max: shared.sessionTarget
              },
              {
                tone: "blue",
                label: "Minutes",
                valueLabel: `${shared.weeklySummary.minutes}/${shared.minutesTarget}`,
                value: shared.weeklySummary.minutes,
                max: shared.minutesTarget
              },
              {
                tone: "green",
                label: "Fuel",
                valueLabel: `${shared.fuelRatio}%`,
                value: shared.fuelRatio,
                max: 100
              }
            ]
          })}

          <div class="progress-mini-grid">
            <div class="data-pill-card">
              <span class="data-pill-label">${icon("bolt", "", 14)} Volume semaine</span>
              <strong class="data-pill-value">${renderCountup(shared.weeklySummary.volume, { suffix: "" })}</strong>
              <small>${shared.weeklySummary.minutes} minutes actives</small>
            </div>
            <div class="data-pill-card">
              <span class="data-pill-label">${icon("moon", "", 14)} Recovery</span>
              <strong class="data-pill-value">${renderCountup(shared.recoveryScore, { suffix: "%" })}</strong>
              <small>${shared.weeklySummary.recoverySessions} modules cette semaine</small>
            </div>
            <div class="data-pill-card">
              <span class="data-pill-label">${icon("scale", "", 14)} Poids</span>
              <strong class="data-pill-value">${escapeHtml(shared.weightEvolution.currentWeightKg ? `${shared.weightEvolution.currentWeightKg} kg` : "--")}</strong>
              <small>${escapeHtml(shared.weightEvolution.label)}</small>
            </div>
            <div class="data-pill-card">
              <span class="data-pill-label">${icon("badge", "", 14)} Badges</span>
              <strong class="data-pill-value">${renderCountup(shared.badges.filter((badge) => badge.unlocked).length, { suffix: "" })}</strong>
              <small>${shared.stats.streak} jours de streak</small>
            </div>
          </div>
        </div>
      </div>

      <div class="card module-stats progress-heatmap-card">
        ${renderActivityHeatmap(state.history, { days: 84, title: "Heatmap d’activité" })}
      </div>

      <div class="card module-stats">
        ${renderMiniAreaChart(shared.progressPoints, {
          title: "Courbe de progression",
          subtitle: "Volume utile, densité et durée des dernières séances training.",
          tone: "blue"
        })}
      </div>

      ${renderBadgeBoard(shared)}

      <div class="list">
        ${entries.length
          ? entries.map(renderHistoryEntry).join("")
          : buildEmptyState("Aucune activité suivie", "Lance une première séance ou un premier module recovery pour activer la progression.", "Générer une séance", "go-ia")}
      </div>
    </div>
  `;
}
