import { EXO_BY_ID, getExercisesByPlace, searchExercises } from "../catalog.js";
import { state } from "../state.js";
import { buildCustomWorkoutCoachAlerts, getCustomWorkoutMetrics } from "../workout.js";
import { buildEmptyState, escapeHtml } from "../utils.js";
import { icon } from "../ui.js";

function getPlaceLabel(place) {
  return {
    maison: "Maison",
    salle: "Salle",
    mixte: "Mixte"
  }[place] || place;
}

function renderAlert(alert) {
  return `
    <article class="maya-alert-card tone-${escapeHtml(alert.tone || "calm")}">
      <div class="maya-alert-top">
        <strong>${escapeHtml(alert.title)}</strong>
        <span>${icon(alert.tone === "success" ? "badge" : alert.tone === "alert" ? "fire" : "spark", "", 14)}</span>
      </div>
      <p>${escapeHtml(alert.body)}</p>
    </article>
  `;
}

function renderSessionLibrary() {
  const sessions = state.customWorkoutLibrary || [];
  if (!sessions.length) {
    return buildEmptyState("Aucune séance préparée", "Crée une première séance pour commencer à organiser tes blocs.", "", "");
  }

  return `
    <div class="session-library-grid">
      ${sessions.map((session) => {
        const metrics = getCustomWorkoutMetrics(session);
        const active = session.id === state.activeCustomWorkoutId;
        return `
          <details class="custom-session-summary ${active ? "active" : ""}" ${active ? "open" : ""}>
            <summary>
              <div class="custom-session-summary-top">
                <div>
                  <strong>${escapeHtml(session.title)}</strong>
                  <span>${metrics.exercises.length}/${escapeHtml(session.targetExerciseCount)} exos • ${escapeHtml(getPlaceLabel(session.place))}</span>
                </div>
                <span class="pill">${metrics.plan?.estimatedDurationMin || 0} min</span>
              </div>
            </summary>
            <div class="custom-session-summary-body">
              <div class="exercise-meta">
                <span class="pill">${escapeHtml(session.objective)}</span>
                <span class="pill">${metrics.totalSets} séries</span>
                <span class="pill">${metrics.hardCount} lourd(s)</span>
              </div>
              <div class="selected-exercise-strip">
                ${metrics.exercises.length
                  ? metrics.exercises.slice(0, 4).map((exercise) => `<span class="pill pill-soft">${escapeHtml(exercise.nom)}</span>`).join("")
                  : '<span class="pill pill-soft">Aucun exercice pour l’instant</span>'}
              </div>
              <div class="actions-row two">
                <button class="btn ${active ? "btn-main" : "btn-outline"}" data-action="activate-custom-workout-session" data-id="${escapeHtml(session.id)}">${active ? "Séance active" : "Rendre active"}</button>
                <button class="btn btn-outline" data-action="remove-custom-workout-session" data-id="${escapeHtml(session.id)}" ${sessions.length <= 1 ? "disabled" : ""}>Supprimer</button>
              </div>
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}

function renderPendingChooser() {
  const pendingExercise = EXO_BY_ID.get(state.customWorkoutPendingExerciseId || "");
  const sessions = state.customWorkoutLibrary || [];
  if (!pendingExercise || sessions.length < 2) return "";

  return `
    <div class="card custom-target-sheet">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Choisir la séance cible</div>
          <h3>${escapeHtml(pendingExercise.nom)}</h3>
        </div>
        <button class="ghost-link" data-action="cancel-custom-workout-target">Annuler</button>
      </div>
      <p class="muted">Plusieurs séances existent déjà. Choisis où envoyer cet exercice, ou crée une nouvelle séance dédiée.</p>
      <div class="session-library-grid">
        ${sessions.map((session) => `
          <button class="custom-target-option" data-action="choose-custom-workout-session" data-id="${escapeHtml(session.id)}">
            <strong>${escapeHtml(session.title)}</strong>
            <span>${escapeHtml(getPlaceLabel(session.place))} • ${(session.blocks || []).length} exos</span>
          </button>
        `).join("")}
        <button class="custom-target-option create" data-action="create-custom-workout-session" data-title="Nouvelle séance">
          <strong>Créer une nouvelle séance</strong>
          <span>L’exercice sera ajouté tout de suite dedans.</span>
        </button>
      </div>
    </div>
  `;
}

function renderExerciseSearch(draft) {
  const query = state.customWorkoutSearch || "";
  const results = query.trim().length
    ? searchExercises(query, draft.place, "all").slice(0, 8)
    : getExercisesByPlace(draft.place).slice(0, 6);

  return `
    <div class="card module-exos glow-coral">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Remplir la séance</div>
          <h3>Recherche intelligente</h3>
        </div>
        <span class="pill">${results.length} résultat(s)</span>
      </div>
      <p class="muted">Recherche directe dans le catalogue filtré par lieu. La séance active est <strong>${escapeHtml(draft.title || "Ma séance")}</strong>, mais depuis le pôle exercices tu peux aussi déclencher un choix de séance ou en créer une nouvelle.</p>
      <div class="search-shell">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input id="customSessionSearch" class="search-input" type="text" placeholder="Tractions, hip thrust, pompes..." value="${escapeHtml(query)}" />
        <button class="search-clear ${query ? "visible" : ""}" data-action="clear-custom-session-search">Effacer</button>
      </div>
      <div class="list compact-list">
        ${results.length
          ? results.map((exercise) => `
            <article class="custom-search-result">
              <div>
                <strong>${escapeHtml(exercise.nom)}</strong>
                <span>${escapeHtml(exercise.muscle)} • ${escapeHtml(exercise.pattern)} • ${escapeHtml(getPlaceLabel(exercise.pole))}</span>
              </div>
              <button class="btn btn-main" data-action="add-exo-active-session" data-id="${exercise.id}">Ajouter à ${escapeHtml(draft.title || "la séance active")}</button>
            </article>
          `).join("")
          : buildEmptyState("Aucun exercice trouvé", "Essaie un autre mot-clé ou élargis le lieu de séance.", "", "")}
      </div>
    </div>
  `;
}

function renderBlocks(draft) {
  return `
    <div class="list">
      ${(draft.blocks || []).map((block, index) => {
        const exercise = EXO_BY_ID.get(block.exerciseId);
        return `
          <details class="custom-block-card" ${index === 0 ? "open" : ""}>
            <summary>
              <div class="custom-block-summary">
                <div>
                  <strong>Bloc ${index + 1} • ${escapeHtml(exercise?.nom || "Exercice")}</strong>
                  <span>${escapeHtml(exercise?.muscle || "prescription")} • ${escapeHtml(getPlaceLabel(exercise?.pole || draft.place))}</span>
                </div>
                <span class="pill">${escapeHtml(block.sets)} x ${escapeHtml(block.reps)}</span>
              </div>
            </summary>
            <div class="custom-block-body">
              <div class="settings-grid compact-grid">
                <div class="field-stack full-span">
                  <label class="field-label" for="customExercise-${escapeHtml(block.id)}">Exercice</label>
                  <div class="field-shell surface-form">
                    <select id="customExercise-${escapeHtml(block.id)}" data-custom-block-id="${escapeHtml(block.id)}" data-custom-block-field="exerciseId">
                      ${getExercisesByPlace(draft.place).map((item) => `
                        <option value="${escapeHtml(item.id)}" ${item.id === block.exerciseId ? "selected" : ""}>${escapeHtml(item.nom)} • ${escapeHtml(item.muscle)}</option>
                      `).join("")}
                    </select>
                  </div>
                </div>
                <div class="field-stack">
                  <label class="field-label" for="customSets-${escapeHtml(block.id)}">Séries</label>
                  <div class="field-shell surface-form">
                    <input id="customSets-${escapeHtml(block.id)}" data-custom-block-id="${escapeHtml(block.id)}" data-custom-block-field="sets" type="number" min="1" max="8" value="${escapeHtml(block.sets)}" />
                  </div>
                </div>
                <div class="field-stack">
                  <label class="field-label" for="customReps-${escapeHtml(block.id)}">Reps / durée</label>
                  <div class="field-shell surface-form">
                    <input id="customReps-${escapeHtml(block.id)}" data-custom-block-id="${escapeHtml(block.id)}" data-custom-block-field="reps" type="text" value="${escapeHtml(block.reps)}" />
                  </div>
                </div>
                <div class="field-stack">
                  <label class="field-label" for="customRest-${escapeHtml(block.id)}">Repos</label>
                  <div class="field-shell surface-form">
                    <input id="customRest-${escapeHtml(block.id)}" data-custom-block-id="${escapeHtml(block.id)}" data-custom-block-field="restSec" type="number" min="20" max="240" value="${escapeHtml(block.restSec)}" />
                  </div>
                </div>
              </div>
              <div class="actions-row two">
                <button class="btn btn-outline" data-action="remove-custom-block" data-id="${escapeHtml(block.id)}" ${(draft.blocks || []).length <= 1 ? "disabled" : ""}>Retirer ce bloc</button>
              </div>
            </div>
          </details>
        `;
      }).join("")}
    </div>
  `;
}

export function renderMySession(node) {
  const draft = state.customWorkoutDraft;
  const metrics = getCustomWorkoutMetrics(draft);
  const alerts = buildCustomWorkoutCoachAlerts(draft);
  const permissionGranted = state.notificationConfig.permission === "granted";

  node.innerHTML = `
    <div class="section my-session-screen">
      <div class="card my-session-hero">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Créer séance</div>
            <h2>Bibliothèque de séances</h2>
            <p class="muted">Prépare plusieurs séances propres, choisis la séance active puis remplis-la depuis la recherche ou depuis le pôle exercices.</p>
          </div>
          <button class="btn btn-main" data-action="create-custom-workout-session">Nouvelle séance</button>
        </div>

        <div class="my-session-kpis">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Séances</span>
            <strong>${(state.customWorkoutLibrary || []).length}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Active</span>
            <strong>${escapeHtml(draft?.title || "Aucune")}</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Objectif</span>
            <strong>${escapeHtml(draft?.objective || "muscle")}</strong>
          </div>
        </div>

        <div class="custom-workout-flow">
          <div class="custom-flow-step">
            <strong>1</strong>
            <span>Choisis la séance active</span>
          </div>
          <div class="custom-flow-step">
            <strong>2</strong>
            <span>Règle le nombre d’exercices</span>
          </div>
          <div class="custom-flow-step">
            <strong>3</strong>
            <span>Ajoute depuis la recherche ou le pôle exercices</span>
          </div>
        </div>
      </div>

      ${renderPendingChooser()}

      <div class="card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Mes séances</div>
            <h3>Sélection active</h3>
          </div>
          <span class="pill">${(state.customWorkoutLibrary || []).length} séance(s)</span>
        </div>
        ${renderSessionLibrary()}
      </div>

      <div class="card maya-alert-panel">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Maya Coach</div>
            <h3>Alertes intelligentes</h3>
          </div>
          <button class="ghost-link" data-action="${permissionGranted ? "send-custom-workout-notification" : "request-notifications"}">
            ${permissionGranted ? "Notifier" : "Activer"}
          </button>
        </div>
        <div class="maya-alert-list">
          ${alerts.map(renderAlert).join("")}
        </div>
      </div>

      <div class="card module-exos glow-coral">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Séance active</div>
            <h3>${escapeHtml(draft.title || "Séance personnalisée")}</h3>
          </div>
          <span class="pill">${metrics.plan?.estimatedDurationMin || 0} min</span>
        </div>

        <div class="settings-grid compact-grid" style="margin-top: 10px;">
          <div class="field-stack full-span">
            <label class="field-label" for="customWorkoutTitle">Nom</label>
            <div class="field-shell surface-form">
              <input id="customWorkoutTitle" data-custom-workout-field="title" type="text" value="${escapeHtml(draft.title || "")}" placeholder="Push du mardi, jambes lourdes..." />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="customWorkoutObjective">Objectif</label>
            <div class="field-shell surface-form">
              <select id="customWorkoutObjective" data-custom-workout-field="objective">
                ${["muscle", "force", "endurance", "seche"].map((goal) => `<option value="${goal}" ${draft.objective === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="customWorkoutPlace">Lieu</label>
            <div class="field-shell surface-form">
              <select id="customWorkoutPlace" data-custom-workout-field="place">
                ${["maison", "salle", "mixte"].map((place) => `<option value="${place}" ${draft.place === place ? "selected" : ""}>${escapeHtml(getPlaceLabel(place))}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="customWorkoutCount">Nombre d’exos</label>
            <div class="field-shell surface-form">
              <input id="customWorkoutCount" data-custom-workout-field="targetExerciseCount" type="number" min="1" max="12" value="${escapeHtml(draft.targetExerciseCount || String((draft.blocks || []).length || 1))}" />
            </div>
          </div>
        </div>

        <div class="selected-exercise-strip">
          ${(metrics.exercises || []).map((exercise) => `<span class="pill pill-soft">${escapeHtml(exercise.nom)}</span>`).join("") || '<span class="pill pill-soft">Ajoute un exercice</span>'}
        </div>

        ${renderBlocks(draft)}

        <div class="actions-row three" style="margin-top: 12px;">
          <button class="btn btn-soft" data-action="add-custom-block">Ajouter un bloc</button>
          <button class="btn btn-outline" data-action="reset-custom-workout">Réinitialiser la séance active</button>
          <button class="btn btn-main" data-action="start-custom-workout">Démarrer la séance active</button>
        </div>
      </div>

      ${renderExerciseSearch(draft)}
    </div>
  `;
}
