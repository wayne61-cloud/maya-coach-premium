import { getWeightEvolution } from "../recommendations.js";
import { state } from "../state.js";
import { computeDashboardStats } from "../workout.js";
import { buildEmptyState, clamp, dayKey, escapeHtml, formatDateTime, formatShortDate, sameWeek } from "../utils.js";

function getTrainingEntries() {
  return state.history.filter((entry) => entry.type === "training");
}

function getWeeklySummary() {
  const weeklyEntries = state.history.filter((entry) => sameWeek(entry.date, new Date()));
  return {
    weeklyEntries,
    minutes: weeklyEntries.reduce((total, entry) => total + (entry.durationRealMin || entry.durationMin || 0), 0),
    calories: weeklyEntries.reduce((total, entry) => total + (entry.caloriesEstimate || 0), 0)
  };
}

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

function renderRing({ ratio, radius, strokeWidth, className }) {
  const normalizedRatio = clamp(ratio, 0, 1);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalizedRatio);
  return `
    <circle class="ring-track" cx="70" cy="70" r="${radius}" stroke-width="${strokeWidth}"></circle>
    <circle
      class="ring-progress ${className}"
      cx="70"
      cy="70"
      r="${radius}"
      stroke-width="${strokeWidth}"
      stroke-dasharray="${circumference.toFixed(2)}"
      stroke-dashoffset="${dashOffset.toFixed(2)}">
    </circle>
  `;
}

function renderHistoryRings(stats) {
  const weekly = getWeeklySummary();
  const sessionTarget = Math.max(2, parseInt(state.profile?.frequency || "3", 10));
  const minuteTarget = Math.max(90, sessionTarget * parseInt(state.profile?.sessionTime || "35", 10));
  const calorieTarget = Math.max(450, sessionTarget * 220);
  const caloriesRatio = weekly.calories / calorieTarget;
  const sessionsRatio = stats.weekSessions / sessionTarget;
  const regularityRatio = (stats.nutritionRegularity.score || 0) / 100;

  return `
    <div class="history-ring-board">
      <div class="history-ring-visual">
        <svg viewBox="0 0 140 140" class="history-ring-svg" aria-hidden="true">
          ${renderRing({ ratio: caloriesRatio, radius: 56, strokeWidth: 10, className: "ring-progress-coral" })}
          ${renderRing({ ratio: sessionsRatio, radius: 42, strokeWidth: 10, className: "ring-progress-green" })}
          ${renderRing({ ratio: regularityRatio, radius: 28, strokeWidth: 10, className: "ring-progress-blue" })}
        </svg>
        <div class="history-ring-center">
          <span class="history-ring-kicker">Semaine</span>
          <strong>${stats.weekSessions}</strong>
          <span class="muted">séances</span>
        </div>
      </div>

      <div class="history-ring-legend">
        <div class="history-ring-stat">
          <span class="history-ring-dot ring-progress-coral"></span>
          <div>
            <strong>${Math.round(weekly.calories)}</strong>
            <span class="muted">kcal / ${Math.round(calorieTarget)}</span>
          </div>
        </div>
        <div class="history-ring-stat">
          <span class="history-ring-dot ring-progress-green"></span>
          <div>
            <strong>${stats.weekSessions}</strong>
            <span class="muted">séances / ${sessionTarget}</span>
          </div>
        </div>
        <div class="history-ring-stat">
          <span class="history-ring-dot ring-progress-blue"></span>
          <div>
            <strong>${stats.nutritionRegularity.score}%</strong>
            <span class="muted">régularité</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderProgressChart(entries) {
  if (entries.length < 2) {
    return `
      <div class="history-chart-card">
        <div class="history-chart-head">
          <div>
            <h3>Courbe de progression</h3>
            <p class="muted">Basée sur le volume utile, la densité et la durée de tes dernières séances training.</p>
          </div>
          <span class="pill pill-calm">8 dernières</span>
        </div>
        <div class="helper-note calm-note">Deux séances training sont nécessaires pour afficher une vraie courbe de progression.</div>
      </div>
    `;
  }

  const chartEntries = entries.slice(0, 8).reverse();
  const values = chartEntries.map((entry) => Math.max(entry.volume || 0, (entry.completedSets || 0) * 8, (entry.durationRealMin || entry.durationMin || 0) * 3));
  const max = Math.max(1, ...values);
  const width = 320;
  const height = 160;
  const padX = 18;
  const padY = 18;
  const stepX = (width - padX * 2) / Math.max(1, chartEntries.length - 1);
  const points = chartEntries.map((entry, index) => {
    const x = padX + index * stepX;
    const y = height - padY - ((values[index] / max) * (height - padY * 2));
    return {
      x,
      y,
      label: formatShortDate(entry.date),
      value: values[index],
      entry
    };
  });
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - padY).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - padY).toFixed(2)} Z`;

  return `
    <div class="history-chart-card">
      <div class="history-chart-head">
        <div>
          <h3>Courbe de progression</h3>
          <p class="muted">Basée sur le volume utile, la densité et la durée de tes dernières séances training.</p>
        </div>
        <span class="pill pill-calm">8 dernières</span>
      </div>

      <svg class="history-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <path class="history-chart-area" d="${areaPath}"></path>
        <path class="history-chart-line" d="${linePath}"></path>
        ${points.map((point) => `<circle class="history-chart-dot" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4"></circle>`).join("")}
      </svg>

      <div class="history-chart-labels">
        ${points.map((point) => `<div class="history-chart-label"><strong>${escapeHtml(point.label)}</strong><span>${Math.round(point.value)}</span></div>`).join("")}
      </div>
    </div>
  `;
}

function buildBadges(stats) {
  const recoveryCount = (stats.sessionsByType.noushi || 0) + (stats.sessionsByType.relax || 0);
  const activeWeeks = stats.weekSeries.filter((week) => week.count > 0).length;
  return [
    {
      key: "first-session",
      code: "1X",
      title: "Premier move",
      detail: "Débloqué après la première séance enregistrée.",
      unlocked: stats.totalSessions >= 1
    },
    {
      key: "ten-sessions",
      code: "10",
      title: "Série solide",
      detail: "10 séances ou plus dans l’historique.",
      unlocked: stats.totalSessions >= 10
    },
    {
      key: "streak-7",
      code: "7D",
      title: "Streak 7 jours",
      detail: "7 jours d’affilée avec activité comptée.",
      unlocked: stats.streak >= 7
    },
    {
      key: "three-weeks",
      code: "3W",
      title: "Rythme stable",
      detail: "3 semaines actives ou plus sur les 6 dernières.",
      unlocked: activeWeeks >= 3
    },
    {
      key: "recovery",
      code: "RC",
      title: "Recovery flow",
      detail: "3 modules NOUSHI / Relax ou plus.",
      unlocked: recoveryCount >= 3
    },
    {
      key: "nutrition",
      code: "NT",
      title: "Fuel stable",
      detail: "Régularité nutrition à 60% ou plus.",
      unlocked: stats.nutritionRegularity.score >= 60
    }
  ];
}

function renderBadges(stats) {
  const badges = buildBadges(stats);
  return `
    <div class="history-badge-board">
      <div class="history-chart-head">
        <div>
          <h3>Badges progression</h3>
          <p class="muted">Un esprit Apple Forme: récompenses visuelles, simples à scanner et liées aux vrais comportements.</p>
        </div>
        <span class="pill pill-success">${badges.filter((badge) => badge.unlocked).length} débloqués</span>
      </div>

      <div class="badge-grid">
        ${badges.map((badge) => `
          <div class="badge-card ${badge.unlocked ? "unlocked" : "locked"}">
            <div class="badge-mark">${escapeHtml(badge.code)}</div>
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
  return `
    <article class="exercise-card history-entry-card">
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

      <div class="history-entry-grid">
        <div><strong>Date:</strong> ${escapeHtml(formatDateTime(entry.date))}</div>
        <div><strong>Objectif:</strong> ${escapeHtml(entry.objective || "-")} • Zone ${escapeHtml(entry.zone || "-")}</div>
        <div><strong>Volume:</strong> ${entry.volume || 0} • Séries ${entry.seriesTerminees || entry.completedSets || 0}</div>
        <div><strong>Coach note:</strong> ${escapeHtml(entry.coachNote || "-")}</div>
      </div>

      ${entry.type === "training" ? `
        <div class="feedback-strip">
          <button class="feedback-chip ${entry.feedback === "dur" ? "active feedback-hard" : ""}" data-action="apply-feedback" data-id="${entry.id}" data-feedback="dur">Trop dur</button>
          <button class="feedback-chip ${entry.feedback === "ok" ? "active feedback-good" : ""}" data-action="apply-feedback" data-id="${entry.id}" data-feedback="ok">Bien dosé</button>
          <button class="feedback-chip ${entry.feedback === "facile" ? "active feedback-easy" : ""}" data-action="apply-feedback" data-id="${entry.id}" data-feedback="facile">Trop facile</button>
        </div>
      ` : ""}

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
          <div><strong>Feedback:</strong> ${escapeHtml(entry.feedback || "-")} • RPE ${entry.difficultyRpe || "-"} • Difficulté ${escapeHtml(entry.difficulty || "-")}</div>
          <div><strong>Metadata coach:</strong><br>${(entry.metadata?.justification || []).map((item) => `• ${escapeHtml(item)}`).join("<br>") || "Aucune"}</div>
          ${(entry.exercises || []).length ? `<div><strong>Exercices</strong><br>${entry.exercises.map((exercise) => `• ${escapeHtml(exercise.nom)} — ${exercise.setsDone}/${exercise.setsPlanned} séries • ${exercise.repsCompleted} reps`).join("<br>")}</div>` : "<div><strong>Protocole recovery</strong><br>Entrée non-training, comptée dans les stats et le streak.</div>"}
        </div>
      </details>
    </article>
  `;
}

export function renderHistory(node) {
  const stats = computeDashboardStats();
  const items = state.history;
  const trainingEntries = getTrainingEntries();
  const weightEvolution = getWeightEvolution();

  node.innerHTML = `
    <div class="section">
      <div class="card module-stats glow-blue">
        <div class="eyebrow">Pôle historique</div>
        <h2>Progression, tendances et badges</h2>
        <p class="muted">Un historique plus visuel, plus pilotable, avec une lecture d’évolution proche des apps activité modernes.</p>
        ${renderHistoryRings(stats)}
        <div class="actions-row two" style="margin-top: 12px;">
          <button class="btn btn-soft" data-action="go-page" data-page="stats">Ouvrir les stats avancées</button>
          <button class="btn btn-outline" data-action="go-page" data-page="ia">Préparer la prochaine séance</button>
        </div>
      </div>

      <div class="card module-stats">
        <div class="history-chart-head">
          <div>
            <h3>Calendrier d'activité</h3>
            <p class="muted">${escapeHtml(weightEvolution.label)}</p>
          </div>
          <span class="pill pill-calm">${stats.totalSessions} entrées</span>
        </div>
        <div class="calendar-grid">${renderCalendar()}</div>
      </div>

      <div class="card module-stats">
        ${renderProgressChart(trainingEntries)}
      </div>

      <div class="card module-stats">
        ${renderBadges(stats)}
      </div>

      <div class="list">
        ${items.length
          ? items.map((entry) => renderHistoryEntry(entry)).join("")
          : buildEmptyState("Historique vide", "Fais ta première séance ou lance un protocole NOUSHI / Relax pour démarrer les stats.", "Générer une séance", "go-ia")}
      </div>
    </div>
  `;
}
