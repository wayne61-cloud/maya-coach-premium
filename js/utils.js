export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function dayKey(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function sameWeek(dateLike, referenceLike) {
  const date = new Date(dateLike);
  const reference = new Date(referenceLike);
  const start = new Date(reference);
  const day = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

export function shuffle(list) {
  const items = [...list];
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

export function titleCase(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values) {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

export function formatDateTime(dateLike) {
  return new Date(dateLike).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export function formatShortDate(dateLike) {
  return new Date(dateLike).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function parseRepsValue(reps) {
  const raw = String(reps || "").trim();
  if (raw.includes("-")) {
    const [start] = raw.split("-");
    return parseInt(start, 10) || 0;
  }
  if (raw.includes("x")) {
    const [count] = raw.split("x");
    return parseInt(count, 10) || 0;
  }
  const numeric = parseInt(raw, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function parseDurationToken(reps) {
  const raw = String(reps || "").trim();
  if (raw.endsWith("s")) {
    return parseInt(raw, 10) || 0;
  }
  return 0;
}

export function extractNumeric(text) {
  const match = String(text || "").match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

export function getYouTubeUrl(videoId) {
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : "";
}

export function getYouTubeEmbedUrl(videoId) {
  return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0` : "";
}

export function getYouTubeThumbnail(videoId) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "";
}

export function buildEmptyState(title, body, actionLabel, action) {
  return `
    <div class="empty">
      <strong>${escapeHtml(title)}</strong>
      <div>${escapeHtml(body)}</div>
      ${actionLabel && action ? `<button class="btn btn-main" data-action="${escapeHtml(action)}">${escapeHtml(actionLabel)}</button>` : ""}
    </div>
  `;
}

export function readErrorMessage(error, fallback = "Erreur inconnue") {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidates = [
      error.message,
      error.error_description,
      error.description,
      error.error,
      error.details,
      error.hint
    ];
    const match = candidates.find((value) => typeof value === "string" && value.trim());
    if (match) return match;
  }
  const raw = String(error ?? "").trim();
  return raw && raw !== "[object Object]" ? raw : fallback;
}
