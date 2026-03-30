import { EXO_BY_ID, getAllMuscles, getSimilarExercises, hasValidVideoId, searchExercises } from "../catalog.js";
import { ensureLiteYouTubeEmbed } from "../lite-youtube.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, getYouTubeThumbnail, getYouTubeUrl } from "../utils.js";

function renderExerciseVideo(exercise) {
  if (!exercise.videoId) {
    return `<div class="video-missing">Vidéo non renseignée pour cet exercice.</div>`;
  }
  if (hasValidVideoId(exercise.videoId)) {
    return `<lite-youtube videoid="${escapeHtml(exercise.videoId)}" title="${escapeHtml(exercise.nom)}" playlabel="Lire la vidéo ${escapeHtml(exercise.nom)}" params="rel=0&modestbranding=2"></lite-youtube>`;
  }
  return `
    <a class="video-fallback" href="${getYouTubeUrl(exercise.videoId)}" target="_blank" rel="noreferrer">
      <img src="${getYouTubeThumbnail(exercise.videoId)}" alt="${escapeHtml(exercise.nom)}" />
    </a>
  `;
}

function renderPlaceToggle(activeMode) {
  const options = [
    ["all", "Tout"],
    ["maison", "Maison"],
    ["salle", "Salle"],
    ["mixte", "Mixte"]
  ];

  return `
    <div class="mode-toggle-row" role="tablist" aria-label="Choix du lieu">
      ${options.map(([value, label]) => `
        <button
          class="mode-toggle-btn ${activeMode === value ? "active" : ""}"
          data-action="set-exo-mode"
          data-mode="${value}"
          type="button"
        >
          ${escapeHtml(label)}
        </button>
      `).join("")}
    </div>
  `;
}

export function renderExos(node) {
  ensureLiteYouTubeEmbed().catch(() => {});
  const exercises = searchExercises(state.exoFilter.search, state.exoFilter.mode, state.exoFilter.muscle);
  const similar = state.exoFilter.similarTo ? getSimilarExercises(state.exoFilter.similarTo) : [];
  const similarHeadline = state.exoFilter.similarTo ? EXO_BY_ID.get(state.exoFilter.similarTo)?.nom : "";
  const visibleMuscles = new Set(exercises.map((exercise) => exercise.muscle)).size;
  const visiblePatterns = [...new Set(exercises.map((exercise) => exercise.pattern))].slice(0, 4);
  const activeSessionName = state.customWorkoutDraft?.title || "Ma séance";
  const sessionCount = (state.customWorkoutLibrary || []).length;

  node.innerHTML = `
    <div class="section">
      <div class="card exercise-target-card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Ajout rapide</div>
            <h3>${escapeHtml(activeSessionName)}</h3>
          </div>
          <span class="pill">${sessionCount} séance(s)</span>
        </div>
        <p class="muted">${sessionCount > 1
          ? "Si plusieurs séances existent, l’app t’emmène choisir la cible ou créer une nouvelle séance."
          : "Chaque bouton “Ajouter à ma séance” envoie directement l’exercice dans la séance active."
        }</p>
      </div>

      <div class="card search-module module-exos glow-coral">
        <div class="search-module-head">
          <div>
            <h2>Pôle Exercices compact</h2>
            <p class="muted">Recherche dense, filtres rapides, vidéo YouTube légère et fiche coach détaillée sans iframe lourde.</p>
          </div>
          <span class="pill">${exercises.length} exos</span>
        </div>
        <div class="search-shell">
          <span class="search-icon" aria-hidden="true">⌕</span>
          <input id="exoSearch" class="search-input" type="text" placeholder="tractions, carry, burpee..." value="${escapeHtml(state.exoFilter.search)}" />
          <button class="search-clear ${state.exoFilter.search ? "visible" : ""}" data-action="clear-exo-search">Effacer</button>
        </div>
        <div class="progress-mini-grid exercise-summary-grid">
          <div class="data-pill-card">
            <span class="data-pill-label">Catalogue visible</span>
            <strong class="data-pill-value">${exercises.length}</strong>
            <small>résultats filtrés</small>
          </div>
          <div class="data-pill-card">
            <span class="data-pill-label">Groupes ciblés</span>
            <strong class="data-pill-value">${visibleMuscles}</strong>
            <small>muscle(s) couverts</small>
          </div>
        </div>
        ${renderPlaceToggle(state.exoFilter.mode)}
        <div class="filter-grid" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label" for="exoMode">Lieu</label>
            <div class="field-shell">
              <select id="exoMode">
                ${[
                  ["all", "Tous"],
                  ["maison", "Maison"],
                  ["salle", "Salle"],
                  ["mixte", "Mixte / tous"]
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
        <div class="exercise-tag-strip">
          ${visiblePatterns.length
            ? visiblePatterns.map((pattern) => `<span class="pill">${escapeHtml(pattern)}</span>`).join("")
            : '<span class="pill">full-body</span>'}
        </div>
      </div>

      ${similar.length ? `
        <div class="card module-exos">
          <h3>Exos similaires à ${escapeHtml(similarHeadline)}</h3>
          <div class="coach-grid">
            ${similar.map((exercise) => `<div>• ${escapeHtml(exercise.nom)} <button class="btn btn-outline" style="margin-left: 8px;" data-action="open-exo-focus" data-id="${exercise.id}">Ouvrir</button></div>`).join("")}
          </div>
        </div>
      ` : ""}

      <div class="list">
        ${exercises.length ? exercises.map((exercise) => `
          <article class="exercise-card module-exos">
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
              <button class="btn btn-main" data-action="add-exo-session" data-id="${exercise.id}">Ajouter à Ma séance</button>
              <button class="btn btn-soft" data-action="ai-around-exo" data-id="${exercise.id}">Séance IA autour de cet exo</button>
              <button class="btn btn-outline" data-action="show-similar-exos" data-id="${exercise.id}">Voir exos similaires</button>
              <button class="btn btn-outline" data-action="open-exo-focus" data-id="${exercise.id}">Fiche exo</button>
            </div>

            <details>
              <summary>Technique complète</summary>
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
