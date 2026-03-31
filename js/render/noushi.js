import { EXO_BY_ID, getNoushiChallengesByPlace } from "../catalog.js";
import { NOUSHI_ELITE_LIBRARY, NOUSHI_IMPOSSIBLE_TOP, NOUSHI_REALITY_CHECK } from "../../data/noushi-elite.js";
import { ensureLiteYouTubeEmbed } from "../lite-youtube.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml } from "../utils.js";
import { icon } from "../ui.js";

function getPlaceLabel(place) {
  return {
    maison: "Maison",
    salle: "Salle",
    mixte: "Mixte"
  }[place] || "Mixte";
}

function renderExerciseVideo(item) {
  if (!item?.videoId || !/^[A-Za-z0-9_-]{11}$/.test(String(item.videoId || ""))) {
    return `<div class="video-missing">Vidéo YouTube validée non disponible pour ce mouvement.</div>`;
  }

  return `<lite-youtube videoid="${escapeHtml(item.videoId)}" title="${escapeHtml(item.title)}" playlabel="Lire la vidéo ${escapeHtml(item.title)}" params="rel=0&modestbranding=2"></lite-youtube>`;
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

function getVisibleEliteGroups(place = "mixte") {
  if (place === "maison") {
    return NOUSHI_ELITE_LIBRARY.maison.map((group) => ({ ...group, place: "maison" }));
  }
  if (place === "salle") {
    return NOUSHI_ELITE_LIBRARY.salle.map((group) => ({ ...group, place: "salle" }));
  }
  return [
    ...NOUSHI_ELITE_LIBRARY.salle.map((group) => ({ ...group, place: "salle" })),
    ...NOUSHI_ELITE_LIBRARY.maison.map((group) => ({ ...group, place: "maison" }))
  ];
}

function getVisibleEliteCount(place = "mixte") {
  return getVisibleEliteGroups(place).reduce((total, group) => total + group.items.length, 0);
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

function renderEliteGroup(group) {
  return `
    <article class="noushi-elite-group">
      <div class="noushi-elite-head">
        <div>
          <div class="eyebrow">${escapeHtml(getPlaceLabel(group.place))} • ${escapeHtml(group.title)}</div>
          <h3>${escapeHtml(group.title)}</h3>
          <p>${escapeHtml(group.mood)}</p>
        </div>
        <span class="pill">${group.items.length} mouvements</span>
      </div>

      <div class="noushi-elite-gallery">
        ${group.illustrations.map((url) => `<img src="${escapeHtml(url)}" alt="${escapeHtml(group.title)} ${escapeHtml(getPlaceLabel(group.place))}" loading="lazy" decoding="async" />`).join("")}
      </div>

      <div class="noushi-elite-list">
        ${group.items.map((item) => `
          <details class="noushi-elite-item">
            <summary>
              <span>
                <strong>${escapeHtml(item.title)}</strong>
                <small>${escapeHtml(item.note)}</small>
              </span>
              <span class="pill pill-soft">élite mondiale</span>
            </summary>
            <div class="noushi-elite-content">
              <p>${escapeHtml(item.note)}</p>
              <div class="video-container">${renderExerciseVideo(item)}</div>
            </div>
          </details>
        `).join("")}
      </div>
    </article>
  `;
}

function renderImpossibleBlock() {
  return `
    <article class="noushi-impossible-card">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Top 5 presque impossibles</div>
          <h3>Le délire élite mondiale</h3>
        </div>
      </div>
      <ol class="noushi-top-five">
        ${NOUSHI_IMPOSSIBLE_TOP.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ol>
      <div class="helper-note alert-note">${NOUSHI_REALITY_CHECK.map((item) => escapeHtml(item)).join(" • ")}</div>
    </article>
  `;
}

export function renderNoushiHome(node) {
  ensureLiteYouTubeEmbed().catch(() => {});
  const completedChallenges = getCompletedChallenges();
  const challenges = getNoushiChallengesByPlace(state.noushiFilter.place);
  const eliteGroups = getVisibleEliteGroups(state.noushiFilter.place);

  node.innerHTML = `
    <div class="section noushi-screen">
      <div class="card noushi-hero">
        <div class="eyebrow">NOUSHI APP</div>
        <h2>Le mode brutal prend enfin du volume</h2>
        <p>Tu as maintenant un vrai split <strong>${escapeHtml(getPlaceLabel(state.noushiFilter.place))}</strong> avec des groupes musculaires, des illustrations ciblées et des mouvements de niveau élite mondiale.</p>

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
            <strong>${getVisibleEliteCount(state.noushiFilter.place)} exos</strong>
          </div>
        </div>

        <div class="actions-row two">
          <button class="btn btn-bad" data-action="go-page" data-page="noushi-session">Ouvrir les séances NOUSHI</button>
          <button class="btn btn-outline" data-action="go-page" data-page="noushi-exos">Ouvrir le bestiaire élite</button>
        </div>
      </div>

      <div class="noushi-home-grid">
        ${eliteGroups.slice(0, 2).map((group) => `
          <div class="card noushi-home-panel">
            <div class="native-block-head">
              <div>
                <div class="eyebrow">${escapeHtml(getPlaceLabel(group.place))}</div>
                <h3>${escapeHtml(group.title)}</h3>
              </div>
              <span class="pill">${group.items.length} exos</span>
            </div>
            <p class="muted">${escapeHtml(group.mood)}</p>
            <div class="exercise-meta">
              ${group.items.slice(0, 2).map((item) => `<span class="pill pill-soft">${escapeHtml(item.title)}</span>`).join("")}
            </div>
            <button class="btn btn-outline" data-action="go-page" data-page="noushi-exos">Voir le détail</button>
          </div>
        `).join("")}
      </div>

      ${renderImpossibleBlock()}
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
        <p>Le mode séance reste compact, mais il est maintenant soutenu par un vrai bestiaire maison / salle juste derrière.</p>
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
  const eliteGroups = getVisibleEliteGroups(state.noushiFilter.place);

  node.innerHTML = `
    <div class="section noushi-screen">
      <div class="card noushi-hero compact">
        <div class="eyebrow">NOUSHI • Exercices</div>
        <h2>Bestiaire ${escapeHtml(getPlaceLabel(state.noushiFilter.place))}</h2>
        <p>Version enrichie: salle par groupe musculaire, maison par groupe musculaire, exercices élite mondiale, vidéos et reality check intégré.</p>
        ${renderPlaceToggle(state.noushiFilter.place)}
      </div>

      <div class="noushi-elite-stack">
        ${eliteGroups.length
          ? eliteGroups.map(renderEliteGroup).join("")
          : buildEmptyState("Aucun monstre trouvé", "Passe en mode mixte pour voir l'ensemble du bestiaire NOUSHI.", "", "")}
      </div>

      ${renderImpossibleBlock()}
    </div>
  `;
}
