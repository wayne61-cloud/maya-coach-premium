import { getCloudModeLabel, getAppDiagnostics } from "../diagnostics.js";
import { getSharedDashboardData } from "../insights.js";
import { state } from "../state.js";
import { APP_VERSION } from "../version.js";
import { escapeHtml, formatDateTime } from "../utils.js";
import { icon } from "../ui.js";

const TABS = [
  { id: "identity", label: "Identité" },
  { id: "training", label: "Entraînement" },
  { id: "nutrition", label: "Nutrition" },
  { id: "ai-sync", label: "IA & Sync" }
];

function summaryLine(profile) {
  return [
    profile?.name || "Athlète",
    profile?.age ? `${profile.age} ans` : "",
    profile?.weightKg ? `${profile.weightKg} kg` : ""
  ].filter(Boolean).join(" • ");
}

function athleteInitials(profile) {
  return (profile?.name || "MF")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "MF";
}

function renderSummaryCard(shared, diagnostics) {
  const photoUrl = state.profilePhotoPreview || shared.profile.photoDataUrl || "";

  return `
    <div class="card settings-hero module-settings surface-settings">
      <div class="eyebrow">Profil Maya</div>
      <div class="profile-summary-card">
        <div class="profile-summary-main">
          <div class="profile-summary-avatar">
            ${photoUrl
              ? `<img class="athlete-avatar-image" src="${photoUrl}" alt="Photo de profil" />`
              : `<span class="athlete-avatar-fallback">${escapeHtml(athleteInitials(shared.profile))}</span>`}
          </div>
          <div class="profile-summary-copy">
            <h2>${escapeHtml(shared.profile.name || "Profil athlète")}</h2>
            <p class="muted">${escapeHtml(summaryLine(shared.profile) || "Complète ton profil pour connecter entraînement, suivi et nutrition.")}</p>
            <div class="hero-chips">
              <span class="pill">${shared.profileCompletion}% complété</span>
              <span class="pill">${shared.stats.streak} jours de streak</span>
              <span class="pill">${escapeHtml(shared.profile.goal || "muscle")}</span>
            </div>
          </div>
        </div>

        <div class="settings-summary-grid">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Poids</span>
            <strong>${escapeHtml(shared.weightEvolution.currentWeightKg ? `${shared.weightEvolution.currentWeightKg} kg` : "à renseigner")}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Fuel</span>
            <strong>${shared.fuelRatio}%</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Sync</span>
            <strong>${diagnostics.supabaseConfigured && state.currentUser ? "cloud" : (diagnostics.supabaseConfigured ? "sécurisé" : "local dev")}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderIdentityTab(shared) {
  const profile = shared.profile;
  const photoUrl = state.profilePhotoPreview || profile.photoDataUrl || "";

  return `
    <div class="card settings-section module-settings surface-settings">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Identité</div>
          <h3>Profil athlète</h3>
        </div>
        <span class="pill pill-alert">${escapeHtml(shared.weightEvolution.currentWeightKg ? `${shared.weightEvolution.currentWeightKg} kg` : "à compléter")}</span>
      </div>

      <details class="settings-accordion" open>
        <summary>
          <span class="settings-accordion-copy">
            <strong>Avatar & présence</strong>
            <small>Photo de profil, aperçu et identité visuelle.</small>
          </span>
          <span class="settings-accordion-meta">${photoUrl ? "photo active" : "ajouter"}</span>
        </summary>
        <div class="profile-photo-row">
          <div class="profile-avatar-shell compact-avatar-upload">
            ${photoUrl
              ? `<img class="profile-avatar-image" src="${photoUrl}" alt="Photo de profil" />`
              : `<span class="profile-avatar-fallback">${escapeHtml(athleteInitials(profile))}</span>`}
          </div>
          <div class="profile-hero-copy">
            <p class="muted">Ajoute une photo carrée pour personnaliser l’Accueil et le Profil.</p>
            <div class="profile-photo-actions">
              <label class="btn btn-soft file-trigger">
                <input id="profilePhotoInput" type="file" accept="image/*" hidden />
                ${photoUrl ? "Changer" : "Ajouter"}
              </label>
              <button class="btn btn-outline" data-action="remove-profile-photo" ${photoUrl ? "" : "disabled"}>Retirer</button>
            </div>
          </div>
        </div>
      </details>

      <details class="settings-accordion" open>
        <summary>
          <span class="settings-accordion-copy">
            <strong>Informations clés</strong>
            <small>Nom, âge et poids utilisés dans le suivi et la nutrition.</small>
          </span>
          <span class="settings-accordion-meta">${escapeHtml(summaryLine(profile) || "incomplet")}</span>
        </summary>
        <div class="settings-grid compact-grid">
          <div class="field-stack full-span">
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
          <div class="field-stack">
            <label class="field-label" for="profileWeight">Poids</label>
            <div class="field-shell surface-form">
              <span class="field-prefix">Kg</span>
              <input id="profileWeight" type="number" min="35" max="220" step="0.1" placeholder="74" value="${escapeHtml(profile.weightKg || "")}" />
            </div>
          </div>
        </div>
      </details>

      <div class="helper-note info-note">${escapeHtml(shared.weightEvolution.label)}</div>

      <div class="actions-row two">
        <button class="btn btn-main" data-action="save-profile">Enregistrer</button>
        <button class="btn btn-outline" data-action="open-onboarding">Relancer l’onboarding</button>
      </div>
    </div>
  `;
}

function renderTrainingTab(shared) {
  const profile = shared.profile;

  return `
    <div class="card settings-section module-settings surface-settings">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Entraînement</div>
          <h3>Préférences de séance</h3>
        </div>
        <span class="pill pill-calm">${escapeHtml(profile.goal || "muscle")} • ${escapeHtml(profile.sessionTime || "35")} min</span>
      </div>

      <details class="settings-accordion" open>
        <summary>
          <span class="settings-accordion-copy">
            <strong>Objectif & niveau</strong>
            <small>Ce que l’IA et le suivi utilisent comme cadre principal.</small>
          </span>
        </summary>
        <div class="settings-grid compact-grid">
          <div class="field-stack">
            <label class="field-label" for="profileGoal">Objectif</label>
            <div class="field-shell surface-form">
              <select id="profileGoal">
                ${["muscle", "force", "seche", "maintenance", "endurance"].map((goal) => `<option value="${goal}" ${profile.goal === goal ? "selected" : ""}>${escapeHtml(goal)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileLevel">Niveau</label>
            <div class="field-shell surface-form">
              <select id="profileLevel">
                <option value="1" ${profile.level === "1" ? "selected" : ""}>Débutant</option>
                <option value="2" ${profile.level === "2" ? "selected" : ""}>Intermédiaire</option>
                <option value="3" ${profile.level === "3" ? "selected" : ""}>Avancé</option>
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileFrequency">Fréquence</label>
            <div class="field-shell surface-form">
              <select id="profileFrequency">
                ${["2", "3", "4", "5"].map((value) => `<option value="${value}" ${profile.frequency === value ? "selected" : ""}>${escapeHtml(value)} séances</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileSessionTime">Durée cible</label>
            <div class="field-shell surface-form">
              <select id="profileSessionTime">
                ${["20", "35", "45", "60"].map((value) => `<option value="${value}" ${profile.sessionTime === value ? "selected" : ""}>${escapeHtml(value)} min</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      </details>

      <details class="settings-accordion">
        <summary>
          <span class="settings-accordion-copy">
            <strong>Contexte d’entraînement</strong>
            <small>Lieu, split préféré et tonalité du coach.</small>
          </span>
        </summary>
        <div class="settings-grid compact-grid">
          <div class="field-stack">
            <label class="field-label" for="profilePlace">Lieu</label>
            <div class="field-shell surface-form">
              <select id="profilePlace">
                ${["maison", "salle", "mixte"].map((value) => `<option value="${value}" ${profile.place === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profilePreferredSplit">Split</label>
            <div class="field-shell surface-form">
              <select id="profilePreferredSplit">
                ${["adaptive", "full-body", "upper-lower", "push-pull-legs"].map((value) => `<option value="${value}" ${profile.preferredSplit === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack full-span">
            <label class="field-label" for="profileCoachTone">Ton du coach</label>
            <div class="field-shell surface-form">
              <select id="profileCoachTone">
                ${["direct", "motivant", "calme"].map((value) => `<option value="${value}" ${profile.coachTone === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      </details>

      <div class="helper-note calm-note">Objectif actuel: ${escapeHtml(profile.goal || "muscle")} • ${shared.weeklySummary.trainingSessions}/${shared.sessionTarget} séance(s) cette semaine.</div>

      <div class="actions-row two">
        <button class="btn btn-main" data-action="save-profile">Enregistrer</button>
        <button class="btn btn-outline" data-action="go-page" data-page="ia">Voir le Coach</button>
      </div>
    </div>
  `;
}

function renderNutritionTab(shared) {
  const profile = shared.profile;
  const nutrition = shared.nutrition;

  return `
    <div class="card settings-section module-settings surface-settings">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Nutrition</div>
          <h3>Préférences et fuel</h3>
        </div>
        <span class="pill pill-success">${nutrition.totals.proteins} g prot</span>
      </div>

      <details class="settings-accordion" open>
        <summary>
          <span class="settings-accordion-copy">
            <strong>Préférences alimentaires</strong>
            <small>Relie ton profil aux recommandations nutrition et recovery.</small>
          </span>
        </summary>
        <div class="settings-grid compact-grid">
          <div class="field-stack">
            <label class="field-label" for="profileFoodPreference">Type d’alimentation</label>
            <div class="field-shell surface-form">
              <select id="profileFoodPreference">
                ${["omnivore", "vegetarien", "sans-lactose", "high-protein"].map((value) => `<option value="${value}" ${profile.foodPreference === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="profileRecoveryPreference">Recovery</label>
            <div class="field-shell surface-form">
              <select id="profileRecoveryPreference">
                ${["equilibre", "focus-sommeil", "focus-mobilite", "focus-respiration"].map((value) => `<option value="${value}" ${profile.recoveryPreference === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
              </select>
            </div>
          </div>
        </div>
      </details>

      <details class="settings-accordion">
        <summary>
          <span class="settings-accordion-copy">
            <strong>Plan du jour</strong>
            <small>Kcal, protéines et recettes suggérées reliées à la charge du jour.</small>
          </span>
        </summary>
        <div class="settings-summary-grid">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Kcal</span>
            <strong>${nutrition.totals.calories}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Protéines</span>
            <strong>${nutrition.totals.proteins} g</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Charge</span>
            <strong>${escapeHtml(nutrition.trainingLoad)}</strong>
          </div>
        </div>
        <div class="meal-pill-list">
          ${nutrition.dayPlan.meals.map((meal) => `
            <div class="meal-pill">
              <strong>${escapeHtml(meal.category)}</strong>
              <span>${escapeHtml(meal.recipe.nom)}</span>
            </div>
          `).join("")}
        </div>
      </details>

      <div class="actions-row two">
        <button class="btn btn-main" data-action="save-profile">Enregistrer</button>
        <button class="btn btn-outline" data-action="go-page" data-page="nutrition">Ouvrir Nutrition</button>
      </div>
    </div>
  `;
}

function renderAISyncTab(shared, diagnostics) {
  const authLabel = state.currentUser?.email
    ? `${state.currentUser.email} • ${state.authState.mode}`
    : `Session ${state.authState.mode}`;
  const flowiseStateLabel = state.flowiseConfig.status === "ready"
    ? "actif"
    : state.flowiseConfig.status === "fallback"
      ? "fallback"
      : "veille";

  return `
    <div class="card settings-section module-settings surface-settings">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">IA & Sync</div>
          <h3>Colonne vertébrale data</h3>
        </div>
        <span class="pill pill-calm">${escapeHtml(getCloudModeLabel())}</span>
      </div>

      <details class="settings-accordion" open>
        <summary>
          <span class="settings-accordion-copy">
            <strong>Coach IA</strong>
            <small>Moteur actif, recherche web et disponibilité du coach.</small>
          </span>
          <span class="settings-accordion-meta">${escapeHtml(state.aiRuntime.status || "idle")}</span>
        </summary>
        <div class="settings-summary-grid">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Source</span>
            <strong>${escapeHtml(getCloudModeLabel())}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Modèle</span>
            <strong>${escapeHtml(state.aiConfig.model)}</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Web</span>
            <strong>${state.aiConfig.webSearch ? "active" : "off"}</strong>
          </div>
        </div>
        <div class="helper-note calm-note">
          Coach ${escapeHtml(state.aiRuntime.status || "idle")}
          • latence ${state.aiRuntime.latencyMs || 0} ms
          ${state.aiRuntime.lastCheckedAt ? `• ${escapeHtml(formatDateTime(state.aiRuntime.lastCheckedAt))}` : ""}
          ${state.aiRuntime.error ? `• ${escapeHtml(state.aiRuntime.error)}` : ""}
        </div>
        <div class="actions-row two">
          <button class="btn btn-main" data-action="test-ai-config">Tester le coach</button>
          <button class="btn btn-outline" data-action="go-page" data-page="ia">Ouvrir Coach</button>
        </div>
      </details>

      <details class="settings-accordion">
        <summary>
          <span class="settings-accordion-copy">
            <strong>Flowise chat flottant</strong>
            <small>Chat style Messenger lié à la session utilisateur.</small>
          </span>
          <span class="settings-accordion-meta">${escapeHtml(flowiseStateLabel)}</span>
        </summary>
        <div class="settings-summary-grid">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Widget</span>
            <strong>${diagnostics.flowiseConfigured ? "branché" : "en attente"}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Session</span>
            <strong>${escapeHtml((state.flowiseConfig.sessionId || "auto").slice(0, 18))}</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Fallback</span>
            <strong>${state.flowiseConfig.status === "ready" ? "off" : "coach app"}</strong>
          </div>
        </div>
        <div class="helper-note ${state.flowiseConfig.status === "ready" ? "calm-note" : "alert-note"}">
          Flowise ${escapeHtml(state.flowiseConfig.status || "idle")}
          ${state.flowiseConfig.lastMountedAt ? `• ${escapeHtml(formatDateTime(state.flowiseConfig.lastMountedAt))}` : ""}
          ${state.flowiseConfig.error ? `• ${escapeHtml(state.flowiseConfig.error)}` : ""}
        </div>
        <div class="actions-row two">
          <button class="btn btn-main" data-action="reset-flowise-session">Nouvelle session</button>
          <button class="btn btn-outline" data-action="sync-flowise-widget">Relancer le widget</button>
        </div>
      </details>

      <details class="settings-accordion">
        <summary>
          <span class="settings-accordion-copy">
            <strong>Compte & données</strong>
            <small>Session, cloud, synchronisation et notifications produit.</small>
          </span>
          <span class="settings-accordion-meta">${escapeHtml(state.authState.status || "signed_out")}</span>
        </summary>
        <div class="settings-summary-grid">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Compte</span>
            <strong>${escapeHtml(authLabel)}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Sync</span>
            <strong>${escapeHtml(state.syncRuntime.status || "idle")}</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Stockage</span>
            <strong>${diagnostics.supabaseConfigured ? "Supabase" : "local dev"}</strong>
          </div>
        </div>
        <div class="helper-note success-note">
          Sync ${escapeHtml(state.syncRuntime.status || "idle")}
          ${state.syncRuntime.lastSyncAt ? `• ${escapeHtml(formatDateTime(state.syncRuntime.lastSyncAt))}` : ""}
          ${state.syncRuntime.error ? `• ${escapeHtml(state.syncRuntime.error)}` : ""}
          • notifications ${escapeHtml(state.notificationConfig.permission || "default")}
        </div>
        <div class="actions-row three">
          <button class="btn btn-soft" data-action="push-sync">Forcer la sync</button>
          <button class="btn btn-outline" data-action="pull-sync">Rafraîchir</button>
          <button class="btn btn-soft" data-action="request-notifications">Notifications</button>
          <button class="btn btn-outline" data-action="logout">Se déconnecter</button>
        </div>
      </details>

      <details class="settings-accordion">
        <summary>
          <span class="settings-accordion-copy">
            <strong>Supabase</strong>
            <small>Socle produit interne: auth, Postgres, storage et temps réel.</small>
          </span>
          <span class="settings-accordion-meta">${diagnostics.supabaseConfigured ? "actif" : "non branché"}</span>
        </summary>
        <div class="settings-summary-grid">
          <div class="summary-chip summary-chip-blue">
            <span class="summary-label">Auth</span>
            <strong>${diagnostics.supabaseConfigured ? "branché" : "non branché"}</strong>
          </div>
          <div class="summary-chip summary-chip-green">
            <span class="summary-label">Schéma</span>
            <strong>${state.supabaseConfig.schemaReady ? "prêt" : "à appliquer"}</strong>
          </div>
          <div class="summary-chip summary-chip-coral">
            <span class="summary-label">Dernier check</span>
            <strong>${state.supabaseConfig.lastCheckedAt ? escapeHtml(formatDateTime(state.supabaseConfig.lastCheckedAt)) : "jamais"}</strong>
          </div>
        </div>
        <div class="helper-note ${state.supabaseConfig.status === "error" ? "alert-note" : "info-note"}">
          Supabase ${escapeHtml(state.supabaseConfig.status || "idle")}
          ${state.supabaseConfig.lastCheckedAt ? `• ${escapeHtml(formatDateTime(state.supabaseConfig.lastCheckedAt))}` : ""}
          ${state.supabaseConfig.error ? `• ${escapeHtml(state.supabaseConfig.error)}` : ""}
        </div>
        <div class="actions-row two">
          <button class="btn btn-main" data-action="test-supabase-config">Tester Supabase</button>
          <button class="btn btn-outline" data-action="pull-sync">Recharger les données</button>
        </div>
      </details>

      <div class="settings-summary-grid">
        <div class="summary-chip summary-chip-blue">
          <span class="summary-label">Build</span>
          <strong>${escapeHtml(APP_VERSION)}</strong>
        </div>
        <div class="summary-chip summary-chip-green">
          <span class="summary-label">Streak</span>
          <strong>${shared.stats.streak} j</strong>
        </div>
        <div class="summary-chip summary-chip-coral">
          <span class="summary-label">Stockage</span>
          <strong>${diagnostics.storageOk ? "OK" : "Erreur"}</strong>
        </div>
      </div>
    </div>
  `;
}

export function renderSettings(node) {
  const shared = getSharedDashboardData();
  const diagnostics = getAppDiagnostics();
  const activeTab = ({
    profile: "identity",
    coach: "ai-sync",
    sync: "ai-sync",
    app: "ai-sync",
    system: "ai-sync"
  })[state.settingsTab] || state.settingsTab || "identity";
  state.settingsTab = activeTab;

  let panelHtml = renderIdentityTab(shared);
  if (activeTab === "training") panelHtml = renderTrainingTab(shared);
  if (activeTab === "nutrition") panelHtml = renderNutritionTab(shared);
  if (activeTab === "ai-sync") panelHtml = renderAISyncTab(shared, diagnostics);

  node.innerHTML = `
    <div class="section settings-page">
      ${renderSummaryCard(shared, diagnostics)}

      <div class="settings-tabs profile-tab-strip">
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
