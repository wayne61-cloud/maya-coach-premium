import { clamp, dayKey, escapeHtml, formatShortDate } from "./utils.js";

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  coach: '<path d="M7 7h10"/><path d="M5 9a2 2 0 0 1 2-2 2 2 0 0 1 2 2v6a2 2 0 0 1-2 2 2 2 0 0 1-2-2z"/><path d="M15 9a2 2 0 0 1 2-2 2 2 0 0 1 2 2v6a2 2 0 0 1-2 2 2 2 0 0 1-2-2z"/><path d="M9 12h6"/><path d="M12 17v4"/>',
  trend: '<path d="M4 19h16"/><path d="m5 15 4-4 3 3 6-7"/><path d="m14 7 4 0 0 4"/>',
  nutrition: '<path d="M7 4v8"/><path d="M10 4v8"/><path d="M7 8h3"/><path d="M14 4v6a2 2 0 0 0 4 0V4"/><path d="M7 12v8"/><path d="M16 12v8"/>',
  profile: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
  spark: '<path d="M12 3 9.5 9.5 3 12l6.5 2.5L12 21l2.5-6.5L21 12l-6.5-2.5z"/>',
  fire: '<path d="M12 3c1.8 2.3 2.7 4.4 2.7 6.2 0 1.2-.4 2.1-1.1 3 2.2-.5 4.4 1.4 4.4 4.2A6 6 0 0 1 12 22a6 6 0 0 1-6-5.6c0-2.9 2.1-4.6 3.9-6.2.9-.8 1.7-1.6 2.1-2.6Z"/>',
  heart: '<path d="m12 21-1.6-1.4C5.4 15.1 3 12.9 3 9.9A4.9 4.9 0 0 1 7.9 5c1.7 0 3.1.8 4.1 2.1A5 5 0 0 1 16.1 5 4.9 4.9 0 0 1 21 9.9c0 3-2.4 5.2-7.4 9.7Z"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  dumbbell: '<path d="M2 10v4"/><path d="M6 7v10"/><path d="M10 9v6"/><path d="M14 9v6"/><path d="M18 7v10"/><path d="M22 10v4"/><path d="M6 12h12"/>',
  bowl: '<path d="M4 12a8 8 0 0 0 16 0Z"/><path d="M7 12a4 4 0 0 1 8 0"/><path d="M12 4v4"/><path d="M8 6c2 0 3 1 4 2"/><path d="M16 6c-2 0-3 1-4 2"/>',
  sync: '<path d="M4 12a8 8 0 0 1 13.7-5.7"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-13.7 5.7"/><path d="M4 20v-5h5"/>',
  cloud: '<path d="M7 18a4 4 0 1 1 .7-7.9A6 6 0 0 1 19 11a3.5 3.5 0 1 1 0 7Z"/>',
  camera: '<path d="M4 8h3l1.6-2h6.8L17 8h3v10H4Z"/><circle cx="12" cy="13" r="3.5"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/>',
  badge: '<path d="m12 3 2.4 4.8 5.3.8-3.8 3.7.9 5.2L12 15l-4.8 2.5.9-5.2L4.3 8.6l5.3-.8Z"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"/>',
  scale: '<path d="M12 4v16"/><path d="M6 8h12"/><path d="M7.5 8 5 13h5Z"/><path d="M19 8 16.5 13h5Z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  timer: '<path d="M10 2h4"/><path d="M12 14v-4"/><circle cx="12" cy="14" r="8"/><path d="M16 6 18 4"/>',
  shield: '<path d="M12 3 5 6v5c0 4.8 2.9 7.7 7 10 4.1-2.3 7-5.2 7-10V6Z"/><path d="m9.5 12 1.7 1.7 3.3-3.4"/>',
  fork: '<path d="M8 3v7"/><path d="M6 3v5"/><path d="M10 3v5"/><path d="M8 10v11"/><path d="M16 3v8"/><path d="M16 11c0 2 1 3 3 3h1"/><path d="M16 11c0 2-1 3-3 3h-1"/><path d="M16 14v7"/>'
};

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export function icon(name, className = "", size = 18) {
  const path = ICONS[name] || ICONS.spark;
  const safeClass = className ? ` ${className}` : "";
  return `
    <svg class="ui-icon${safeClass}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${path}
    </svg>
  `;
}

export function renderCountup(value, { suffix = "", decimals = 0, className = "" } = {}) {
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `<span class="${escapeHtml(className)}" data-countup="${safeValue}" data-suffix="${escapeHtml(suffix)}" data-decimals="${decimals}">0${escapeHtml(suffix)}</span>`;
}

export function renderNumberTicker(value, options = {}) {
  return renderCountup(value, options);
}

export function renderProgressRing({ value = 0, max = 100, label = "", sublabel = "", accent = "gold", suffix = "", decimals = 0 }) {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeValue = clamp(Number(value) || 0, 0, safeMax);
  const ratio = safeValue / safeMax;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - ratio);
  return `
    <div class="progress-ring-card progress-ring-${escapeHtml(accent)}">
      <div class="progress-ring-shell">
        <svg viewBox="0 0 64 64" class="progress-ring-svg" aria-hidden="true">
          <circle class="progress-ring-track" cx="32" cy="32" r="${radius}"></circle>
          <circle class="progress-ring-fill" cx="32" cy="32" r="${radius}" stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"></circle>
        </svg>
        <div class="progress-ring-center">${renderCountup(safeValue, { suffix, decimals, className: "progress-ring-value" })}</div>
      </div>
      <div class="progress-ring-copy">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(sublabel)}</span>
      </div>
    </div>
  `;
}

export function renderActivityRings({ rings = [], centerValue = "", centerLabel = "", centerCaption = "" } = {}) {
  const radiusSteps = [48, 36, 24];
  const circumference = (radius) => 2 * Math.PI * radius;
  const safeRings = rings.slice(0, 3).map((ring, index) => {
    const safeMax = Math.max(1, Number(ring.max) || 1);
    const safeValue = clamp(Number(ring.value) || 0, 0, safeMax);
    const ratio = safeValue / safeMax;
    const radius = radiusSteps[index] || Math.max(18, 48 - index * 12);
    return {
      ...ring,
      radius,
      dasharray: circumference(radius).toFixed(2),
      dashoffset: (circumference(radius) * (1 - ratio)).toFixed(2)
    };
  });

  return `
    <div class="activity-rings">
      <div class="activity-rings-visual">
        <svg viewBox="0 0 128 128" class="activity-rings-svg" aria-hidden="true">
          ${safeRings.map((ring) => `
            <circle class="activity-ring-track" cx="64" cy="64" r="${ring.radius}"></circle>
            <circle class="activity-ring-progress tone-${escapeHtml(ring.tone || "brand")}" cx="64" cy="64" r="${ring.radius}" stroke-dasharray="${ring.dasharray}" stroke-dashoffset="${ring.dashoffset}"></circle>
          `).join("")}
        </svg>
        <div class="activity-rings-center">
          <strong>${centerValue}</strong>
          <span>${escapeHtml(centerLabel)}</span>
          ${centerCaption ? `<small>${escapeHtml(centerCaption)}</small>` : ""}
        </div>
      </div>
      <div class="activity-rings-legend">
        ${safeRings.map((ring) => `
          <div class="activity-rings-row">
            <span class="activity-rings-dot tone-${escapeHtml(ring.tone || "brand")}"></span>
            <div class="activity-rings-copy">
              <strong>${escapeHtml(ring.label || "")}</strong>
              <span>${escapeHtml(ring.valueLabel || `${ring.value}/${ring.max}`)}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderActivityHeatmap(history, { days = 84, title = "Activité récente" } = {}) {
  const counts = new Map();
  history.forEach((entry) => {
    const key = dayKey(entry.date);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells = [];
  const monthLabels = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const key = dayKey(date);
    const count = counts.get(key) || 0;
    const intensity = count >= 4 ? 4 : count === 3 ? 3 : count === 2 ? 2 : count === 1 ? 1 : 0;
    if (date.getDate() <= 7) {
      monthLabels.push(`<span>${escapeHtml(date.toLocaleDateString("fr-FR", { month: "short" }))}</span>`);
    }
    cells.push(`
      <div class="activity-heat-cell level-${intensity}" title="${escapeHtml(formatShortDate(date))} • ${count} activité${count > 1 ? "s" : ""}">
        <span class="sr-only">${escapeHtml(formatShortDate(date))}</span>
      </div>
    `);
  }

  return `
    <div class="activity-heat-card">
      <div class="activity-heat-head">
        <strong>${escapeHtml(title)}</strong>
        <span>${days} jours</span>
      </div>
      <div class="activity-heat-shell">
        <div class="activity-heat-weekdays">
          ${WEEKDAY_LABELS.map((label) => `<span>${label}</span>`).join("")}
        </div>
        <div class="activity-heat-body">
          <div class="activity-heat-months">${monthLabels.slice(-6).join("")}</div>
          <div class="activity-heat-grid">${cells.join("")}</div>
        </div>
      </div>
      <div class="activity-heat-legend">
        <span>Bas</span>
        <i class="level-0"></i>
        <i class="level-1"></i>
        <i class="level-2"></i>
        <i class="level-3"></i>
        <i class="level-4"></i>
        <span>Haut</span>
      </div>
    </div>
  `;
}

export function renderMiniAreaChart(points, { title = "", subtitle = "", tone = "brand", valueSuffix = "" } = {}) {
  if (!Array.isArray(points) || points.length < 2) {
    return `
      <div class="mini-chart-card">
        <div class="mini-chart-head">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(subtitle || "Deux points de données sont nécessaires pour afficher la tendance.")}</span>
          </div>
        </div>
        <div class="helper-note calm-note">Ajoute au moins deux séances training pour débloquer la courbe de progression.</div>
      </div>
    `;
  }

  const width = 320;
  const height = 160;
  const padX = 18;
  const padY = 18;
  const max = Math.max(1, ...points.map((point) => point.value));
  const stepX = (width - padX * 2) / Math.max(1, points.length - 1);
  const plotted = points.map((point, index) => ({
    ...point,
    x: padX + index * stepX,
    y: height - padY - ((point.value / max) * (height - padY * 2))
  }));
  const linePath = plotted.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${linePath} L ${plotted[plotted.length - 1].x.toFixed(2)} ${(height - padY).toFixed(2)} L ${plotted[0].x.toFixed(2)} ${(height - padY).toFixed(2)} Z`;

  return `
    <div class="mini-chart-card tone-${escapeHtml(tone)}">
      <div class="mini-chart-head">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(subtitle)}</span>
        </div>
        <span class="pill pill-calm">${plotted.length} points</span>
      </div>
      <svg class="mini-chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <path class="mini-chart-area tone-${escapeHtml(tone)}" d="${areaPath}"></path>
        <path class="mini-chart-line tone-${escapeHtml(tone)}" d="${linePath}"></path>
        ${plotted.map((point) => `<circle class="mini-chart-dot tone-${escapeHtml(tone)}" cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4"></circle>`).join("")}
      </svg>
      <div class="mini-chart-labels">
        ${plotted.map((point) => `
          <div class="mini-chart-label">
            <strong>${escapeHtml(point.label)}</strong>
            <span>${Math.round(point.value)}${escapeHtml(valueSuffix)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderAnimatedFeed(items) {
  if (!items.length) return "";
  return `
    <div class="animated-feed">
      ${items.map((item, index) => `
        <div class="animated-feed-row" style="--feed-delay:${index * 90}ms">
          <span class="animated-feed-icon">${icon(item.icon || "spark", "", 14)}</span>
          <div class="animated-feed-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.body)}</span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function hydrateCountups(root) {
  root.querySelectorAll("[data-countup]").forEach((node) => {
    const target = Number(node.getAttribute("data-countup") || "0");
    const suffix = node.getAttribute("data-suffix") || "";
    const decimals = Number(node.getAttribute("data-decimals") || "0");
    const key = `${target}|${suffix}|${decimals}`;
    if (node.dataset.countupReady === key) return;
    node.dataset.countupReady = key;
    const startTime = performance.now();
    const duration = 700;
    const update = (now) => {
      const progress = clamp((now - startTime) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      node.textContent = `${current.toFixed(decimals)}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        node.textContent = `${target.toFixed(decimals)}${suffix}`;
      }
    };
    requestAnimationFrame(update);
  });
}

export function hydrateUI(root = document) {
  if (!root) return;
  hydrateCountups(root);
}
