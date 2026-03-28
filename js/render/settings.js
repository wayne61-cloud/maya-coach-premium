import { getCloudModeLabel, getAppDiagnostics } from "../diagnostics.js";
import { computeCoachRecommendations, getWeightEvolution } from "../recommendations.js";
import { state } from "../state.js";
import { computeDashboardStats } from "../workout.js";
import { escapeHtml, formatDateTime } from "../utils.js";

function summaryLine(profile) {
  return [
    profile?.name || "Athlète",
    profile?.age ? `${profile.age} ans` : "",
    profile?.weightKg ? `${profile.weightKg} kg` : ""
  ].filter(Boolean).join(" • ");
}

export function renderSettings(node) {
  const diagnostics = getAppDiagnostics();
  const stats = computeDashboardStats();
  const profile = state.profile || {};
  const weightEvolution = getWeightEvolution();
  const recommendations = computeCoachRecommendations().slice(0, 3);

  node.innerHTML = `
    <div class="section settings-page">
      <div class="card settings-hero">
        <div class="eyebrow">Pôle paramètres</div>
        <h2>Paramètres et profil athlète</h2>
        <p class="muted">Tout est regroupé ici: identité athlète, préférences de séance, IA cloud, sync, notifications et diagnostic produit.</p>
        <div class="settings-summary-grid">
          <div class="summary-chip">
            <span class="summary-label">Profil</span>
            <strong>${escapeHtml(summaryLine(profile) || "À compléter")}</strong>
          </div>
          <div class="summary-chip">
            <span class="summary-label">IA</span>
            <strong>${escapeHtml(getCloudModeLabel())}</strong>
          </div>
          <div class="summary-chip">
            <span class="summary-label">Sync</span>
            <strong>${diagnostics.syncConfigured ? "Configurée" : "Locale"}</strong>
          </div>
        </div>
      </div>

      <div class="card settings-section">
        <div class="settings-section-head">
          <div>
            <h3>Profil athlète</h3>
            <p class="muted">Ces infos affinent les choix d’exercices, la densité des séances et la nutrition quotidienne.</p>
          </div>
          <span class="pill">${escapeHtml(weightEvolution.currentWeightKg ? `${weightEvolution.currentWeightKg} kg` : "pas de poids")}</span>
        </div>

        <div class="settings-grid">
          <div class="field-stack">
            <label class="field-label" for="profileName">Nom</label>
            <div class="field-shell">
              <span class="field-prefix">Athlète</span>
              <input id="profileName" type="text" placeholder="Ton prénom" value="${escapeHtml(profile.name || "")}" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileAge">Âge</label>
            <div class="field-shell">
              <span class="field-prefix">Ans</span>
              <input id="profileAge" type="number" min="10" max="99" placeholder="29" value="${escapeHtml(profile.age || "")}" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileWeight">Poids</label>
            <div class="field-shell">
              <span class="field-prefix">Kg</span>
              <input id="profileWeight" type="number" min="35" max="220" step="0.1" placeholder="74" value="${escapeHtml(profile.weightKg || "")}" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileGoal">Objectif</label>
            <div class="field-shell">
              <select id="profileGoal">
                ${["muscle", "force", "seche", "maintenance"].map((goal) => `<option value="${goal}" ${(profile.goal || "muscle") === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileLevel">Niveau</label>
            <div class="field-shell">
              <select id="profileLevel">
                <option value="1" ${(profile.level || "2") === "1" ? "selected" : ""}>Débutant</option>
                <option value="2" ${(profile.level || "2") === "2" ? "selected" : ""}>Intermédiaire</option>
                <option value="3" ${(profile.level || "2") === "3" ? "selected" : ""}>Avancé</option>
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileFrequency">Fréquence</label>
            <div class="field-shell">
              <select id="profileFrequency">
                ${["2", "3", "4"].map((value) => `<option value="${value}" ${(profile.frequency || "3") === value ? "selected" : ""}>${escapeHtml(value)} séances</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profilePlace">Lieu principal</label>
            <div class="field-shell">
              <select id="profilePlace">
                ${["maison", "salle", "mixte"].map((value) => `<option value="${value}" ${(profile.place || "mixte") === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileSessionTime">Durée cible</label>
            <div class="field-shell">
              <select id="profileSessionTime">
                ${["20", "35", "45", "60"].map((value) => `<option value="${value}" ${(profile.sessionTime || "35") === value ? "selected" : ""}>${escapeHtml(value)} min</option>`).join("")}
              </select>
            </div>
          </div>
        </div>

        <div class="helper-note">${escapeHtml(weightEvolution.label)}</div>
        <div class="actions-row two">
          <button class="btn btn-main" data-action="save-profile">Enregistrer le profil</button>
          <button class="btn btn-outline" data-action="open-onboarding">Refaire l’onboarding</button>
        </div>
      </div>

      <div class="card settings-section">
        <div class="settings-section-head">
          <div>
            <h3>Coach IA et accès web</h3>
            <p class="muted">Le coach peut fonctionner localement, via proxy sécurisé, ou en direct. L’accès web n’est utile qu’en mode cloud.</p>
          </div>
          <span class="pill">${escapeHtml(state.aiRuntime.source || state.aiConfig.mode)}</span>
        </div>

        <div class="settings-grid">
          <div class="field-stack">
            <label class="field-label" for="iaProviderMode">Mode IA</label>
            <div class="field-shell">
              <select id="iaProviderMode">
                <option value="local" ${state.aiConfig.mode === "local" ? "selected" : ""}>Local seulement</option>
                <option value="proxy" ${state.aiConfig.mode === "proxy" ? "selected" : ""}>Proxy sécurisé</option>
                <option value="direct" ${state.aiConfig.mode === "direct" ? "selected" : ""}>Direct OpenAI</option>
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="iaModel">Modèle</label>
            <div class="field-shell">
              <input id="iaModel" type="text" value="${escapeHtml(state.aiConfig.model)}" placeholder="gpt-4.1-mini" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="iaWebSearch">Recherche web</label>
            <div class="field-shell">
              <select id="iaWebSearch">
                <option value="off" ${state.aiConfig.webSearch ? "" : "selected"}>Désactivée</option>
                <option value="on" ${state.aiConfig.webSearch ? "selected" : ""}>Activée en mode cloud</option>
              </select>
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="iaProxyEndpoint">Endpoint proxy</label>
            <div class="field-shell">
              <input id="iaProxyEndpoint" type="text" value="${escapeHtml(state.aiConfig.proxyEndpoint)}" placeholder="http://localhost:8787/api/maya-coach" />
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="iaApiKey">API key OpenAI</label>
            <div class="field-shell">
              <input id="iaApiKey" type="password" value="${escapeHtml(state.aiConfig.apiKey)}" placeholder="sk-..." />
            </div>
          </div>
        </div>

        <div class="helper-note">
          Statut: ${escapeHtml(state.aiRuntime.status || "idle")}
          • latence ${state.aiRuntime.latencyMs || 0} ms
          ${state.aiRuntime.lastCheckedAt ? `• ${escapeHtml(formatDateTime(state.aiRuntime.lastCheckedAt))}` : ""}
          ${state.aiRuntime.error ? `• ${escapeHtml(state.aiRuntime.error)}` : ""}
        </div>

        <div class="actions-row two">
          <button class="btn btn-main" data-action="save-ai-config">Sauvegarder IA</button>
          <button class="btn btn-outline" data-action="test-ai-config">Tester la connexion</button>
        </div>
      </div>

      <div class="card settings-section">
        <div class="settings-section-head">
          <div>
            <h3>Sync et notifications</h3>
            <p class="muted">Prépare la continuité entre appareils, active les rappels coach et garde une trace de l’évolution.</p>
          </div>
          <span class="pill">${diagnostics.notificationSupported ? escapeHtml(state.notificationConfig.permission || "default") : "browser only"}</span>
        </div>

        <div class="settings-grid">
          <div class="field-stack full-span">
            <label class="field-label" for="syncEndpoint">Endpoint sync</label>
            <div class="field-shell">
              <input id="syncEndpoint" type="text" value="${escapeHtml(state.syncConfig.endpoint || "")}" placeholder="http://localhost:8788" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="syncEmail">Email</label>
            <div class="field-shell">
              <input id="syncEmail" type="email" value="${escapeHtml(state.syncConfig.email || "")}" placeholder="toi@email.com" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="syncAuto">Auto-sync</label>
            <div class="field-shell">
              <select id="syncAuto">
                <option value="off" ${state.syncConfig.autoSync ? "" : "selected"}>Manuelle</option>
                <option value="on" ${state.syncConfig.autoSync ? "selected" : ""}>Automatique</option>
              </select>
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="syncToken">Token sync</label>
            <div class="field-shell">
              <input id="syncToken" type="password" value="${escapeHtml(state.syncConfig.token || "")}" placeholder="token magic link" />
            </div>
          </div>
        </div>

        <div class="helper-note">
          Sync: ${escapeHtml(state.syncRuntime.status || "idle")}
          ${state.syncRuntime.lastSyncAt ? `• ${escapeHtml(formatDateTime(state.syncRuntime.lastSyncAt))}` : ""}
          ${state.syncRuntime.error ? `• ${escapeHtml(state.syncRuntime.error)}` : ""}
        </div>

        <div class="actions-row two">
          <button class="btn btn-soft" data-action="save-sync-config">Sauvegarder la sync</button>
          <button class="btn btn-outline" data-action="request-magic-link">Magic link</button>
          <button class="btn btn-soft" data-action="push-sync">Envoyer mes données</button>
          <button class="btn btn-outline" data-action="pull-sync">Récupérer mes données</button>
          <button class="btn btn-soft" data-action="request-notifications">Activer les notifications</button>
          <button class="btn btn-outline" data-action="go-page" data-page="history">Voir l’historique</button>
        </div>
      </div>

      <div class="card settings-section">
        <div class="settings-section-head">
          <div>
            <h3>Raccourcis et santé produit</h3>
            <p class="muted">Navigation secondaire, stats et recommandations regroupées pour éviter une barre basse trop chargée sur mobile.</p>
          </div>
        </div>

        <div class="settings-summary-grid">
          <div class="summary-chip">
            <span class="summary-label">Stockage</span>
            <strong>${diagnostics.storageOk ? "OK" : "Erreur"}</strong>
          </div>
          <div class="summary-chip">
            <span class="summary-label">Internet</span>
            <strong>${diagnostics.online ? "Connecté" : "Hors ligne"}</strong>
          </div>
          <div class="summary-chip">
            <span class="summary-label">Streak</span>
            <strong>${stats.streak} jours</strong>
          </div>
        </div>

        <div class="settings-shortcuts">
          <button class="shortcut-tile" data-action="go-page" data-page="history">
            <span class="shortcut-title">Historique</span>
            <span class="shortcut-sub">${stats.totalSessions} entrées</span>
          </button>
          <button class="shortcut-tile" data-action="go-page" data-page="stats">
            <span class="shortcut-title">Stats</span>
            <span class="shortcut-sub">${Math.round(stats.activeMinutes)} min actives</span>
          </button>
          <button class="shortcut-tile" data-action="go-page" data-page="favoris">
            <span class="shortcut-title">Favoris</span>
            <span class="shortcut-sub">${state.favorites.size} éléments</span>
          </button>
        </div>

        <div class="list" style="margin-top: 10px;">
          ${recommendations.map((item) => `
            <div class="exercise-card recommendation-card">
              <div class="exercise-title">${escapeHtml(item.title)}</div>
              <div class="muted">${escapeHtml(item.body)}</div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}
