import { getCloudModeLabel, getAppDiagnostics } from "../diagnostics.js";
import { computeCoachRecommendations, getWeightEvolution } from "../recommendations.js";
import { state } from "../state.js";
import { computeDashboardStats } from "../workout.js";
import { escapeHtml, formatDateTime } from "../utils.js";

const TABS = [
  { id: "profile", label: "Profil" },
  { id: "coach", label: "Coach IA" },
  { id: "sync", label: "Sync" },
  { id: "app", label: "App" }
];

function summaryLine(profile) {
  return [
    profile?.name || "Athlète",
    profile?.age ? `${profile.age} ans` : "",
    profile?.weightKg ? `${profile.weightKg} kg` : ""
  ].filter(Boolean).join(" • ");
}

function renderProfileTab(profile, weightEvolution) {
  const photoUrl = state.profilePhotoPreview || profile.photoDataUrl || "";
  const initials = (profile.name || "MC")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MC";
  return `
    <div class="card settings-section module-settings surface-settings">
      <div class="settings-section-head">
        <div>
          <div class="eyebrow">Page profil</div>
          <h3>Profil athlète</h3>
          <p class="muted">Un cockpit plus rationnel: identité, préférences d’entraînement et poids suivi au même endroit.</p>
        </div>
        <span class="pill pill-alert">${escapeHtml(weightEvolution.currentWeightKg ? `${weightEvolution.currentWeightKg} kg` : "à compléter")}</span>
      </div>

      <div class="profile-hero">
        <div class="profile-avatar-shell">
          ${photoUrl
            ? `<img class="profile-avatar-image" src="${photoUrl}" alt="Photo de profil" />`
            : `<span class="profile-avatar-fallback">${escapeHtml(initials)}</span>`}
        </div>
        <div class="profile-hero-copy">
          <div class="settings-subtitle">Photo de profil</div>
          <p class="muted">Ajoute une photo carrée pour personnaliser le profil athlète dans l’app.</p>
          <div class="profile-photo-actions">
            <label class="btn btn-soft file-trigger">
              <input id="profilePhotoInput" type="file" accept="image/*" hidden />
              ${photoUrl ? "Changer la photo" : "Ajouter une photo"}
            </label>
            <button class="btn btn-outline" data-action="remove-profile-photo" ${photoUrl ? "" : "disabled"}>Retirer</button>
          </div>
        </div>
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Compte</div>
            <p class="muted">Les infos de base qui servent au coaching et au suivi d’évolution.</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="field-stack">
            <label class="field-label" for="profileName">Nom</label>
            <div class="field-shell surface-form">
              <span class="field-prefix">Identité</span>
              <input id="profileName" type="text" placeholder="Ton prénom" value="${escapeHtml(profile.name || "")}" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileAge">Âge</label>
            <div class="field-shell surface-form">
              <span class="field-prefix">Ans</span>
              <input id="profileAge" type="number" min="10" max="99" placeholder="29" value="${escapeHtml(profile.age || "")}" />
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="profileWeight">Poids</label>
            <div class="field-shell surface-form">
              <span class="field-prefix">Kg</span>
              <input id="profileWeight" type="number" min="35" max="220" step="0.1" placeholder="74" value="${escapeHtml(profile.weightKg || "")}" />
            </div>
          </div>
        </div>
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Préférences d'entraînement</div>
            <p class="muted">Ces choix guident l’IA, la densité des séances et la logique du cycle.</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="field-stack">
            <label class="field-label" for="profileGoal">Objectif</label>
            <div class="field-shell surface-form">
              <select id="profileGoal">
                ${["muscle", "force", "seche", "maintenance"].map((goal) => `<option value="${goal}" ${(profile.goal || "muscle") === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileLevel">Niveau</label>
            <div class="field-shell surface-form">
              <select id="profileLevel">
                <option value="1" ${(profile.level || "2") === "1" ? "selected" : ""}>Débutant</option>
                <option value="2" ${(profile.level || "2") === "2" ? "selected" : ""}>Intermédiaire</option>
                <option value="3" ${(profile.level || "2") === "3" ? "selected" : ""}>Avancé</option>
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileFrequency">Fréquence</label>
            <div class="field-shell surface-form">
              <select id="profileFrequency">
                ${["2", "3", "4"].map((value) => `<option value="${value}" ${(profile.frequency || "3") === value ? "selected" : ""}>${escapeHtml(value)} séances</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profilePlace">Lieu principal</label>
            <div class="field-shell surface-form">
              <select id="profilePlace">
                ${["maison", "salle", "mixte"].map((value) => `<option value="${value}" ${(profile.place || "mixte") === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileSessionTime">Durée cible</label>
            <div class="field-shell surface-form">
              <select id="profileSessionTime">
                ${["20", "35", "45", "60"].map((value) => `<option value="${value}" ${(profile.sessionTime || "35") === value ? "selected" : ""}>${escapeHtml(value)} min</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="helper-note info-note">${escapeHtml(weightEvolution.label)}</div>
      <div class="actions-row two">
        <button class="btn btn-main" data-action="save-profile">Enregistrer le profil</button>
        <button class="btn btn-outline" data-action="open-onboarding">Refaire l’onboarding</button>
      </div>
    </div>
  `;
}

function renderCoachTab(aiRuntime) {
  const runtimeLabel = aiRuntime.source === "local-fallback"
    ? "Fallback local"
    : getCloudModeLabel();
  return `
    <div class="card settings-section module-settings surface-settings">
      <div class="settings-section-head">
        <div>
          <div class="eyebrow">Coach IA</div>
          <h3>Réglages IA</h3>
          <p class="muted">Moins de décor, plus de contrôle: moteur, modèle, cloud et recherche web.</p>
        </div>
        <span class="pill pill-calm">${escapeHtml(runtimeLabel)}</span>
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Moteur</div>
            <p class="muted">Choisis le mode de génération et le modèle actif.</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="field-stack">
            <label class="field-label" for="iaProviderMode">Mode IA</label>
            <div class="field-shell surface-form">
              <select id="iaProviderMode">
                <option value="local" ${state.aiConfig.mode === "local" ? "selected" : ""}>Local seulement</option>
                <option value="proxy" ${state.aiConfig.mode === "proxy" ? "selected" : ""}>Internet sécurisé (recommandé)</option>
                <option value="direct" ${state.aiConfig.mode === "direct" ? "selected" : ""}>Internet direct</option>
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="iaModel">Modèle</label>
            <div class="field-shell surface-form">
              <input id="iaModel" type="text" value="${escapeHtml(state.aiConfig.model)}" placeholder="gpt-4.1-mini" />
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="iaWebSearch">Recherche web</label>
            <div class="field-shell surface-form">
              <select id="iaWebSearch">
                <option value="off" ${state.aiConfig.webSearch ? "" : "selected"}>Désactivée</option>
                <option value="on" ${state.aiConfig.webSearch ? "selected" : ""}>Activée en mode cloud</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Connectivité cloud</div>
            <p class="muted">Brancher le proxy ou la clé directe sans mélanger ces réglages avec la génération du plan.</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="field-stack full-span">
            <label class="field-label" for="iaProxyEndpoint">Endpoint proxy</label>
            <div class="field-shell surface-form">
              <input id="iaProxyEndpoint" type="text" value="${escapeHtml(state.aiConfig.proxyEndpoint)}" placeholder="http://localhost:8787/api/maya-coach" />
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="iaApiKey">API key OpenAI</label>
            <div class="field-shell surface-form">
              <input id="iaApiKey" type="password" value="${escapeHtml(state.aiConfig.apiKey)}" placeholder="sk-..." />
            </div>
          </div>
        </div>
      </div>

      <div class="helper-note calm-note">
        Internet sécurisé = appel cloud via ton proxy serveur.
        • internet direct = appel OpenAI depuis le navigateur.
        • local = moteur embarqué sans web.
        <br />
        Mode ${escapeHtml(getCloudModeLabel())}
        • statut ${escapeHtml(aiRuntime.status || "idle")}
        • latence ${aiRuntime.latencyMs || 0} ms
        ${aiRuntime.lastCheckedAt ? `• ${escapeHtml(formatDateTime(aiRuntime.lastCheckedAt))}` : ""}
        ${aiRuntime.error ? `• ${escapeHtml(aiRuntime.error)}` : ""}
      </div>

      <div class="actions-row two">
        <button class="btn btn-main" data-action="save-ai-config">Sauvegarder IA</button>
        <button class="btn btn-outline" data-action="test-ai-config">Tester la connexion</button>
      </div>
    </div>
  `;
}

function renderSyncTab(syncRuntime, diagnostics) {
  return `
    <div class="card settings-section module-settings surface-settings">
      <div class="settings-section-head">
        <div>
          <div class="eyebrow">Sync et notifications</div>
          <h3>Continuité multi-appareils</h3>
          <p class="muted">Une zone dédiée pour la synchronisation, les permissions et les actions de récupération.</p>
        </div>
        <span class="pill pill-success">${diagnostics.syncConfigured ? "prête" : "locale"}</span>
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Données</div>
            <p class="muted">Tout ce qui concerne l’endpoint, l’email de sync et la clé d’accès.</p>
          </div>
        </div>
        <div class="settings-grid">
          <div class="field-stack full-span">
            <label class="field-label" for="syncEndpoint">Endpoint sync</label>
            <div class="field-shell surface-form">
              <input id="syncEndpoint" type="text" value="${escapeHtml(state.syncConfig.endpoint || "")}" placeholder="http://localhost:8788" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="syncEmail">Email</label>
            <div class="field-shell surface-form">
              <input id="syncEmail" type="email" value="${escapeHtml(state.syncConfig.email || "")}" placeholder="toi@email.com" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="syncAuto">Auto-sync</label>
            <div class="field-shell surface-form">
              <select id="syncAuto">
                <option value="off" ${state.syncConfig.autoSync ? "" : "selected"}>Manuelle</option>
                <option value="on" ${state.syncConfig.autoSync ? "selected" : ""}>Automatique</option>
              </select>
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="syncToken">Token sync</label>
            <div class="field-shell surface-form">
              <input id="syncToken" type="password" value="${escapeHtml(state.syncConfig.token || "")}" placeholder="token magic link" />
            </div>
          </div>
        </div>
      </div>

      <div class="helper-note success-note">
        Sync ${escapeHtml(syncRuntime.status || "idle")}
        ${syncRuntime.lastSyncAt ? `• ${escapeHtml(formatDateTime(syncRuntime.lastSyncAt))}` : ""}
        ${syncRuntime.error ? `• ${escapeHtml(syncRuntime.error)}` : ""}
        • notifications ${escapeHtml(state.notificationConfig.permission || "default")}
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Actions</div>
            <p class="muted">Demandes manuelles de sync et activation locale des notifications.</p>
          </div>
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
    </div>
  `;
}

function renderAppTab(diagnostics, stats, recommendations) {
  return `
    <div class="card settings-section module-settings surface-settings">
      <div class="settings-section-head">
        <div>
          <div class="eyebrow">App et diagnostic</div>
          <h3>Santé produit</h3>
          <p class="muted">Etat du stockage, raccourcis secondaires et alertes coach regroupés au même endroit.</p>
        </div>
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Diagnostic</div>
            <p class="muted">Lecture rapide de l’état stockage, réseau et dynamique d’usage.</p>
          </div>
        </div>
        <div class="settings-summary-grid">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Stockage</span>
            <strong>${diagnostics.storageOk ? "OK" : "Erreur"}</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Internet</span>
            <strong>${diagnostics.online ? "Connecté" : "Hors ligne"}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Streak</span>
            <strong>${stats.streak} jours</strong>
          </div>
        </div>
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Raccourcis</div>
            <p class="muted">Accès secondaires pour piloter l’app sans surcharger la home.</p>
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
      </div>

      <div class="settings-subsection">
        <div class="settings-subsection-head">
          <div>
            <div class="settings-subtitle">Alertes coach</div>
            <p class="muted">Les signaux les plus utiles, sans bruit visuel inutile.</p>
          </div>
        </div>
      <div class="list">
        ${recommendations.length ? recommendations.map((item) => `
          <div class="exercise-card recommendation-card recommendation-alert">
            <div class="exercise-title">${escapeHtml(item.title)}</div>
            <div class="muted">${escapeHtml(item.body)}</div>
          </div>
        `).join("") : `<div class="helper-note calm-note">Aucune alerte prioritaire pour le moment.</div>`}
      </div>
      </div>
    </div>
  `;
}

export function renderSettings(node) {
  const diagnostics = getAppDiagnostics();
  const stats = computeDashboardStats();
  const profile = state.profile || {};
  const weightEvolution = getWeightEvolution();
  const recommendations = computeCoachRecommendations().slice(0, 3);
  const activeTab = state.settingsTab || "profile";

  let panelHtml = renderProfileTab(profile, weightEvolution);
  if (activeTab === "coach") panelHtml = renderCoachTab(state.aiRuntime);
  if (activeTab === "sync") panelHtml = renderSyncTab(state.syncRuntime, diagnostics);
  if (activeTab === "app") panelHtml = renderAppTab(diagnostics, stats, recommendations);

  node.innerHTML = `
    <div class="section settings-page">
      <div class="card settings-hero module-settings surface-settings">
        <div class="eyebrow">Pôle paramètres</div>
        <h2>Paramètres, profil et pilotage</h2>
        <p class="muted">Une interface plus cockpit que marketing: sections nettes, réglages groupés et lecture rapide des états système.</p>
        <div class="settings-summary-grid">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Profil</span>
            <strong>${escapeHtml(summaryLine(profile) || "À compléter")}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">IA</span>
            <strong>${escapeHtml(getCloudModeLabel())}</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Sync</span>
            <strong>${diagnostics.syncConfigured ? "Configurée" : "Locale"}</strong>
          </div>
        </div>
      </div>

      <div class="settings-tabs">
        ${TABS.map((tab) => `
          <button class="settings-tab ${activeTab === tab.id ? "active" : ""}" data-action="go-settings-tab" data-tab="${tab.id}">
            ${escapeHtml(tab.label)}
          </button>
        `).join("")}
      </div>

      ${panelHtml}
    </div>
  `;
}
