import { EXO_BY_ID, getAllMuscles, getSimilarExercises, hasValidVideoId, searchExercises } from "../catalog.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, getYouTubeEmbedUrl, getYouTubeThumbnail, getYouTubeUrl } from "../utils.js";

function renderExerciseVideo(exercise) {
  if (!exercise.videoId) {
    return `<div class="video-missing">Vidéo non renseignée pour cet exercice.</div>`;
  }
  if (hasValidVideoId(exercise.videoId)) {
    return `<iframe loading="lazy" src="${getYouTubeEmbedUrl(exercise.videoId)}" title="${escapeHtml(exercise.nom)}" allowfullscreen></iframe>`;
  }
  return `
    <a class="video-fallback" href="${getYouTubeUrl(exercise.videoId)}" target="_blank" rel="noreferrer">
      <img src="${getYouTubeThumbnail(exercise.videoId)}" alt="${escapeHtml(exercise.nom)}" />
    </a>
  `;
}

export function renderExos(node) {
  const exercises = searchExercises(state.exoFilter.search, state.exoFilter.mode, state.exoFilter.muscle);
  const similar = state.exoFilter.similarTo ? getSimilarExercises(state.exoFilter.similarTo) : [];
  const similarHeadline = state.exoFilter.similarTo ? EXO_BY_ID.get(state.exoFilter.similarTo)?.nom : "";

  node.innerHTML = `
    <div class="section">
      <div class="card search-module">
        <div class="search-module-head">
          <div>
            <h2>Bibliothèque exercices premium</h2>
            <p class="muted">Refonte inspirée de patterns Figma search mobile: barre dominante, compteur, puis filtres compacts sous la saisie.</p>
          </div>
          <span class="pill">${exercises.length} exos</span>
        </div>
        <div class="search-shell">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input id="exoSearch" class="search-input" type="text" placeholder="tractions, carry, burpee..." value="${escapeHtml(state.exoFilter.search)}" />
          <button class="search-clear ${state.exoFilter.search ? "visible" : ""}" data-action="clear-exo-search">Effacer</button>
        </div>
        <div class="filter-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label" for="exoMode">Mode</label>
            <div class="field-shell">
              <select id="exoMode">
                ${[
                  ["all", "Tous"],
                  ["maison", "Maison"],
                  ["salle", "Salle"]
                ].map(([value, label]) => `<option value="${value}" ${state.exoFilter.mode === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="exoMuscle">Muscle</label>
            <div class="field-shell">
              <select id="exoMuscle">
                <option value="all">Tous</option>
                ${getAllMuscles().map((muscle) => `<option value="${muscle}" ${state.exoFilter.muscle === muscle ? "selected" : ""}>${escapeHtml(muscle)}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      </div>

      ${similar.length ? `
        <div class="card">
          <h3>Exos similaires à ${escapeHtml(similarHeadline)}</h3>
          <div class="coach-grid">
            ${similar.map((exercise) => `<div>• ${escapeHtml(exercise.nom)} <button class="btn btn-outline" style="margin-left: 8px;" data-action="open-exo-focus" data-id="${exercise.id}">Ouvrir</button></div>`).join("")}
          </div>
        </div>
      ` : ""}

      <div class="list">
        ${exercises.length ? exercises.map((exercise) => `
          <article class="exercise-card">
            <div class="exercise-head">
              <div>
                <div class="exercise-title">${escapeHtml(exercise.nom)}</div>
                <div class="exercise-meta">
                  <span class="pill">${escapeHtml(exercise.pole)}</span>
                  <span class="pill">${escapeHtml(exercise.muscle)}</span>
                  <span class="pill">niveau ${exercise.niveau}/3</span>
                  <span class="pill">${escapeHtml(exercise.pattern)}</span>
                </div>
              </div>
              <button class="icon-btn ${state.favorites.has(`exo:${exercise.id}`) ? "active" : ""}" data-action="toggle-favorite" data-type="exo" data-id="${exercise.id}">⭐</button>
            </div>

            <div class="video-container">${renderExerciseVideo(exercise)}</div>
            <div class="video-links">
              <a class="pill pill-soft" href="${getYouTubeUrl(exercise.videoId)}" target="_blank" rel="noreferrer">Ouvrir sur YouTube</a>
              <span class="pill">${escapeHtml(exercise.equipement)}</span>
            </div>

            <div class="actions-row two">
              <button class="btn btn-main" data-action="add-exo-session" data-id="${exercise.id}">Ajouter à une séance</button>
              <button class="btn btn-soft" data-action="ai-around-exo" data-id="${exercise.id}">Séance IA autour de cet exo</button>
              <button class="btn btn-outline" data-action="show-similar-exos" data-id="${exercise.id}">Voir exos similaires</button>
              <button class="btn btn-outline" data-action="open-exo-focus" data-id="${exercise.id}">Focus exo</button>
            </div>

            <details>
              <summary>Fiche coach complète</summary>
              <div class="coach-grid">
                <div><strong>Objectif:</strong> ${escapeHtml(exercise.objectif.join(" / "))}</div>
                <div><strong>Muscles secondaires:</strong> ${escapeHtml(exercise.musclesSecondaires.join(", "))}</div>
                <div><strong>Setup:</strong> ${escapeHtml(exercise.setup)}</div>
                <div><strong>Exécution:</strong><br>${exercise.execution.map((step, index) => `${index + 1}. ${escapeHtml(step)}`).join("<br>")}</div>
                <div><strong>Respiration:</strong> ${escapeHtml(exercise.respiration)}</div>
                <div><strong>Tempo:</strong> ${escapeHtml(exercise.tempo)}</div>
                <div><strong>Amplitude:</strong> ${escapeHtml(exercise.amplitude)}</div>
                <div><strong>Checkpoints:</strong><br>${exercise.checkpoints.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
                <div><strong>Erreurs fréquentes:</strong><br>${exercise.erreursFrequentes.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
                <div><strong>Version facile:</strong> ${escapeHtml(exercise.versionFacile)}</div>
                <div><strong>Version difficile:</strong> ${escapeHtml(exercise.versionDifficile)}</div>
                <div><strong>Progression:</strong> ${escapeHtml(exercise.progression)}</div>
                <div><strong>Volume conseillé:</strong><br>• Muscle: ${escapeHtml(exercise.volumeConseille.muscle)}<br>• Force: ${escapeHtml(exercise.volumeConseille.force)}<br>• Endurance: ${escapeHtml(exercise.volumeConseille.endurance)}</div>
                <div><strong>Contre-indications:</strong> ${escapeHtml(exercise.contreIndications)}</div>
              </div>
            </details>
          </article>
        `).join("") : buildEmptyState("Aucun exercice trouvé", "Essaie une autre zone, un autre lieu ou une recherche plus large.", "Réinitialiser", "reset-exo-filters")}
      </div>
    </div>
  `;
}
