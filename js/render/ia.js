import { EXO_BY_ID } from "../catalog.js";
import { getCycleHeadline } from "../ai.js";
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
  const draft = state.aiDraft || {};
  const profile = state.profile || {};
  const currentPlan = state.currentPlan;
  const preferredExerciseName = draft.preferredExerciseId ? EXO_BY_ID.get(draft.preferredExerciseId)?.nom : "";
  const athleteIdentity = [profile.name, profile.age ? `${profile.age} ans` : "", profile.weightKg ? `${profile.weightKg} kg` : ""].filter(Boolean).join(" • ");

  node.innerHTML = `
    <div class="section">
      <div class="card">
        <h2>Coach IA premium</h2>
        <p class="muted">JSON validé, cycle week intégré, feedback cumulatif, fallback local, score de cohérence visible et profil athlète injecté dans la génération.</p>

        <div class="split-2" style="margin-top: 10px;">
          <div class="field-group">
            <label class="field-label" for="iaTime">Temps disponible</label>
            <select id="iaTime">
              ${[20, 25, 35, 45, 60].map((value) => `<option value="${value}" ${String(value) === String(draft.time || profile.sessionTime || 35) ? "selected" : ""}>${value} min</option>`).join("")}
            </select>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaPlace">Lieu</label>
            <select id="iaPlace">
              <option value="maison" ${(draft.place || profile.place || "maison") === "maison" ? "selected" : ""}>Maison</option>
              <option value="salle" ${(draft.place || profile.place || "maison") === "salle" ? "selected" : ""}>Salle</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaZone">Zone</label>
            <select id="iaZone">
              <option value="haut" ${(draft.zone || "full") === "haut" ? "selected" : ""}>Haut</option>
              <option value="bas" ${(draft.zone || "full") === "bas" ? "selected" : ""}>Bas</option>
              <option value="core" ${(draft.zone || "full") === "core" ? "selected" : ""}>Core</option>
              <option value="full" ${(draft.zone || "full") === "full" ? "selected" : ""}>Full body</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaEnergy">Énergie</label>
            <select id="iaEnergy">
              <option value="fatigue" ${(draft.energy || "normal") === "fatigue" ? "selected" : ""}>Fatigué</option>
              <option value="normal" ${(draft.energy || "normal") === "normal" ? "selected" : ""}>Normal</option>
              <option value="high" ${(draft.energy || "normal") === "high" ? "selected" : ""}>Très en forme</option>
            </select>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaGoal">Objectif</label>
            <select id="iaGoal">
              ${["muscle", "force", "endurance", "seche"].map((goal) => `<option value="${goal}" ${(draft.goal || profile.goal || "muscle") === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
            </select>
          </div>
          <div class="field-group">
            <label class="field-label" for="iaLevel">Niveau</label>
            <select id="iaLevel">
              <option value="1" ${(draft.level || profile.level || "2") === "1" ? "selected" : ""}>Débutant</option>
              <option value="2" ${(draft.level || profile.level || "2") === "2" ? "selected" : ""}>Intermédiaire</option>
              <option value="3" ${(draft.level || profile.level || "2") === "3" ? "selected" : ""}>Avancé</option>
            </select>
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

        <details style="margin-top: 10px;">
          <summary>Connexion IA cloud + fallback local</summary>
          <div class="coach-grid">
            <div class="split-2">
              <div class="field-group">
                <label class="field-label" for="iaProviderMode">Mode</label>
                <select id="iaProviderMode">
                  <option value="local" ${state.aiConfig.mode === "local" ? "selected" : ""}>Local seulement</option>
                  <option value="proxy" ${state.aiConfig.mode === "proxy" ? "selected" : ""}>Proxy sécurisé</option>
                  <option value="direct" ${state.aiConfig.mode === "direct" ? "selected" : ""}>Direct OpenAI</option>
                </select>
              </div>
              <div class="field-group">
                <label class="field-label" for="iaModel">Modèle</label>
                <input id="iaModel" type="text" value="${escapeHtml(state.aiConfig.model)}" placeholder="gpt-4.1-mini" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label" for="iaWebSearch">Recherche web</label>
              <select id="iaWebSearch">
                <option value="off" ${state.aiConfig.webSearch ? "" : "selected"}>Désactivée</option>
                <option value="on" ${state.aiConfig.webSearch ? "selected" : ""}>Activée si le mode cloud est disponible</option>
              </select>
            </div>
            <div class="field-group">
              <label class="field-label" for="iaProxyEndpoint">Endpoint proxy</label>
              <input id="iaProxyEndpoint" type="text" value="${escapeHtml(state.aiConfig.proxyEndpoint)}" placeholder="http://localhost:8787/api/maya-coach" />
            </div>
            <div class="field-group">
              <label class="field-label" for="iaApiKey">OpenAI API key</label>
              <input id="iaApiKey" type="password" value="${escapeHtml(state.aiConfig.apiKey)}" placeholder="sk-..." />
            </div>
            <div class="actions-row two">
              <button class="btn btn-soft" data-action="save-ai-config">Sauvegarder la config</button>
              <button class="btn btn-outline" data-action="test-ai-config">Tester la connexion</button>
            </div>
            <div class="ia-source-status" id="iaSourceStatus">
              <strong>Source IA:</strong> ${escapeHtml(state.aiRuntime.source || state.aiConfig.mode)} • statut ${escapeHtml(state.aiRuntime.status || "idle")} • fallback local prêt
              <br />
              <strong>Latence:</strong> ${state.aiRuntime.latencyMs || 0} ms • <strong>Dernier test:</strong> ${state.aiRuntime.lastCheckedAt ? escapeHtml(formatDateTime(state.aiRuntime.lastCheckedAt)) : "jamais"}
              <br />
              <strong>Web:</strong> ${state.aiConfig.webSearch ? "activé" : "désactivé"} • ${state.aiRuntime.error ? `Erreur: ${escapeHtml(state.aiRuntime.error)}` : "aucune erreur active"}
            </div>
            <div class="muted">Mode direct = rapide à tester mais expose la clé côté client. Le proxy reste le mode recommandé pour une app publiée.</div>
          </div>
        </details>

        <details style="margin-top: 10px;">
          <summary>Sync multi-appareils et recommandations</summary>
          <div class="coach-grid">
            <div class="split-2">
              <div class="field-group">
                <label class="field-label" for="syncEndpoint">Endpoint sync</label>
                <input id="syncEndpoint" type="text" value="${escapeHtml(state.syncConfig.endpoint || "")}" placeholder="http://localhost:8788" />
              </div>
              <div class="field-group">
                <label class="field-label" for="syncEmail">Email</label>
                <input id="syncEmail" type="email" value="${escapeHtml(state.syncConfig.email || "")}" placeholder="toi@email.com" />
              </div>
            </div>
            <div class="field-group">
              <label class="field-label" for="syncToken">Token sync</label>
              <input id="syncToken" type="password" value="${escapeHtml(state.syncConfig.token || "")}" placeholder="token magic link" />
            </div>
            <div class="field-group">
              <label class="field-label" for="syncAuto">Auto-sync</label>
              <select id="syncAuto">
                <option value="off" ${state.syncConfig.autoSync ? "" : "selected"}>Manuelle</option>
                <option value="on" ${state.syncConfig.autoSync ? "selected" : ""}>Automatique</option>
              </select>
            </div>
            <div class="actions-row two">
              <button class="btn btn-soft" data-action="save-sync-config">Sauvegarder</button>
              <button class="btn btn-outline" data-action="request-magic-link">Magic link</button>
              <button class="btn btn-soft" data-action="push-sync">Envoyer mes données</button>
              <button class="btn btn-outline" data-action="pull-sync">Récupérer mes données</button>
            </div>
            <div class="ia-source-status">
              <strong>Sync:</strong> ${escapeHtml(state.syncRuntime.status || "idle")}
              ${state.syncRuntime.lastSyncAt ? ` • ${escapeHtml(formatDateTime(state.syncRuntime.lastSyncAt))}` : ""}
              ${state.syncRuntime.error ? `<br /><strong>Erreur:</strong> ${escapeHtml(state.syncRuntime.error)}` : ""}
            </div>
          </div>
        </details>
      </div>

      <div class="card">
        <h3>Plan généré</h3>
        <div class="section">${renderPlan(currentPlan)}</div>
      </div>
    </div>
  `;
}
