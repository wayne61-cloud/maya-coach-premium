import { state } from "../state.js";
import { buildEmptyState, escapeHtml, formatDateTime, formatShortDate } from "../utils.js";

function renderSessions() {
  const sessions = state.photoViewer?.sessions || [];
  if (!sessions.length) {
    return "";
  }

  return `
    <div class="photo-viewer-section">
      <div class="photo-viewer-section-head">
        <strong>Séances et activités du jour</strong>
        <span>${sessions.length}</span>
      </div>
      <div class="photo-viewer-stack">
        ${sessions.map((session) => `
          <article class="photo-viewer-note-card">
            <div class="progress-photo-head">
              <strong>${escapeHtml(session.title || "Séance")}</strong>
              <span>${escapeHtml(session.meta || "")}</span>
            </div>
            ${session.description ? `<p class="muted">${escapeHtml(session.description)}</p>` : ""}
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDayNotes() {
  const notes = state.photoViewer?.dayNotes || [];
  if (!notes.length) {
    return "";
  }

  return `
    <div class="photo-viewer-section">
      <div class="photo-viewer-section-head">
        <strong>Repères et descriptions du jour</strong>
        <span>${notes.length}</span>
      </div>
      <div class="photo-viewer-stack">
        ${notes.map((note) => `
          <article class="photo-viewer-note-card">
            <div class="progress-photo-head">
              <strong>${escapeHtml(note.title || "Repère")}</strong>
              <span>${escapeHtml(note.meta || "")}</span>
            </div>
            ${note.context ? `<div class="exercise-meta"><span class="pill">${escapeHtml(note.context)}</span></div>` : ""}
            <p class="muted">${escapeHtml(note.description || "Aucune description associée.")}</p>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

export function renderPhotoViewer() {
  const viewer = state.photoViewer;
  if (!viewer?.open || !viewer.imageUrl) return "";

  return `
    <div class="sheet-backdrop photo-viewer-backdrop" data-action="close-photo-viewer"></div>
    <div class="bottom-sheet photo-viewer-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <div>
          <div class="eyebrow">Photo</div>
          <h3>${escapeHtml(viewer.zone || "Progression visuelle")}</h3>
          <p class="muted">${escapeHtml(viewer.date ? formatDateTime(viewer.date) : "")}</p>
        </div>
        <button class="ghost-link" data-action="close-photo-viewer">Fermer</button>
      </div>

      <div class="photo-viewer-media">
        <img src="${escapeHtml(viewer.imageUrl)}" alt="${escapeHtml(`Photo ${viewer.zone || "progression"} du ${viewer.date ? formatShortDate(viewer.date) : "jour"}`)}" decoding="async" />
      </div>

      <div class="exercise-meta">
        ${viewer.zone ? `<span class="pill">${escapeHtml(viewer.zone)}</span>` : ""}
        ${viewer.weightKg ? `<span class="pill">${escapeHtml(viewer.weightKg)} kg</span>` : ""}
        ${viewer.heightCm ? `<span class="pill">${escapeHtml(viewer.heightCm)} cm</span>` : ""}
        ${viewer.ownerName ? `<span class="pill">${escapeHtml(viewer.ownerName)}</span>` : ""}
        ${viewer.ownerEmail ? `<span class="pill">${escapeHtml(viewer.ownerEmail)}</span>` : ""}
      </div>

      <div class="photo-viewer-stack">
        <article class="photo-viewer-note-card photo-viewer-summary-card">
          <div class="progress-photo-head">
            <strong>Repère photo</strong>
            <span>${escapeHtml(viewer.source === "admin" ? "vue modération" : "vue utilisateur")}</span>
          </div>
          <p class="muted">${escapeHtml(viewer.note || viewer.context || "Aucune précision ajoutée sur cette photo.")}</p>
          ${viewer.context ? `<div class="exercise-meta"><span class="pill">${escapeHtml(viewer.context)}</span></div>` : ""}
        </article>

        ${renderSessions()}
        ${renderDayNotes()}

        ${!(viewer.sessions?.length || viewer.dayNotes?.length) ? `
          <div class="photo-viewer-empty">
            ${buildEmptyState("Aucun autre détail ce jour-là", "Cette photo ne possède pas encore de séance ou de note complémentaire liée au même jour.", "", "")}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}
