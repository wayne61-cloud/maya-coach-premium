import { state } from "../state.js";
import { buildEmptyState, escapeHtml, formatShortDate } from "../utils.js";

const STATUS_LABELS = {
  pending: "en attente",
  active: "actif",
  suspended: "suspendu",
  banned: "banni"
};

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "actif";
}

function renderUserActions(user, selectedProfileId) {
  const viewButton = `<button class="btn ${selectedProfileId === user.id ? "btn-main" : "btn-outline"}" data-action="admin-filter-user" data-id="${escapeHtml(user.id)}">${selectedProfileId === user.id ? "Filtre actif" : "Voir ses photos"}</button>`;

  if (user.role === "admin") {
    return `
      <div class="actions-row">
        ${viewButton}
        <span class="pill">Compte admin protégé</span>
      </div>
    `;
  }

  if (user.accountStatus === "pending") {
    return `
      <div class="actions-row three">
        ${viewButton}
        <button class="btn btn-main" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="active">Approuver</button>
        <button class="btn btn-bad" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="banned">Refuser</button>
      </div>
    `;
  }

  return `
    <div class="actions-row three">
      ${viewButton}
      <button class="btn ${user.accountStatus === "active" ? "btn-warn" : "btn-outline"}" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="${user.accountStatus === "active" ? "suspended" : "active"}">${user.accountStatus === "active" ? "Suspendre" : "Réactiver"}</button>
      <button class="btn btn-bad" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="banned">Bannir</button>
    </div>
  `;
}

function renderUsers() {
  const filterText = String(state.adminRuntime?.filter || "").trim().toLowerCase();
  const statusFilter = state.adminRuntime?.statusFilter || "all";
  const selectedProfileId = state.adminRuntime?.selectedProfileId || "";
  const users = (state.adminRuntime?.users || []).filter((user) => {
    if (statusFilter !== "all" && user.accountStatus !== statusFilter) return false;
    if (selectedProfileId && user.id !== selectedProfileId) return false;
    if (!filterText) return true;
    return [user.name, user.email].some((value) => String(value || "").toLowerCase().includes(filterText));
  }).sort((left, right) => {
    const order = { pending: 0, active: 1, suspended: 2, banned: 3 };
    return (order[left.accountStatus] ?? 9) - (order[right.accountStatus] ?? 9);
  });

  if (!users.length) {
    return buildEmptyState("Aucun utilisateur chargé", "Lance un rafraîchissement admin pour récupérer les comptes et leurs contenus.", "", "");
  }

  return `
    <div class="list compact-list">
      ${users.map((user) => `
        <article class="admin-user-card">
          <div>
            <strong>${escapeHtml(user.name || user.email || "Utilisateur")}</strong>
            <span>${escapeHtml(user.email || "email inconnu")} • ${escapeHtml(getStatusLabel(user.accountStatus))} • ${escapeHtml(user.role || "user")}</span>
          </div>
          ${renderUserActions(user, selectedProfileId)}
        </article>
      `).join("")}
    </div>
  `;
}

function renderPhotos() {
  const filterText = String(state.adminRuntime?.filter || "").trim().toLowerCase();
  const selectedProfileId = state.adminRuntime?.selectedProfileId || "";
  const photos = (state.adminRuntime?.photos || []).filter((photo) => {
    if (selectedProfileId && photo.profileId !== selectedProfileId) return false;
    if (!filterText) return true;
    return [photo.userName, photo.userEmail, photo.zone, photo.context, photo.note].some((value) => String(value || "").toLowerCase().includes(filterText));
  });

  if (!photos.length) {
    return buildEmptyState("Aucune photo chargée", "Ajuste le filtre utilisateur ou recharge les données admin.", "", "");
  }

  return `
    <div class="list">
      ${photos.map((photo) => `
        <article class="progress-photo-card admin-photo-card">
          <div class="progress-photo-media">
            <img src="${escapeHtml(photo.photoDataUrl || "")}" alt="Photo admin ${escapeHtml(photo.zone || "")}" />
          </div>
          <div class="progress-photo-copy">
            <div class="progress-photo-head">
              <strong>${escapeHtml(photo.userName || photo.userEmail || "Utilisateur")}</strong>
              <span>${escapeHtml(formatShortDate(photo.date || photo.createdAt || new Date().toISOString()))}</span>
            </div>
            <div class="exercise-meta">
              ${photo.zone ? `<span class="pill">${escapeHtml(photo.zone)}</span>` : ""}
              ${photo.weightKg ? `<span class="pill">${escapeHtml(photo.weightKg)} kg</span>` : ""}
              ${photo.heightCm ? `<span class="pill">${escapeHtml(photo.heightCm)} cm</span>` : ""}
            </div>
            ${photo.context ? `<p class="muted">${escapeHtml(photo.context)}</p>` : ""}
            <div class="actions-row two">
              <button class="btn btn-outline" data-action="admin-delete-photo" data-id="${escapeHtml(photo.id)}">Supprimer la photo</button>
              <button class="btn btn-bad" data-action="admin-delete-user-photos" data-id="${escapeHtml(photo.profileId)}">Supprimer toutes ses photos</button>
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

export function renderAdmin(node) {
  const isAdmin = state.profile?.role === "admin";

  if (!isAdmin) {
    node.innerHTML = `
      <div class="section">
        <div class="card">
          ${buildEmptyState("Accès admin requis", "Cette zone est réservée aux comptes d’administration.", "", "")}
        </div>
      </div>
    `;
    return;
  }

  node.innerHTML = `
    <div class="section admin-screen">
      <div class="card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Administration</div>
            <h2>Modération</h2>
            <p class="muted">Comptes, progression visuelle et validation des nouveaux inscrits. Cette zone reste visible uniquement pour le compte admin connecté.</p>
          </div>
          <button class="btn btn-main" data-action="admin-refresh">Actualiser</button>
        </div>

        <div class="settings-grid compact-grid" style="margin-top: 10px;">
          <div class="field-stack full-span">
            <label class="field-label" for="adminUserSearch">Filtre utilisateur</label>
            <div class="field-shell surface-form">
              <input id="adminUserSearch" data-admin-filter="filter" type="text" placeholder="email, nom..." value="${escapeHtml(state.adminRuntime?.filter || "")}" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="adminStatusFilter">Statut</label>
            <div class="field-shell surface-form">
              <select id="adminStatusFilter" data-admin-filter="statusFilter">
                ${[
                  ["all", "Tous"],
                  ["pending", "En attente"],
                  ["active", "Actifs"],
                  ["suspended", "Suspendus"],
                  ["banned", "Bannis"]
                ].map(([value, label]) => `<option value="${value}" ${state.adminRuntime?.statusFilter === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label">Utilisateur ciblé</label>
            <div class="actions-row">
              <button class="btn btn-outline" data-action="admin-clear-user-filter" ${state.adminRuntime?.selectedProfileId ? "" : "disabled"}>Voir tout</button>
            </div>
          </div>
        </div>

        <div class="helper-note ${state.adminRuntime?.error ? "alert-note" : "info-note"}">
          ${escapeHtml(state.adminRuntime?.error || (state.adminRuntime?.lastFetchedAt ? `Dernière mise à jour ${formatShortDate(state.adminRuntime.lastFetchedAt)}` : "Dashboard prêt à charger"))}
        </div>
      </div>

      <div class="card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Utilisateurs</div>
            <h3>Comptes</h3>
          </div>
          <span class="pill">${(state.adminRuntime?.users || []).length}</span>
        </div>
        ${renderUsers()}
      </div>

      <div class="card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Progression visuelle</div>
            <h3>Photos uploadées</h3>
          </div>
          <span class="pill">${(state.adminRuntime?.photos || []).length}</span>
        </div>
        ${renderPhotos()}
      </div>
    </div>
  `;
}
