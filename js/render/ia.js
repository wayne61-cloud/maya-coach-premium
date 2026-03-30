import { getCycleHeadline } from "../ai.js";
import { EXO_BY_ID } from "../catalog.js";
import { getAppDiagnostics } from "../diagnostics.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml, formatDateTime } from "../utils.js";
import { icon, renderCountup } from "../ui.js";

function readDraftValue(field, fallback) {
  return state.aiDraft?.[field] || fallback;
}

function renderPlanPreview(plan) {
  if (!plan) {
    return buildEmptyState("Aucune séance prête", "Génère une séance pour afficher son plan, son score et ses blocs.", "", "");
  }

  return `
    <div class="coach-preview-card">
      <div class="coach-preview-top">
        <div>
          <strong>${escapeHtml(plan.title)}</strong>
          <span>${plan.estimatedDurationMin} min • ${escapeHtml(plan.metadata?.dominantPattern || "mixte")}</span>
        </div>
        <button class="ghost-link" data-action="start-generated-plan">Démarrer</button>
      </div>
      <div class="coach-quality-meter">
        <div class="coach-quality-head">
          <span>Qualité du plan</span>
          <strong>${renderCountup(plan.metadata?.coherenceScore || 0, { suffix: "/100" })}</strong>
        </div>
        <div class="coach-progress-track">
          <div class="coach-progress-fill" style="width:${Math.max(6, plan.metadata?.coherenceScore || 0)}%"></div>
        </div>
      </div>
      <div class="coach-block-list">
        ${plan.blocks.map((block, index) => {
          const exercise = EXO_BY_ID.get(block.exerciseId);
          return `
            <div class="coach-block-row">
              <div>
                <strong>${String.fromCharCode(65 + index)}. ${escapeHtml(exercise?.nom || block.exerciseId)}</strong>
                <span>${block.sets} séries • ${escapeHtml(block.reps)}</span>
              </div>
              <small>${block.restSec}s</small>
            </div>
          `;
        }).join("")}
      </div>
      <details class="coach-accordion">
        <summary>Voir la logique du coach</summary>
        <div class="coach-grid">
          <div><strong>Warm-up</strong><br>${plan.warmup.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
          <div><strong>Justification</strong><br>${(plan.metadata?.justification || []).map((item) => `• ${escapeHtml(item)}`).join("<br>") || "Aucune"}</div>
          <div><strong>Coach</strong><br>${plan.coachReasoning.map((item) => `• ${escapeHtml(item)}`).join("<br>")}</div>
        </div>
      </details>
    </div>
  `;
}

function renderCoachSheet(profile, diagnostics) {
  if (!state.coachSheetOpen) return "";

  return `
    <div class="sheet-backdrop" data-action="close-sheet" data-sheet="coach"></div>
    <div class="bottom-sheet coach-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <div>
          <div class="eyebrow">Paramètres séance</div>
          <h3>Modifier les paramètres</h3>
        </div>
        <button class="ghost-link" data-action="close-sheet" data-sheet="coach">Fermer</button>
      </div>

      <div class="sheet-grid">
        <div class="field-stack">
          <label class="field-label" for="iaTime">Temps</label>
          <div class="field-shell surface-form">
            <select id="iaTime">
              ${[20, 25, 35, 45, 60].map((value) => `<option value="${value}" ${String(value) === String(readDraftValue("time", profile.sessionTime || 35)) ? "selected" : ""}>${value} min</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="iaPlace">Lieu</label>
          <div class="field-shell surface-form">
            <select id="iaPlace">
              <option value="maison" ${readDraftValue("place", profile.place || "maison") === "maison" ? "selected" : ""}>Maison</option>
              <option value="salle" ${readDraftValue("place", profile.place || "maison") === "salle" ? "selected" : ""}>Salle</option>
              <option value="mixte" ${readDraftValue("place", profile.place || "maison") === "mixte" ? "selected" : ""}>Mixte</option>
            </select>
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="iaZone">Zone</label>
          <div class="field-shell surface-form">
            <select id="iaZone">
              ${[
                ["haut", "Haut"],
                ["bas", "Bas"],
                ["core", "Core"],
                ["full", "Full body"]
              ].map(([value, label]) => `<option value="${value}" ${readDraftValue("zone", "full") === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="iaEnergy">Énergie</label>
          <div class="field-shell surface-form">
            <select id="iaEnergy">
              ${[
                ["fatigue", "Fatigué"],
                ["normal", "Normal"],
                ["high", "Très en forme"]
              ].map(([value, label]) => `<option value="${value}" ${readDraftValue("energy", "normal") === value ? "selected" : ""}>${label}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="iaGoal">Objectif</label>
          <div class="field-shell surface-form">
            <select id="iaGoal">
              ${["muscle", "force", "endurance", "seche"].map((goal) => `<option value="${goal}" ${readDraftValue("goal", profile.goal || "muscle") === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="iaLevel">Niveau</label>
          <div class="field-shell surface-form">
            <select id="iaLevel">
              <option value="1" ${readDraftValue("level", profile.level || "2") === "1" ? "selected" : ""}>Débutant</option>
              <option value="2" ${readDraftValue("level", profile.level || "2") === "2" ? "selected" : ""}>Intermédiaire</option>
              <option value="3" ${readDraftValue("level", profile.level || "2") === "3" ? "selected" : ""}>Avancé</option>
            </select>
          </div>
        </div>
      </div>

      <details class="coach-accordion">
        <summary>Options avancées IA</summary>
        <div class="coach-grid">
          <div><strong>Source</strong><br>${escapeHtml(state.aiRuntime.source || state.aiConfig.mode)} • ${escapeHtml(state.aiRuntime.status || "idle")}</div>
          <div><strong>Dernier test</strong><br>${state.aiRuntime.lastCheckedAt ? escapeHtml(formatDateTime(state.aiRuntime.lastCheckedAt)) : "jamais"}</div>
          <div><strong>Recherche web</strong><br>${state.aiConfig.webSearch ? "Activée" : "Désactivée"}</div>
          <div><strong>Cloud</strong><br>${diagnostics.proxyPublicBlocked ? "Proxy public manquant" : "Configuration disponible"}</div>
        </div>
      </details>

      <button class="btn btn-main sheet-cta" data-action="close-sheet" data-sheet="coach">Valider les paramètres</button>
    </div>
  `;
}

export function renderIA(node) {
  const diagnostics = getAppDiagnostics();
  const profile = state.profile || {};
  const currentPlan = state.currentPlan;
  const preferredExerciseName = state.aiDraft?.preferredExerciseId ? EXO_BY_ID.get(state.aiDraft.preferredExerciseId)?.nom : "";
  const athleteIdentity = [profile.name, profile.age ? `${profile.age} ans` : "", profile.weightKg ? `${profile.weightKg} kg` : ""].filter(Boolean).join(" • ");
  const fatigue = currentPlan?.metadata?.fatigueLoad || 0;
  const quality = currentPlan?.metadata?.coherenceScore || 0;

  node.innerHTML = `
    <div class="section coach-screen">
      <div class="card module-coach coach-summary-card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Coach</div>
            <h2>Ta prochaine séance</h2>
            <p class="muted">Le brief ne prend plus tout l’écran. Il vit dans un panneau mobile plus natif.</p>
          </div>
          <button class="control-chip" data-action="open-sheet" data-sheet="coach">${icon("filter", "", 14)} Modifier</button>
        </div>

        <div class="coach-summary-grid">
          <div class="coach-summary-pill">
            <span>${icon("profile", "", 14)} Profil</span>
            <strong>${escapeHtml(athleteIdentity || "Profil à compléter")}</strong>
          </div>
          <div class="coach-summary-pill">
            <span>${icon("calendar", "", 14)} Cycle</span>
            <strong>${escapeHtml(getCycleHeadline())}</strong>
          </div>
          <div class="coach-summary-pill">
            <span>${icon("spark", "", 14)} Focus</span>
            <strong>${escapeHtml(preferredExerciseName || "Aucun focus")}</strong>
          </div>
        </div>

        <div class="coach-compact-stats">
          <div class="coach-mini-meter">
            <div class="coach-mini-meter-top">
              <span>Charge</span>
              <strong>${renderCountup(fatigue, { suffix: "/100" })}</strong>
            </div>
            <div class="coach-progress-track"><div class="coach-progress-fill coral" style="width:${Math.max(4, fatigue)}%"></div></div>
          </div>
          <div class="coach-mini-meter">
            <div class="coach-mini-meter-top">
              <span>Cohérence</span>
              <strong>${renderCountup(quality, { suffix: "/100" })}</strong>
            </div>
            <div class="coach-progress-track"><div class="coach-progress-fill" style="width:${Math.max(4, quality)}%"></div></div>
          </div>
        </div>

        <button class="btn btn-main dashboard-cta" data-action="generate-plan">Générer ma séance</button>

        <div class="support-line">
          <span>${icon("bolt", "", 14)} ${escapeHtml(readDraftValue("time", profile.sessionTime || "35"))} min</span>
          <span>${icon("dumbbell", "", 14)} ${escapeHtml(readDraftValue("place", profile.place || "mixte"))}</span>
          <span>${icon("fire", "", 14)} ${escapeHtml(readDraftValue("goal", profile.goal || "muscle"))}</span>
        </div>

        ${state.aiRuntime.status === "connecting" ? `
          <div class="coach-shimmer-card">
            <div class="shimmer-line large"></div>
            <div class="shimmer-line"></div>
            <div class="shimmer-line short"></div>
          </div>
        ` : ""}

        ${diagnostics.proxyPublicBlocked ? `
          <div class="helper-note alert-note">
            Le mode Internet sécurisé reste en local tant qu’aucun proxy public n’est branché.
          </div>
        ` : ""}
      </div>

      <div class="card module-coach coach-preview-shell">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Plan</div>
            <h3>Aperçu coach</h3>
          </div>
          <span class="pill">${escapeHtml(state.aiRuntime.source || state.aiConfig.mode)}</span>
        </div>
        ${renderPlanPreview(currentPlan)}
      </div>

      ${renderCoachSheet(profile, diagnostics)}
    </div>
  `;
}
