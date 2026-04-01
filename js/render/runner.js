import {
  RUNNER_BADGES,
  RUNNER_CAPABILITIES,
  RUNNER_DASHBOARD,
  RUNNER_INJURY_PLAYBOOK,
  RUNNER_SESSIONS,
  RUNNER_STRENGTH_BLOCKS
} from "../../data/runner.js";
import { formatDistance, formatPace, formatRunDuration, getActiveRunPace } from "../gps.js";
import { getSharedDashboardData } from "../insights.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml } from "../utils.js";
import { icon, renderActivityRings, renderMiniAreaChart, renderNumberTicker } from "../ui.js";

function renderRunnerTabs(activePage) {
  const items = [
    ["runner-home", "Accueil"],
    ["runner-sessions", "Séances"],
    ["runner-performance", "Perf"],
    ["runner-coach", "Coach"]
  ];

  return `
    <div class="runner-subnav" role="tablist" aria-label="Runner Mode">
      ${items.map(([page, label]) => `
        <button class="runner-subnav-btn ${activePage === page ? "active" : ""}" type="button" data-action="go-page" data-page="${page}">
          ${escapeHtml(label)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderLiveRunDashboard() {
  const run = state.activeRun;
  if (!run) return "";

  const pace = getActiveRunPace();
  const calories = run.distanceM > 0
    ? Math.round((run.distanceM / 1000) * (parseFloat(state.profile?.weightKg || "70") || 70) * 1.036)
    : 0;

  const isRunning = run.status === "running";
  const isPaused = run.status === "paused";

  return `
    <div class="run-live-card">
      <div class="run-live-header">
        <span class="eyebrow">Course en cours</span>
        <span class="run-live-status ${isRunning ? "run-status-active" : "run-status-paused"}">${isRunning ? "GPS actif" : "En pause"}</span>
      </div>

      <div class="run-live-stats">
        <div class="run-live-stat run-live-stat-main">
          <span class="run-live-value">${formatDistance(run.distanceM)}</span>
          <span class="run-live-label">Distance</span>
        </div>
        <div class="run-live-stat">
          <span class="run-live-value">${formatRunDuration(run.durationSec)}</span>
          <span class="run-live-label">Durée</span>
        </div>
        <div class="run-live-stat">
          <span class="run-live-value">${formatPace(pace)}</span>
          <span class="run-live-label">Allure</span>
        </div>
        <div class="run-live-stat">
          <span class="run-live-value">${calories}</span>
          <span class="run-live-label">kcal</span>
        </div>
      </div>

      <div id="runLiveMap" class="run-map-container"></div>

      ${run.splits.length ? `
        <div class="run-splits-strip">
          ${run.splits.map((s) => `<span class="pill pill-soft">km ${s.km} — ${formatPace(s.paceSec)}</span>`).join("")}
        </div>
      ` : ""}

      <div class="run-live-controls">
        ${isRunning ? `
          <button class="btn btn-outline" data-action="run-pause">${icon("timer", "", 14)} Pause</button>
          <button class="btn btn-bad" data-action="run-finish">${icon("target", "", 14)} Terminer</button>
        ` : ""}
        ${isPaused ? `
          <button class="btn btn-main" data-action="run-resume">${icon("spark", "", 14)} Reprendre</button>
          <button class="btn btn-outline" data-action="run-discard">Annuler</button>
          <button class="btn btn-bad" data-action="run-finish">${icon("target", "", 14)} Terminer</button>
        ` : ""}
      </div>
    </div>
  `;
}

function renderStartRunCard() {
  if (state.activeRun) return "";

  return `
    <div class="runner-map-card run-start-card">
      <div class="runner-map-copy">
        <strong>${icon("target", "", 16)} Lancer une course</strong>
        <span>GPS en temps réel, allure, distance et coaching.</span>
      </div>
      <div class="run-type-selector">
        <button class="btn btn-main" data-action="run-start" data-run-type="free">Course libre</button>
        <button class="btn btn-outline" data-action="run-start" data-run-type="tempo">Tempo</button>
        <button class="btn btn-outline" data-action="run-start" data-run-type="endurance">Endurance</button>
        <button class="btn btn-outline" data-action="run-start" data-run-type="intervals">Fractionné</button>
      </div>
    </div>
  `;
}

function renderRunHistory() {
  const runs = state.runs || [];
  if (!runs.length) return "";

  const recent = runs.slice(0, 5);
  return `
    <article class="runner-surface-card">
      <div class="runner-block-head">
        <div>
          <span class="eyebrow">Historique</span>
          <h3>Tes dernières courses</h3>
        </div>
        <span class="pill">${runs.length} course${runs.length > 1 ? "s" : ""}</span>
      </div>
      <div class="run-history-list">
        ${recent.map((run) => {
          const date = new Date(run.startedAt);
          const dateStr = `${date.getDate()}/${date.getMonth() + 1}`;
          return `
            <div class="run-history-card">
              <div class="run-history-top">
                <strong>${escapeHtml(run.title)}</strong>
                <span class="muted">${dateStr}</span>
              </div>
              <div class="run-history-stats">
                <span>${icon("target", "", 13)} ${formatDistance(run.distanceM)}</span>
                <span>${icon("timer", "", 13)} ${formatRunDuration(run.durationSec)}</span>
                <span>${icon("spark", "", 13)} ${formatPace(run.avgPaceSec)}</span>
                <span>${icon("fire", "", 13)} ${run.caloriesEstimate || 0} kcal</span>
              </div>
              ${run.gpsPoints?.length > 1 ? `<div data-run-map="${escapeHtml(run.id)}" class="run-map-preview"></div>` : ""}
            </div>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

function computeWeeklyRunTrend() {
  const runs = state.runs || [];
  if (!runs.length) return [];
  const now = new Date();
  const weeks = [];
  for (let w = 4; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (w * 7 + weekStart.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekRuns = runs.filter((r) => {
      const d = new Date(r.startedAt);
      return d >= weekStart && d < weekEnd;
    });
    const totalKm = weekRuns.reduce((sum, r) => sum + (r.distanceM || 0) / 1000, 0);
    weeks.push({ label: `S-${w}`, value: Math.round(totalKm * 10) / 10 });
  }
  return weeks.some((w) => w.value > 0) ? weeks : [];
}

export function renderRunnerHome(node) {
  const shared = getSharedDashboardData();
  const hasActiveRun = Boolean(state.activeRun);

  node.innerHTML = `
    <div class="section runner-screen">
      <div class="runner-hero-card">
        <div class="runner-hero-top">
          <div>
            <div class="eyebrow">RUNNER OS</div>
            <h2>Mode Runner</h2>
            <p>Tracking live, coaching adaptatif, charge et recovery connectés à tout ton profil MAYA.</p>
          </div>
          <span class="runner-status-pill">${escapeHtml(RUNNER_DASHBOARD.objective)}</span>
        </div>

        ${renderRunnerTabs("runner-home")}

        ${hasActiveRun ? "" : `
        <div class="runner-metric-grid">
          <article class="runner-metric-card">
            <span>${icon("timer", "", 16)} Séance du jour</span>
            <strong>${escapeHtml(RUNNER_DASHBOARD.liveRun.title)}</strong>
            <small>${RUNNER_DASHBOARD.liveRun.duration} · ${RUNNER_DASHBOARD.liveRun.pace}</small>
          </article>
          <article class="runner-metric-card">
            <span>${icon("heart", "", 16)} État de forme</span>
            <strong>${renderNumberTicker(RUNNER_DASHBOARD.readiness, { suffix: "%" })}</strong>
            <small>${escapeHtml(RUNNER_DASHBOARD.fatigue)}</small>
          </article>
          <article class="runner-metric-card">
            <span>${icon("target", "", 16)} Objectif</span>
            <strong>${escapeHtml(RUNNER_DASHBOARD.raceName)}</strong>
            <small>${RUNNER_DASHBOARD.weeklyKm} km cette semaine</small>
          </article>
          <article class="runner-metric-card">
            <span>${icon("cloud", "", 16)} Météo</span>
            <strong>${escapeHtml(RUNNER_DASHBOARD.weather.temp)} · ${escapeHtml(RUNNER_DASHBOARD.weather.condition)}</strong>
            <small>${escapeHtml(RUNNER_DASHBOARD.weather.bestWindow)}</small>
          </article>
        </div>
        `}

        <div class="runner-hero-grid" ${hasActiveRun ? 'style="grid-template-columns:1fr"' : ""}>
          ${hasActiveRun ? renderLiveRunDashboard() : renderStartRunCard()}

          ${hasActiveRun ? "" : `
          <div class="runner-audio-card">
            <div class="runner-block-head">
              <div>
                <span class="eyebrow">Audio coaching</span>
                <h3>Feedback live</h3>
              </div>
              <button class="ghost-link" data-action="go-page" data-page="runner-coach">Ouvrir Coach</button>
            </div>
            <div class="runner-audio-list">
              ${RUNNER_DASHBOARD.liveRun.audioCues.map((cue) => `
                <div class="runner-audio-item">
                  <span>${icon("spark", "", 14)}</span>
                  <p>${escapeHtml(cue)}</p>
                </div>
              `).join("")}
            </div>
            <div class="runner-hero-actions">
              <button class="btn btn-main" data-action="go-page" data-page="runner-sessions">Voir les séances</button>
              <button class="btn btn-outline" data-action="go-page" data-page="runner-performance">Suivi & perf</button>
            </div>
          </div>
          `}
        </div>
      </div>

      ${renderRunHistory()}

      <div class="runner-support-grid">
        <article class="runner-surface-card">
          <div class="runner-block-head">
            <div>
              <span class="eyebrow">Recovery connecté</span>
              <h3>Ce que l'app retient</h3>
            </div>
          </div>
          <p class="muted">Recovery global ${shared.recoveryScore}% · nutrition ${shared.fuelRatio}% · charge semaine ${shared.weekRatio}%.</p>
          <p class="muted">Le mode runner ajuste volume, pacing et qualité de séance avec le contexte MAYA complet.</p>
        </article>

        <article class="runner-surface-card">
          <div class="runner-block-head">
            <div>
              <span class="eyebrow">Identité Runner</span>
              <h3>Badges vivants</h3>
            </div>
          </div>
          <div class="runner-badge-strip">
            ${RUNNER_BADGES.slice(0, 3).map((badge) => `<span class="pill pill-soft">${escapeHtml(badge.title)}</span>`).join("")}
          </div>
          <p class="muted">Tes badges se débloquent avec la régularité et la progression.</p>
        </article>
      </div>
    </div>
  `;

  hydrateRunnerMaps();
}

export function renderRunnerCoach(node) {
  node.innerHTML = `
    <div class="section runner-screen">
      <div class="runner-hero-card runner-tight-hero">
        <div class="runner-hero-top">
          <div>
            <div class="eyebrow">Coach Running</div>
            <h2>Coaching intelligent</h2>
            <p>Allure, volume et prévention blessure ajustés en direct selon ta forme du jour.</p>
          </div>
        </div>
        ${renderRunnerTabs("runner-coach")}
      </div>

      <div class="runner-coach-grid">
        <article class="runner-surface-card">
          <div class="runner-block-head">
            <div>
              <span class="eyebrow">Ajustements</span>
              <h3>Pace, volume, risque</h3>
            </div>
          </div>
          <div class="runner-feature-list">
            <div><strong>Allure</strong><span>ralentis, tiens la zone, garde la cadence</span></div>
            <div><strong>Volume</strong><span>augmente ou coupe selon la fatigue et le sommeil</span></div>
            <div><strong>Risque blessure</strong><span>alerte quand la progression grimpe trop vite</span></div>
          </div>
        </article>

        <article class="runner-surface-card">
          <div class="runner-block-head">
            <div>
              <span class="eyebrow">Prévention</span>
              <h3>Playbook express</h3>
            </div>
          </div>
          <div class="runner-playbook-list">
            ${RUNNER_INJURY_PLAYBOOK.map((item) => `
              <div class="runner-playbook-card">
                <strong>${escapeHtml(item.symptom)}</strong>
                <span>${escapeHtml(item.causes[0])}</span>
                <small>${escapeHtml(item.adaptations[0])}</small>
              </div>
            `).join("")}
          </div>
        </article>
      </div>

      <article class="runner-surface-card runner-os-card">
        <div class="runner-block-head">
          <div>
            <span class="eyebrow">RUNNER OS</span>
            <h3>Le moteur course intégré de MAYA</h3>
          </div>
          <span class="runner-status-pill">Natif</span>
        </div>
        <p class="muted" style="margin-top:8px">Tracking réel, coaching actif, données connectées. Tout est déjà là, tout fonctionne ensemble.</p>
        <div class="runner-capability-grid">
          ${RUNNER_CAPABILITIES.map((item) => `
            <div class="runner-capability-card">
              <span class="runner-capability-icon">${icon(item.icon, "", 18)}</span>
              <div>
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.caption)}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </article>
    </div>
  `;
}

export function renderRunnerSessions(node) {
  node.innerHTML = `
    <div class="section runner-screen">
      <div class="runner-hero-card runner-tight-hero">
        <div class="runner-hero-top">
          <div>
            <div class="eyebrow">Séances Runner</div>
            <h2>Tes séances</h2>
            <p>Fractionné, endurance, tempo, sortie longue et côtes avec coaching audio en direct.</p>
          </div>
        </div>
        ${renderRunnerTabs("runner-sessions")}
      </div>

      <div class="runner-session-grid">
        ${RUNNER_SESSIONS.map((session) => `
          <article class="runner-session-card">
            <div class="runner-block-head">
              <div>
                <span class="eyebrow">${escapeHtml(session.focus)}</span>
                <h3>${escapeHtml(session.type)}</h3>
              </div>
              <span class="pill">${escapeHtml(session.duration)}</span>
            </div>
            <p>${escapeHtml(session.description)}</p>
            <div class="exercise-meta">
              ${session.cues.map((cue) => `<span class="pill pill-soft">${escapeHtml(cue)}</span>`).join("")}
            </div>
            <div class="runner-session-footer">
              <span>${icon("spark", "", 14)} ${escapeHtml(session.audioMode)}</span>
              <button class="ghost-link" data-action="run-start" data-run-type="${escapeHtml(session.id.replace("runner_", ""))}">${icon("target", "", 14)} Lancer</button>
            </div>
          </article>
        `).join("")}
      </div>

      <article class="runner-surface-card">
        <div class="runner-block-head">
          <div>
            <span class="eyebrow">Renforcement coureur</span>
            <h3>Blocs complémentaires</h3>
          </div>
        </div>
        <div class="runner-strength-grid">
          ${RUNNER_STRENGTH_BLOCKS.map((block) => `
            <article class="runner-strength-card">
              <strong>${escapeHtml(block.title)}</strong>
              <p>${escapeHtml(block.why)}</p>
              <div class="runner-chip-row">
                ${block.drills.map((drill) => `<span class="pill pill-soft">${escapeHtml(drill)}</span>`).join("")}
              </div>
            </article>
          `).join("")}
        </div>
      </article>
    </div>
  `;
}

export function renderRunnerPerformance(node) {
  const weeklyTrend = computeWeeklyRunTrend();
  const hasRealData = weeklyTrend.length > 0;

  node.innerHTML = `
    <div class="section runner-screen">
      <div class="runner-hero-card runner-tight-hero">
        <div class="runner-hero-top">
          <div>
            <div class="eyebrow">Suivi & performance</div>
            <h2>Ta progression</h2>
            <p>Charge, allure, VO2 et prévention en un coup d'oeil. Progresse sans risque.</p>
          </div>
        </div>
        ${renderRunnerTabs("runner-performance")}
      </div>

      <div class="runner-performance-grid">
        <div class="runner-surface-card runner-rings-card">
          ${renderActivityRings({
            rings: [
              { label: "Readiness", value: RUNNER_DASHBOARD.readiness, max: 100, tone: "brand", valueLabel: `${RUNNER_DASHBOARD.readiness}%` },
              { label: "Charge km", value: RUNNER_DASHBOARD.weeklyKm, max: 50, tone: "green", valueLabel: `${RUNNER_DASHBOARD.weeklyKm} km` },
              { label: "Recovery", value: 72, max: 100, tone: "blue", valueLabel: "72%" }
            ],
            centerValue: `${RUNNER_DASHBOARD.liveRun.vo2}`,
            centerLabel: "VO2 max",
            centerCaption: "signal global"
          })}
        </div>

        <div class="runner-chart-stack">
          ${renderMiniAreaChart(hasRealData ? weeklyTrend : RUNNER_DASHBOARD.weeklyTrend, {
            title: "Charge hebdo",
            subtitle: hasRealData ? "Calculé depuis tes courses réelles" : "Données de démonstration",
            tone: "green",
            valueSuffix: " km"
          })}
          ${renderMiniAreaChart(RUNNER_DASHBOARD.paceTrend, {
            title: "Pacing par format",
            subtitle: "Allure moyenne sur les formats clés",
            tone: "brand",
            valueSuffix: " s"
          })}
        </div>
      </div>

      ${renderRunHistory()}

      <div class="runner-support-grid">
        <article class="runner-surface-card">
          <div class="runner-block-head">
            <div>
              <span class="eyebrow">Prévention blessures</span>
              <h3>Insights exploitables</h3>
            </div>
          </div>
          ${RUNNER_INJURY_PLAYBOOK.map((item) => `
            <div class="runner-insight-row">
              <strong>${escapeHtml(item.symptom)}</strong>
              <span>${escapeHtml(item.adaptations.join(" • "))}</span>
            </div>
          `).join("")}
        </article>

        <article class="runner-surface-card">
          <div class="runner-block-head">
            <div>
              <span class="eyebrow">Identité coureur</span>
              <h3>Badges & titres</h3>
            </div>
          </div>
          <div class="runner-badge-grid">
            ${RUNNER_BADGES.map((badge) => `
              <article class="runner-badge-card">
                <strong>${escapeHtml(badge.title)}</strong>
                <span>${escapeHtml(badge.detail)}</span>
              </article>
            `).join("")}
          </div>
        </article>
      </div>
    </div>
  `;

  hydrateRunnerMaps();
}

function hydrateRunnerMaps() {
  if (typeof L === "undefined") return;

  const liveMapEl = document.getElementById("runLiveMap");
  if (liveMapEl && state.activeRun?.gpsPoints?.length > 1) {
    const map = L.map(liveMapEl, { zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    const coords = state.activeRun.gpsPoints.map((p) => [p.lat, p.lng]);
    const polyline = L.polyline(coords, { color: "#27c7a7", weight: 4, opacity: 0.9 }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [20, 20] });
    const last = coords[coords.length - 1];
    L.circleMarker(last, { radius: 7, color: "#27c7a7", fillColor: "#9bf2dc", fillOpacity: 1, weight: 2 }).addTo(map);
  } else if (liveMapEl) {
    liveMapEl.innerHTML = `<div class="run-map-placeholder">${icon("target", "", 24)}<span>En attente du signal GPS...</span></div>`;
  }

  document.querySelectorAll("[data-run-map]").forEach((el) => {
    const runId = el.dataset.runMap;
    const run = (state.runs || []).find((r) => r.id === runId);
    if (!run?.gpsPoints?.length || run.gpsPoints.length < 2) return;
    const map = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, touchZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    const coords = run.gpsPoints.map((p) => [p.lat, p.lng]);
    const polyline = L.polyline(coords, { color: "#27c7a7", weight: 3, opacity: 0.8 }).addTo(map);
    map.fitBounds(polyline.getBounds(), { padding: [10, 10] });
  });
}
