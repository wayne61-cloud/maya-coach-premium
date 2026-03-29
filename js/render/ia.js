import { EXO_BY_ID } from "../catalog.js";
import { getCycleHeadline } from "../ai.js";
import { getAppDiagnostics } from "../diagnostics.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, formatDateTime } from "../utils.js";

function renderPlan(plan) {
  if (!plan) {
    return buildEmptyState("Aucune séance générée", "Génère une séance IA ou lance un focus à partir d'un exercice.", "", "");
  }

  const blocksHtml = plan.blocks.map((block, index) => {
    const exercise = EXO_BY_ID.get(block.exerciseId);
    return `
      <div class="plan-block">
        <div class="plan-title">Bloc ${String.fromCharCode(65 + index)} • ${escapeHtml(exercise?.nom || block.exerciseId)}</div>
        <div class="muted">${block.sets} séries • ${escapeHtml(block.reps)} • repos ${block.restSec}s • tempo ${escapeHtml(block.tempo)}</div>
        <div class="muted">${escapeHtml(exercise?.muscle || "")} • ${escapeHtml(exercise?.equipement || "")}</div>
      </div>
    `;
  }).join("");

  return `
    <div class="plan-block">
      <div class="plan-title">${escapeHtml(plan.title)}</div>
      <div class="muted">Durée estimée: ${plan.estimatedDurationMin} min • Source: ${escapeHtml(state.aiRuntime.source || "local")} • ${escapeHtml(getCycleHeadline())}</div>
      ${state.aiRuntime.error ? `<div class="muted">Fallback local: ${escapeHtml(state.aiRuntime.error)}</div>` : ""}
    </div>
    <div class="plan-block">
      <div class="plan-title">Cohérence coach</div>
      <div class="muted">Score ${plan.metadata?.coherenceScore || 0}/100 • Pattern dominant ${escapeHtml(plan.metadata?.dominantPattern || "mixte")} • Fatigue ${plan.metadata?.fatigueLoad || 0}/100</div>
      <div class="muted">${(plan.metadata?.justification || []).map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
    </div>
    <div class="plan-block">
      <div class="plan-title">Échauffement</div>
      <div class="muted">${plan.warmup.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
    </div>
    ${blocksHtml}
    <div class="plan-block">
      <div class="plan-title">Finisher</div>
      <div class="muted">${escapeHtml(plan.finisher)}</div>
    </div>
    <div class="plan-block">
      <div class="plan-title">Logique IA</div>
      <div class="muted">${plan.coachReasoning.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
    </div>
  `;
}

export function renderIA(node) {
  const diagnostics = getAppDiagnostics();
  const draft = state.aiDraft || {};
  const profile = state.profile || {};
  const currentPlan = state.currentPlan;
  const preferredExerciseName = draft.preferredExerciseId ? EXO_BY_ID.get(draft.preferredExerciseId)?.nom : "";
  const athleteIdentity = [profile.name, profile.age ? `${profile.age} ans` : "", profile.weightKg ? `${profile.weightKg} kg` : ""].filter(Boolean).join(" • ");

  node.innerHTML = `
    <div class="section">
      <div class="card module-coach glow-gold">
        <h2>Coach IA premium</h2>
        <p class="muted">Page de travail IA: génération de séance, contrôle de l’énergie, exercice focus et explication du plan. Les paramètres techniques sont maintenant dans l’onglet Paramètres.</p>

        <div class="settings-summary-grid" style="margin-top: 10px;">
          <div class="summary-chip">
            <span class="summary-label">Profil</span>
            <strong>${escapeHtml(athleteIdentity || "À compléter")}</strong>
          </div>
          <div class="summary-chip">
            <span class="summary-label">Source IA</span>
            <strong>${escapeHtml(state.aiRuntime.source || state.aiConfig.mode)}</strong>
          </div>
          <div class="summary-chip">
            <span class="summary-label">Cycle</span>
            <strong>${escapeHtml(getCycleHeadline())}</strong>
          </div>
        </div>

        <div class="search-module" style="margin-top: 12px;">
          <div class="search-module-head">
            <div>
              <h3>Brief séance</h3>
              <p class="muted">Formulaire repensé en mode mobile: lisible, compact et centré sur les variables qui changent la séance.</p>
            </div>
          </div>

          <div class="settings-grid compact-grid">
          <div class="field-group">
            <label class="field-label" for="iaTime">Temps disponible</label>
            <div class="field-shell">
              <select id="iaTime">
                ${[20, 25, 35, 45, 60].map((value) => `<option value="${value}" ${String(value) === String(draft.time || profile.sessionTime || 35) ? "selected" : ""}>${value} min</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaPlace">Lieu</label>
            <div class="field-shell">
              <select id="iaPlace">
                <option value="maison" ${(draft.place || profile.place || "maison") === "maison" ? "selected" : ""}>Maison</option>
                <option value="salle" ${(draft.place || profile.place || "maison") === "salle" ? "selected" : ""}>Salle</option>
              </select>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaZone">Zone</label>
            <div class="field-shell">
              <select id="iaZone">
                <option value="haut" ${(draft.zone || "full") === "haut" ? "selected" : ""}>Haut</option>
                <option value="bas" ${(draft.zone || "full") === "bas" ? "selected" : ""}>Bas</option>
                <option value="core" ${(draft.zone || "full") === "core" ? "selected" : ""}>Core</option>
                <option value="full" ${(draft.zone || "full") === "full" ? "selected" : ""}>Full body</option>
              </select>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaEnergy">Énergie</label>
            <div class="field-shell">
              <select id="iaEnergy">
                <option value="fatigue" ${(draft.energy || "normal") === "fatigue" ? "selected" : ""}>Fatigué</option>
                <option value="normal" ${(draft.energy || "normal") === "normal" ? "selected" : ""}>Normal</option>
                <option value="high" ${(draft.energy || "normal") === "high" ? "selected" : ""}>Très en forme</option>
              </select>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaGoal">Objectif</label>
            <div class="field-shell">
              <select id="iaGoal">
                ${["muscle", "force", "endurance", "seche"].map((goal) => `<option value="${goal}" ${(draft.goal || profile.goal || "muscle") === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaLevel">Niveau</label>
            <div class="field-shell">
              <select id="iaLevel">
                <option value="1" ${(draft.level || profile.level || "2") === "1" ? "selected" : ""}>Débutant</option>
                <option value="2" ${(draft.level || profile.level || "2") === "2" ? "selected" : ""}>Intermédiaire</option>
                <option value="3" ${(draft.level || profile.level || "2") === "3" ? "selected" : ""}>Avancé</option>
              </select>
            </div>
          </div>
        </div>
        </div>

        <div class="plan-block">
          <div class="plan-title">${escapeHtml(getCycleHeadline())}</div>
          <div class="muted">Exercice focus: ${escapeHtml(preferredExerciseName || "aucun")} • Entrée historique: ${escapeHtml(draft.previousEntryId || "aucune")}</div>
          <div class="muted">Profil utilisé: ${escapeHtml(athleteIdentity || "nom, âge et poids non complets")}</div>
        </div>

        <div class="actions-row two">
          <button class="btn btn-main" data-action="generate-plan">Générer la séance IA</button>
          <button class="btn btn-soft" data-action="start-generated-plan" ${currentPlan ? "" : "disabled"}>Démarrer la séance</button>
        </div>
        <div class="ia-source-status" id="iaSourceStatus" style="margin-top: 10px;">
          <strong>Source IA:</strong> ${escapeHtml(state.aiRuntime.source || state.aiConfig.mode)} • statut ${escapeHtml(state.aiRuntime.status || "idle")} • latence ${state.aiRuntime.latencyMs || 0} ms
          <br />
          <strong>Dernier test:</strong> ${state.aiRuntime.lastCheckedAt ? escapeHtml(formatDateTime(state.aiRuntime.lastCheckedAt)) : "jamais"} • web ${state.aiConfig.webSearch ? "activé" : "désactivé"}
          <br />
          <strong>Réglages avancés:</strong> disponibles dans l’onglet Paramètres
        </div>
        ${diagnostics.proxyPublicBlocked ? `
          <div class="helper-note alert-note" style="margin-top: 10px;">
            Ici, le proxy sécurisé pointe encore vers <strong>localhost</strong>. Sur l’app publique, l’IA utilisera donc le moteur local tant qu’aucun proxy public n’est branché.
          </div>
        ` : ""}
      </div>

      <div class="card module-coach">
        <h3>Plan généré</h3>
        <div class="section">${renderPlan(currentPlan)}</div>
      </div>
    </div>
  `;
}
