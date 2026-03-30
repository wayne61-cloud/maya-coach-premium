import { APP_CONFIG, hasCloudProductConfig, hasFlowiseProductConfig, hasSupabaseProductConfig, isPreviewAuthEnabled } from "../app-config.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";
import { icon } from "../ui.js";

function authModeLabel() {
  if (hasSupabaseProductConfig()) return "Connexion sécurisée";
  if (hasCloudProductConfig()) return "Backend sécurisé";
  return isPreviewAuthEnabled() ? "Mode local" : "Configuration requise";
}

function authSessionLabel() {
  if (state.authState.mode === "supabase") return "supabase";
  if (state.authState.mode === "backend") return "backend";
  return isPreviewAuthEnabled() ? "local" : "verrouillé";
}

function renderNotice() {
  if (state.authState.error) {
    return `<div class="helper-note alert-note">${escapeHtml(state.authState.error)}</div>`;
  }
  if (state.authState.notice) {
    return `<div class="helper-note info-note">${escapeHtml(state.authState.notice)}</div>`;
  }
  if (hasCloudProductConfig()) {
    return `<div class="helper-note calm-note">Compte unique, données connectées, modération admin et session persistante avant d’entrer dans l’app.</div>`;
  }
  if (isPreviewAuthEnabled()) {
    return `<div class="helper-note info-note">Mode local réservé au développement sur cette machine tant que le backend produit n’est pas branché.</div>`;
  }
  return `<div class="helper-note alert-note">Le backend sécurisé n’est pas encore branché. Ajoute la configuration produit pour activer la connexion réelle.</div>`;
}

export function renderAuth(node) {
  const isSignup = state.authScreenMode === "signup";
  const draft = state.authDraft || {};
  const cloudReady = hasCloudProductConfig();
  const previewEnabled = isPreviewAuthEnabled();
  const flowiseReady = hasFlowiseProductConfig();
  const isBusy = state.authState.status === "authenticating";
  const authDisabled = !cloudReady && !previewEnabled;

  node.innerHTML = `
    <div class="section auth-screen">
      <div class="auth-shell">
        <div class="auth-hero auth-hero-poster">
          <div class="eyebrow">Maya Fitness</div>
          <h1>Connexion athlète</h1>
          <p>Une entrée plus propre, plus lisible et plus cohérente: un seul thème, une seule direction, zéro bruit inutile.</p>

          <div class="auth-hero-stack">
            <div class="auth-stat-line">
              <span>${icon("shield", "", 15)} ${escapeHtml(authModeLabel())}</span>
              <strong>${cloudReady ? "Compte relié" : (previewEnabled ? "Local dev" : "Accès verrouillé")}</strong>
            </div>
            <div class="auth-stat-line">
              <span>${icon("sync", "", 15)} Données</span>
              <strong>${cloudReady ? "Cloud active" : (previewEnabled ? "Hors production" : "Non branché")}</strong>
            </div>
            <div class="auth-stat-line">
              <span>${icon("coach", "", 15)} Maya Coach</span>
              <strong>${flowiseReady ? "Widget prêt" : "Fallback intégré"}</strong>
            </div>
          </div>
        </div>

        <div class="auth-card auth-form-card">
          <div class="settings-tabs auth-tabs">
            <button class="settings-tab ${!isSignup ? "active" : ""}" data-action="auth-set-mode" data-mode="login">Connexion</button>
            <button class="settings-tab ${isSignup ? "active" : ""}" data-action="auth-set-mode" data-mode="signup">Créer un compte</button>
          </div>

          <div class="auth-form-head">
            <strong>${isSignup ? "Créer ton espace" : "Reprendre ta session"}</strong>
            <span>${cloudReady ? "Compte synchronisé et modéré" : (previewEnabled ? "Mode local réservé au développement" : "Connexion réelle requise")}</span>
          </div>

          <div class="auth-form-grid">
            ${isSignup ? `
              <div class="field-stack full-span">
                <label class="field-label" for="authDisplayName">Pseudo</label>
                <div class="field-shell surface-form">
                  <input id="authDisplayName" data-auth-field="displayName" type="text" placeholder="Maya Athlete" value="${escapeHtml(draft.displayName || "")}" />
                </div>
              </div>
            ` : ""}
            <div class="field-stack full-span">
              <label class="field-label" for="authEmail">Email</label>
              <div class="field-shell surface-form">
                <input id="authEmail" data-auth-field="email" type="email" autocomplete="email" placeholder="toi@email.com" value="${escapeHtml(draft.email || "")}" />
              </div>
            </div>
            <div class="field-stack ${isSignup ? "" : "full-span"}">
              <label class="field-label" for="authPassword">Mot de passe</label>
              <div class="field-shell surface-form">
                <input id="authPassword" data-auth-field="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" placeholder="8 caractères minimum" value="${escapeHtml(draft.password || "")}" />
              </div>
            </div>
            ${isSignup ? `
              <div class="field-stack">
                <label class="field-label" for="authConfirmPassword">Confirmer</label>
                <div class="field-shell surface-form">
                  <input id="authConfirmPassword" data-auth-field="confirmPassword" type="password" autocomplete="new-password" placeholder="Répète le mot de passe" value="${escapeHtml(draft.confirmPassword || "")}" />
                </div>
              </div>
            ` : ""}
          </div>

          ${renderNotice()}

          <div class="actions-row two">
            <button class="btn btn-main" data-action="auth-submit" ${(isBusy || authDisabled) ? "disabled" : ""}>${isBusy ? "Connexion..." : (authDisabled ? "Configuration requise" : (isSignup ? "Créer mon compte" : "Se connecter"))}</button>
            ${previewEnabled ? `<button class="btn btn-outline" data-action="auth-use-demo" ${isBusy ? "disabled" : ""}>Ouvrir le mode local</button>` : ""}
          </div>
        </div>

        <div class="auth-footer-card auth-footer-minimal">
          <div class="auth-footer-copy">
            <strong>${icon("spark", "", 15)} Build ${escapeHtml(APP_CONFIG.product.name)}</strong>
            <span>Session ${escapeHtml(authSessionLabel())} • noir profond, accent Maya et navigation allégée.</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
