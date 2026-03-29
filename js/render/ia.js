import { getCycleHeadline } from "../ai.js";
import { EXO_BY_ID } from "../catalog.js";
import { getAppDiagnostics } from "../diagnostics.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, formatDateTime } from "../utils.js";

function renderPlan(plan) {
  if (!plan) {
    return buildEmptyState("Aucune séance prête", "Renseigne le brief puis génère une séance pour voir l’aperçu coach.", "", "");
  }

  return `
    <div class="compact-plan-card">
      <div class="row-card-head">
        <div>
          <div class="eyebrow">Plan généré</div>
          <div class="row-card-title">${escapeHtml(plan.title)}</div>
        </div>
        <span class="pill pill-calm">${plan.estimatedDurationMin} min</span>
      </div>

      <div class="mini-kpi-row">
        <div class="mini-kpi-card accent-gold">
          <span class="mini-kpi-label">Score</span>
          <strong class="mini-kpi-value">${plan.metadata?.coherenceScore || 0}</strong>
          <span class="mini-kpi-meta">cohérence</span>
        </div>
        <div class="mini-kpi-card accent-blue">
          <span class="mini-kpi-label">Pattern</span>
          <strong class="mini-kpi-value mini-kpi-text">${escapeHtml(plan.metadata?.dominantPattern || "mixte")}</strong>
          <span class="mini-kpi-meta">dominant</span>
        </div>
        <div class="mini-kpi-card accent-coral">
          <span class="mini-kpi-label">Fatigue</span>
          <strong class="mini-kpi-value">${plan.metadata?.fatigueLoad || 0}</strong>
          <span class="mini-kpi-meta">sur 100</span>
        </div>
      </div>

      <div class="compact-plan-list">
        ${plan.blocks.map((block, index) => {
          const exercise = EXO_BY_ID.get(block.exerciseId);
          return `
            <div class="plan-row">
              <div class="plan-row-main">
                <strong>${String.fromCharCode(65 + index)}. ${escapeHtml(exercise?.nom || block.exerciseId)}</strong>
                <span>${block.sets} séries • ${escapeHtml(block.reps)}</span>
              </div>
              <div class="plan-row-meta">${block.restSec}s repos • ${escapeHtml(block.tempo)}</div>
            </div>
          `;
        }).join("")}
      </div>

      <details class="compact-details">
        <summary>Échauffement et logique IA</summary>
        <div class="coach-grid">
          <div><strong>Échauffement</strong><br>${plan.warmup.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
          <div><strong>Coach</strong><br>${plan.coachReasoning.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
          <div><strong>Justification</strong><br>${(plan.metadata?.justification || []).map((item) => `• ${escapeHtml(item)}`).join("<br>") || "Aucune"}</div>
          <div><strong>Finisher</strong><br>${escapeHtml(plan.finisher)}</div>
        </div>
      </details>
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
    <div class="section compact-shell">
      <div class="card module-coach glow-gold compact-coach-shell">
        <div class="row-card-head">
          <div>
            <div class="eyebrow">Coach</div>
            <h2>Brief séance</h2>
            <p class="muted">Un seul formulaire compact, une seule action principale, puis un aperçu clair du plan.</p>
          </div>
          <span class="pill">${escapeHtml(state.aiRuntime.source || state.aiConfig.mode)}</span>
        </div>

        <div class="mini-kpi-row">
          <div class="mini-kpi-card accent-gold">
            <span class="mini-kpi-label">Profil</span>
            <strong class="mini-kpi-value mini-kpi-text">${escapeHtml(athleteIdentity || "à compléter")}</strong>
            <span class="mini-kpi-meta">personnalisation</span>
          </div>
          <div class="mini-kpi-card accent-blue">
            <span class="mini-kpi-label">Cycle</span>
            <strong class="mini-kpi-value mini-kpi-text">${escapeHtml(getCycleHeadline())}</strong>
            <span class="mini-kpi-meta">bloc actuel</span>
          </div>
          <div class="mini-kpi-card accent-coral">
            <span class="mini-kpi-label">Source</span>
            <strong class="mini-kpi-value mini-kpi-text">${escapeHtml(state.aiRuntime.status || "idle")}</strong>
            <span class="mini-kpi-meta">${state.aiRuntime.latencyMs || 0} ms</span>
          </div>
        </div>

        <div class="settings-grid compact-grid compact-form-grid">
          <div class="field-stack">
            <label class="field-label" for="iaTime">Temps</label>
            <div class="field-shell surface-form">
              <select id="iaTime">
                ${[20, 25, 35, 45, 60].map((value) => `<option value="${value}" ${String(value) === String(draft.time || profile.sessionTime || 35) ? "selected" : ""}>${value} min</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="iaPlace">Lieu</label>
            <div class="field-shell surface-form">
              <select id="iaPlace">
                <option value="maison" ${(draft.place || profile.place || "maison") === "maison" ? "selected" : ""}>Maison</option>
                <option value="salle" ${(draft.place || profile.place || "maison") === "salle" ? "selected" : ""}>Salle</option>
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="iaZone">Zone</label>
            <div class="field-shell surface-form">
              <select id="iaZone">
                <option value="haut" ${(draft.zone || "full") === "haut" ? "selected" : ""}>Haut</option>
                <option value="bas" ${(draft.zone || "full") === "bas" ? "selected" : ""}>Bas</option>
                <option value="core" ${(draft.zone || "full") === "core" ? "selected" : ""}>Core</option>
                <option value="full" ${(draft.zone || "full") === "full" ? "selected" : ""}>Full body</option>
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="iaEnergy">Énergie</label>
            <div class="field-shell surface-form">
              <select id="iaEnergy">
                <option value="fatigue" ${(draft.energy || "normal") === "fatigue" ? "selected" : ""}>Fatigué</option>
                <option value="normal" ${(draft.energy || "normal") === "normal" ? "selected" : ""}>Normal</option>
                <option value="high" ${(draft.energy || "normal") === "high" ? "selected" : ""}>Très en forme</option>
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="iaGoal">Objectif</label>
            <div class="field-shell surface-form">
              <select id="iaGoal">
                ${["muscle", "force", "endurance", "seche"].map((goal) => `<option value="${goal}" ${(draft.goal || profile.goal || "muscle") === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="iaLevel">Niveau</label>
            <div class="field-shell surface-form">
              <select id="iaLevel">
                <option value="1" ${(draft.level || profile.level || "2") === "1" ? "selected" : ""}>Débutant</option>
                <option value="2" ${(draft.level || profile.level || "2") === "2" ? "selected" : ""}>Intermédiaire</option>
                <option value="3" ${(draft.level || profile.level || "2") === "3" ? "selected" : ""}>Avancé</option>
              </select>
            </div>
          </div>
        </div>

        <div class="helper-note calm-note">
          Focus ${escapeHtml(preferredExerciseName || "aucun")} • profil ${escapeHtml(athleteIdentity || "incomplet")} • web ${state.aiConfig.webSearch ? "activé" : "désactivé"}
          <br />
          Dernier check ${state.aiRuntime.lastCheckedAt ? escapeHtml(formatDateTime(state.aiRuntime.lastCheckedAt)) : "jamais"}
          ${state.aiRuntime.error ? `• ${escapeHtml(state.aiRuntime.error)}` : ""}
        </div>

        ${diagnostics.proxyPublicBlocked ? `
          <div class="helper-note alert-note">
            Le mode Internet sécurisé pointe encore vers <strong>localhost</strong>. L’app publique reste donc en local tant qu’un proxy public n’est pas branché.
          </div>
        ` : ""}

        <button class="btn btn-main compact-primary-btn" data-action="generate-plan">Générer ma séance</button>
      </div>

      <div class="card module-coach">
        <div class="row-card-head">
          <div>
            <div class="eyebrow">Aperçu</div>
            <h3>Plan du coach</h3>
          </div>
          <button class="btn btn-soft btn-inline" data-action="start-generated-plan" ${currentPlan ? "" : "disabled"}>Démarrer</button>
        </div>
        ${renderPlan(currentPlan)}
      </div>
    </div>
  `;
}
