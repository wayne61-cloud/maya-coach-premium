import { state } from "../state.js";
import { buildEmptyState, dayKey, escapeHtml, formatShortDate } from "../utils.js";
import { icon } from "../ui.js";
import { renderPhotoViewer } from "./photo-viewer.js";

function findSessionForDate(dateStr) {
  if (!dateStr || !state.history?.length) return null;
  const target = dayKey(dateStr);
  return state.history.find((entry) => entry.type === "training" && dayKey(entry.date) === target) || null;
}

function renderSessionInfo(session) {
  if (!session) return "";
  const parts = [
    session.title || "Séance",
    session.durationRealMin ? `${session.durationRealMin} min` : "",
    session.zone || "",
    session.coachNote || ""
  ].filter(Boolean);
  return `
    <div class="progress-photo-session-info">
      <strong>Séance du jour</strong><br/>
      ${escapeHtml(parts.join(" · "))}
    </div>
  `;
}

function renderTimeline(entries, dayActivityCounts) {
  if (!entries.length) {
    return buildEmptyState(
      "Aucune photo enregistrée",
      "Prends une première photo pour lancer la frise de progression.",
      "",
      ""
    );
  }

  return `
    <div class="progress-photo-timeline">
      ${entries.map((entry) => {
        const session = findSessionForDate(entry.date);
        return `
        <article class="progress-photo-card">
          <button class="progress-photo-media photo-media-button" type="button" data-action="open-photo-viewer" data-source="progress" data-id="${escapeHtml(entry.id)}" aria-label="Ouvrir la photo ${escapeHtml(entry.zone)} du ${escapeHtml(formatShortDate(entry.date))}">
            <img src="${entry.photoDataUrl}" alt="Progression ${escapeHtml(entry.zone)} du ${escapeHtml(formatShortDate(entry.date))}" loading="lazy" decoding="async" />
          </button>
          <div class="progress-photo-copy">
            <div class="progress-photo-head">
              <strong>${escapeHtml(entry.zone)}</strong>
              <span>${icon("calendar", "", 14)} ${escapeHtml(formatShortDate(entry.date))}</span>
            </div>
            <div class="exercise-meta">
              ${entry.weightKg ? `<span class="pill">${escapeHtml(entry.weightKg)} kg</span>` : ""}
              ${entry.heightCm ? `<span class="pill">${escapeHtml(entry.heightCm)} cm</span>` : ""}
              ${entry.context ? `<span class="pill">${escapeHtml(entry.context)}</span>` : ""}
              ${(dayActivityCounts.get(dayKey(entry.date)) || 0) ? `<span class="pill">${dayActivityCounts.get(dayKey(entry.date))} activité(s) ce jour-là</span>` : ""}
            </div>
            ${entry.note ? `<p class="muted">${escapeHtml(entry.note)}</p>` : ""}
            ${renderSessionInfo(session)}
            <div class="actions-row">
              <button class="btn btn-outline" type="button" data-action="open-photo-viewer" data-source="progress" data-id="${escapeHtml(entry.id)}">Voir en grand</button>
            </div>
          </div>
        </article>
      `}).join("")}
    </div>
  `;
}

export function renderProgress(node) {
  const draft = state.photoProgressDraft;
  const entries = [...(state.visualProgressEntries || [])].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  const latestEntry = entries[0] || null;
  const timelineEntries = [...entries].sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
  const dayActivityCounts = (state.history || []).reduce((accumulator, entry) => {
    const key = dayKey(entry.date);
    if (!key) return accumulator;
    accumulator.set(key, (accumulator.get(key) || 0) + 1);
    return accumulator;
  }, new Map());

  node.innerHTML = `
    <div class="section progress-photo-screen">
      <div class="card progress-photo-hero">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Progression visuelle</div>
            <h2>Suivi visuel cloud</h2>
            <p class="muted">Même angle, même lumière, même zone: la lecture devient beaucoup plus honnête sur 2 semaines et plus, avec synchronisation cloud dès que la session connectée est active.</p>
          </div>
          <span class="pill">${entries.length} capture(s)</span>
        </div>
      </div>

      <div class="card progress-photo-form-card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Nouvelle capture</div>
            <h3>Ajouter une étape à la frise</h3>
          </div>
          <span class="pill">${escapeHtml(draft.date || "")}</span>
        </div>

        <div class="settings-grid compact-grid">
          <div class="field-stack">
            <label class="field-label" for="progressDate">Date</label>
            <div class="field-shell surface-form">
              <input id="progressDate" data-progress-field="date" type="date" value="${escapeHtml(draft.date || "")}" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="progressZone">Zone</label>
            <div class="field-shell surface-form">
              <select id="progressZone" data-progress-field="zone">
                ${["haut du corps", "dos", "bras", "abdos", "jambes", "fessiers", "full body"].map((zone) => `
                  <option value="${zone}" ${draft.zone === zone ? "selected" : ""}>${escapeHtml(zone)}</option>
                `).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="progressWeight">Poids</label>
            <div class="field-shell surface-form">
              <input id="progressWeight" data-progress-field="weightKg" type="number" min="35" max="240" step="0.1" placeholder="74" value="${escapeHtml(draft.weightKg || "")}" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="progressHeight">Taille</label>
            <div class="field-shell surface-form">
              <input id="progressHeight" data-progress-field="heightCm" type="number" min="120" max="240" placeholder="178" value="${escapeHtml(draft.heightCm || "")}" />
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="progressContext">Contexte</label>
            <div class="field-shell surface-form">
              <input id="progressContext" data-progress-field="context" type="text" placeholder="Photo prise après séance quad" value="${escapeHtml(draft.context || "")}" />
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="progressNote">Note</label>
            <div class="field-shell surface-form">
              <input id="progressNote" data-progress-field="note" type="text" placeholder="Même angle, même lumière, reposé" value="${escapeHtml(draft.note || "")}" />
            </div>
          </div>
        </div>

        <div class="progress-photo-upload-row">
          <label class="btn btn-soft file-trigger">
            <input id="progressPhotoInput" type="file" accept="image/*" hidden />
            ${draft.photoDataUrl ? "Changer la photo" : "Ajouter la photo"}
          </label>
          <button class="btn btn-main" data-action="save-progress-photo">Enregistrer dans la frise</button>
        </div>

        ${draft.photoDataUrl ? `
          <div class="progress-photo-preview">
            <img src="${draft.photoDataUrl}" alt="Aperçu progression" decoding="async" />
          </div>
        ` : ""}
      </div>

      <div class="card progress-photo-timeline-card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Frise chronologique</div>
            <h3>Évolution visible</h3>
          </div>
          <span class="pill">${latestEntry ? escapeHtml(latestEntry.zone) : "commence aujourd’hui"}</span>
        </div>
        ${renderTimeline(timelineEntries, dayActivityCounts)}
      </div>
    </div>

    ${renderPhotoViewer()}
  `;
}
