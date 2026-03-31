import { hasCloudProductConfig, isPreviewAuthEnabled } from "../app-config.js";
import { state } from "../state.js";
import { escapeHtml } from "../utils.js";

function renderNotice() {
  if (state.authState.error) {
    return `<div class="helper-note alert-note">${escapeHtml(state.authState.error)}</div>`;
  }
  if (state.authState.notice) {
    return `<div class="helper-note info-note">${escapeHtml(state.authState.notice)}</div>`;
  }
  if (hasCloudProductConfig()) {
    return "";
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
  const isBusy = state.authState.status === "authenticating";
  const authDisabled = !cloudReady && !previewEnabled;

  node.innerHTML = `
    <div class="section auth-screen">
      <div class="auth-shell">
        <div class="auth-card auth-form-card auth-standalone-card">
          <div class="auth-brand-lockup">
            <h1>${isSignup ? "Créer un compte" : "Connexion"}</h1>
            <p>${isSignup ? "Ton accès sera validé par l’administrateur." : "Entre tes identifiants pour ouvrir ton espace."}</p>
          </div>

          <div class="settings-tabs auth-tabs">
            <button class="settings-tab ${!isSignup ? "active" : ""}" data-action="auth-set-mode" data-mode="login">Connexion</button>
            <button class="settings-tab ${isSignup ? "active" : ""}" data-action="auth-set-mode" data-mode="signup">Créer un compte</button>
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
            <button class="btn btn-main" data-action="auth-submit" ${(isBusy || authDisabled) ? "disabled" : ""}>${isBusy ? (isSignup ? "Création..." : "Connexion...") : (authDisabled ? "Configuration requise" : (isSignup ? "Créer mon compte" : "Se connecter"))}</button>
            ${previewEnabled ? `<button class="btn btn-outline" data-action="auth-use-demo" ${isBusy ? "disabled" : ""}>Ouvrir le mode local</button>` : ""}
          </div>
        </div>
      </div>
    </div>
  `;
}
