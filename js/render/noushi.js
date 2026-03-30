import { EXO_BY_ID, getNoushiBeastSpotlights, getNoushiChallengesByPlace } from "../catalog.js";
import { ensureLiteYouTubeEmbed } from "../lite-youtube.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, getYouTubeThumbnail, getYouTubeUrl } from "../utils.js";
import { icon } from "../ui.js";

function getPlaceLabel(place) {
  return {
    maison: "Maison",
    salle: "Salle",
    mixte: "Mixte"
  }[place] || "Mixte";
}

function renderExerciseVideo(exercise) {
  if (!exercise?.videoId) {
    return `<div class="video-missing">Vidéo non renseignée pour cet exercice.</div>`;
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(String(exercise.videoId || ""))) {
    return `<lite-youtube videoid="${escapeHtml(exercise.videoId)}" title="${escapeHtml(exercise.nom)}" playlabel="Lire la vidéo ${escapeHtml(exercise.nom)}" params="rel=0&modestbranding=2"></lite-youtube>`;
  }
  return `
    <a class="video-fallback" href="${getYouTubeUrl(exercise.videoId)}" target="_blank" rel="noreferrer">
      <img src="${getYouTubeThumbnail(exercise.videoId)}" alt="${escapeHtml(exercise.nom)}" />
    </a>
  `;
}

function getCompletedChallenges() {
  return state.history.filter((entry) => (
    entry.type === "training"
    && entry.metadata?.noushiMode
    && entry.difficulty === "tenue"
  ));
}

function renderPlaceToggle(activePlace) {
  const options = [
    ["mixte", "Mixte"],
    ["maison", "Maison"],
    ["salle", "Salle"]
  ];

  return `
    <div class="mode-toggle-row mode-toggle-row-noushi" role="tablist" aria-label="Mode NOUSHI">
      ${options.map(([value, label]) => `
        <button
          class="mode-toggle-btn ${activePlace === value ? "active" : ""}"
          data-action="set-noushi-place"
          data-place="${value}"
          type="button"
        >
          ${escapeHtml(label)}
        </button>
      `).join("")}
    </div>
  `;
}

function renderChallengeCard(challenge, completeCount) {
  return `
    <article class="noushi-challenge-card">
      <div class="noushi-challenge-top">
        <div>
          <div class="eyebrow">Défi ${escapeHtml(challenge.zone)} • ${escapeHtml(getPlaceLabel(challenge.effectivePlace))}</div>
          <h3>${escapeHtml(challenge.nom)}</h3>
        </div>
        <span class="pill">${challenge.temps} min</span>
      </div>

      <p>${escapeHtml(challenge.promesse)}</p>
      <div class="noushi-mantra">${escapeHtml(challenge.mantra)}</div>
      <div class="exercise-meta">
        <span class="pill">${escapeHtml(getPlaceLabel(challenge.effectivePlace))}</span>
        <span class="pill">${escapeHtml(challenge.objectif)}</span>
        <span class="pill">${completeCount} terminé(s)</span>
      </div>

      <div class="noushi-roster">
        ${(challenge.exercises || []).map((exercise) => (
          `<span>${icon("fire", "", 12)} ${escapeHtml(exercise.nom)}</span>`
        )).join("")}
      </div>

      <button
        class="btn btn-bad"
        data-action="start-noushi-challenge"
        data-id="${challenge.id}"
        data-place="${challenge.effectivePlace}"
      >
        Lancer le défi
      </button>
    </article>
  `;
}

function renderSpotlightCard(spotlight) {
  const exercise = EXO_BY_ID.get(spotlight.exerciseId);
  if (!exercise) return "";

  return `
    <article class="exercise-card noushi-beast-card">
      <div class="exercise-head">
        <div>
          <div class="exercise-title">${escapeHtml(exercise.nom)}</div>
          <div class="exercise-meta">
            <span class="pill">${escapeHtml(spotlight.surnom)}</span>
            <span class="pill">${escapeHtml(getPlaceLabel(exercise.pole))}</span>
            <span class="pill">${escapeHtml(exercise.muscle)}</span>
            <span class="pill">niveau ${exercise.niveau}/3</span>
          </div>
        </div>
        <button class="icon-btn ${state.favorites.has(`exo:${exercise.id}`) ? "active" : ""}" data-action="toggle-favorite" data-type="exo" data-id="${exercise.id}">⭐</button>
      </div>

      <div class="video-container">${renderExerciseVideo(exercise)}</div>

      <div class="noushi-prescription-grid">
        <div><strong>Description</strong><br>${escapeHtml(spotlight.description)}</div>
        <div><strong>Prep</strong><br>${escapeHtml(spotlight.prep)}</div>
        <div><strong>Reps / temps</strong><br>${escapeHtml(spotlight.reps)}</div>
        <div><strong>Repos</strong><br>${escapeHtml(String(spotlight.restSec))} sec</div>
      </div>

      <details>
        <summary>Technique détaillée</summary>
        <div class="coach-grid">
          <div><strong>Setup:</strong> ${escapeHtml(exercise.setup)}</div>
          <div><strong>Exécution:</strong><br>${exercise.execution.map((step, index) => `${index + 1}. ${escapeHtml(step)}`).join("<br>")}</div>
          <div><strong>Respiration:</strong> ${escapeHtml(exercise.respiration)}</div>
          <div><strong>Tempo:</strong> ${escapeHtml(exercise.tempo)}</div>
          <div><strong>Checkpoints:</strong><br>${exercise.checkpoints.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
          <div><strong>Erreurs fréquentes:</strong><br>${exercise.erreursFrequentes.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
          <div><strong>Avertissement:</strong> ${escapeHtml(spotlight.warning)}</div>
        </div>
      </details>

      <div class="actions-row two">
        <button class="btn btn-main" data-action="add-exo-session" data-id="${exercise.id}">Ajouter à Ma séance</button>
        <button class="btn btn-outline" data-action="ai-around-exo" data-id="${exercise.id}">Séance IA autour</button>
      </div>
    </article>
  `;
}

export function renderNoushiHome(node) {
  ensureLiteYouTubeEmbed().catch(() => {});
  const completedChallenges = getCompletedChallenges();
  const challenges = getNoushiChallengesByPlace(state.noushiFilter.place);
  const spotlights = getNoushiBeastSpotlights(state.noushiFilter.place);
  const spotlight = spotlights[0];
  const spotlightExercise = spotlight ? EXO_BY_ID.get(spotlight.exerciseId) : null;

  node.innerHTML = `
    <div class="section noushi-screen">
      <div class="card noushi-hero">
        <div class="eyebrow">NOUSHI APP</div>
        <h2>Le mode qui ne te laisse aucun prétexte</h2>
        <p>NOUSHI garde maintenant un vrai mode <strong>${escapeHtml(getPlaceLabel(state.noushiFilter.place))}</strong> pour basculer vite entre maison et salle sans quitter l’univers brutal.</p>

        ${renderPlaceToggle(state.noushiFilter.place)}

        <div class="noushi-hero-stats">
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Badge</span>
            <strong>${completedChallenges.length ? "débloqué" : "verrouillé"}</strong>
          </div>
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Défis tenus</span>
            <strong>${completedChallenges.length}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Bestiaire</span>
            <strong>${spotlights.length} exos</strong>
          </div>
        </div>

        <div class="actions-row two">
          <button class="btn btn-bad" data-action="go-page" data-page="noushi-session">Ouvrir les séances NOUSHI</button>
          <button class="btn btn-outline" data-action="go-page" data-page="noushi-exos">Ouvrir les exercices NOUSHI</button>
        </div>
      </div>

      <div class="noushi-home-grid">
        <div class="card noushi-home-panel">
          <div class="native-block-head">
            <div>
              <div class="eyebrow">Séances • ${escapeHtml(getPlaceLabel(state.noushiFilter.place))}</div>
              <h3>${escapeHtml(challenges[0]?.nom || "Défis NOUSHI")}</h3>
            </div>
            <span class="pill">${challenges.length} défis</span>
          </div>
          <p class="muted">${escapeHtml(challenges[0]?.promesse || "Défis denses, techniques et volontairement hostiles.")}</p>
          <button class="btn btn-main" data-action="go-page" data-page="noushi-session">Voir tous les défis</button>
        </div>

        <div class="card noushi-home-panel">
          <div class="native-block-head">
            <div>
              <div class="eyebrow">Exercices • ${escapeHtml(getPlaceLabel(state.noushiFilter.place))}</div>
              <h3>${escapeHtml(spotlightExercise?.nom || "Bestiaire")}</h3>
            </div>
            <span class="pill">${spotlight ? escapeHtml(spotlight.surnom) : "monstre"}</span>
          </div>
          <p class="muted">${escapeHtml(spotlight?.description || "Les mouvements les plus difficiles de l’écosystème NOUSHI.")}</p>
          <button class="btn btn-outline" data-action="go-page" data-page="noushi-exos">Voir le bestiaire</button>
        </div>
      </div>
    </div>
  `;
}

export function renderNoushiSession(node) {
  ensureLiteYouTubeEmbed().catch(() => {});
  const completedChallenges = getCompletedChallenges();
  const challenges = getNoushiChallengesByPlace(state.noushiFilter.place);

  node.innerHTML = `
    <div class="section noushi-screen">
      <div class="card noushi-hero compact">
        <div class="eyebrow">NOUSHI • Séances</div>
        <h2>Défis hardcore ${escapeHtml(getPlaceLabel(state.noushiFilter.place))}</h2>
        <p>Choisis un défi par zone et par lieu. Le badge ne tombe que si la séance est tenue sans abandon.</p>
        ${renderPlaceToggle(state.noushiFilter.place)}
      </div>

      <div class="noushi-challenge-grid">
        ${challenges.map((challenge) => renderChallengeCard(
          challenge,
          completedChallenges.filter((entry) => (
            entry.metadata?.challengeId === challenge.id
            && (entry.metadata?.challengePlace || "mixte") === challenge.effectivePlace
          )).length
        )).join("")}
      </div>
    </div>
  `;
}

export function renderNoushiExos(node) {
  ensureLiteYouTubeEmbed().catch(() => {});
  const spotlights = getNoushiBeastSpotlights(state.noushiFilter.place);

  node.innerHTML = `
    <div class="section noushi-screen">
      <div class="card noushi-hero compact">
        <div class="eyebrow">NOUSHI • Exercices</div>
        <h2>Bestiaire ${escapeHtml(getPlaceLabel(state.noushiFilter.place))}</h2>
        <p>Même logique que le pôle exercices Maya Coach, mais concentrée ici sur les mouvements les plus durs du mode ${escapeHtml(getPlaceLabel(state.noushiFilter.place))}.</p>
        ${renderPlaceToggle(state.noushiFilter.place)}
      </div>

      <div class="list">
        ${spotlights.length
          ? spotlights.map(renderSpotlightCard).join("")
          : buildEmptyState("Aucun monstre trouvé", "Passe en mode mixte pour voir l’ensemble du bestiaire NOUSHI.", "", "")}
      </div>
    </div>
  `;
}

export function renderNoushi(node) {
  renderNoushiHome(node);
}
