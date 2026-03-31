import {
  RUNNER_BADGES,
  RUNNER_DASHBOARD,
  RUNNER_INJURY_PLAYBOOK,
  RUNNER_SESSIONS,
  RUNNER_STACK_LINKS,
  RUNNER_STRENGTH_BLOCKS
} from "../../data/runner.js";
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

function renderRoutePreview() {
  const points = RUNNER_DASHBOARD.liveRun.routePoints
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");

  return `
    <div class="runner-map-card">
      <div class="runner-map-copy">
        <strong>Tracking live</strong>
        <span>Overlay stats + coaching audio comme une vraie app interne.</span>
      </div>
      <svg class="runner-map-svg" viewBox="0 0 104 88" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="runnerPath" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stop-color="#27c7a7"></stop>
            <stop offset="100%" stop-color="#7ee9cb"></stop>
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="102" height="86" rx="18"></rect>
        <path class="runner-map-grid" d="M20 8v72M40 8v72M60 8v72M80 8v72M8 24h88M8 44h88M8 64h88"></path>
        <path class="runner-map-path" d="${points}"></path>
        <circle cx="98" cy="56" r="4"></circle>
      </svg>
      <div class="runner-map-stats">
        <span>${RUNNER_DASHBOARD.liveRun.distanceKm} km</span>
        <span>${RUNNER_DASHBOARD.liveRun.pace}</span>
        <span>${RUNNER_DASHBOARD.liveRun.heartRate} bpm</span>
      </div>
    </div>
  `;
}

export function renderRunnerHome(node) {
  const shared = getSharedDashboardData();

  node.innerHTML = `
    <div class="section runner-screen">
      <div class="runner-hero-card">
        <div class="runner-hero-top">
          <div>
            <div class="eyebrow">RUNNER OS</div>
            <h2>Le pôle runner devient une app dans l'app</h2>
            <p>Ambiance dédiée, logique performance, tracking live, prévention et identité coureur reliés au recovery global.</p>
          </div>
          <span class="runner-status-pill">${escapeHtml(RUNNER_DASHBOARD.objective)}</span>
        </div>

        ${renderRunnerTabs("runner-home")}

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

        <div class="runner-hero-grid">
          ${renderRoutePreview()}

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
        </div>
      </div>

      <div class="runner-support-grid">
        <article class="runner-surface-card">
          <div class="runner-block-head">
            <div>
              <span class="eyebrow">Recovery connecté</span>
              <h3>Ce que l'app retient</h3>
            </div>
          </div>
          <p class="muted">Recovery global ${shared.recoveryScore}% • nutrition ${shared.fuelRatio}% • charge semaine ${shared.weekRatio}%.</p>
          <p class="muted">Le runner mode peut donc ajuster le volume, le pacing et la qualité de séance avec le contexte MAYA complet.</p>
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
          <p class="muted">Sprinter, Endurance beast, Marathoner: le rituel quotidien devient visible dès l'accueil runner.</p>
        </article>
      </div>
    </div>
  `;
}

export function renderRunnerCoach(node) {
  node.innerHTML = `
    <div class="section runner-screen">
      <div class="runner-hero-card runner-tight-hero">
        <div class="runner-hero-top">
          <div>
            <div class="eyebrow">Coach Running</div>
            <h2>Le cerveau qui ajuste le run</h2>
            <p>Il pilote allure, volume, prévention blessure et coaching audio sans casser l'immersion.</p>
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

      <article class="runner-surface-card">
        <div class="runner-block-head">
          <div>
            <span class="eyebrow">Plug & play stack</span>
            <h3>Architecture branchable depuis l'app</h3>
          </div>
        </div>
        <div class="runner-stack-grid">
          ${RUNNER_STACK_LINKS.map((item) => `
            <a class="runner-stack-card" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(item.caption)}</span>
            </a>
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
            <h2>Le coeur produit</h2>
            <p>Fractionné, endurance, tempo, long run et côtes avec mode audio et feedback visuel.</p>
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
              <button class="ghost-link" data-action="go-page" data-page="runner-coach">Ajuster</button>
            </div>
          </article>
        `).join("")}
      </div>

      <article class="runner-surface-card">
        <div class="runner-block-head">
          <div>
            <span class="eyebrow">Renforcement coureur</span>
            <h3>Différenciation forte</h3>
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
  if (!RUNNER_DASHBOARD.weeklyTrend.length) {
    node.innerHTML = `<div class="section runner-screen"><div class="card">${buildEmptyState("Runner Mode vide", "Ajoute des runs pour débloquer le suivi performance.", "", "")}</div></div>`;
    return;
  }

  node.innerHTML = `
    <div class="section runner-screen">
      <div class="runner-hero-card runner-tight-hero">
        <div class="runner-hero-top">
          <div>
            <div class="eyebrow">Suivi & performance</div>
            <h2>Charge, VO2, pacing, identité</h2>
            <p>Version premium du suivi running: tu vois la progression, mais aussi le risque associé.</p>
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
          ${renderMiniAreaChart(RUNNER_DASHBOARD.weeklyTrend, {
            title: "Charge hebdo",
            subtitle: "Volume qui monte sans casser le corps",
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
}
