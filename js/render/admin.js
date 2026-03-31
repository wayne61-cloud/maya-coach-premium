import { state } from "../state.js";
import { buildEmptyState, escapeHtml, formatShortDate } from "../utils.js";

const STATUS_LABELS = {
  pending: "en attente",
  active: "actif",
  suspended: "suspendu",
  banned: "banni"
};

function getStatusLabel(user) {
  if (user?.deletedAt) return "supprimé";
  return STATUS_LABELS[user?.accountStatus] || user?.accountStatus || "actif";
}

function buildUserMeta(user, photoCount) {
  return [
    user.email || "email inconnu",
    `${photoCount} photo${photoCount > 1 ? "s" : ""}`,
    getStatusLabel(user)
  ].filter(Boolean).join(" • ");
}

function buildUserSummary(user) {
  return [
    user.bio,
    user.goal ? `objectif ${user.goal}` : "",
    user.place ? `entraînement ${user.place}` : "",
    user.frequency ? `${user.frequency} séance(s)/sem` : ""
  ].filter(Boolean).join(" • ");
}

function renderUserList() {
  const filterText = String(state.adminRuntime?.filter || "").trim().toLowerCase();
  const statusFilter = state.adminRuntime?.statusFilter || "all";
  const selectedProfileId = state.adminRuntime?.selectedProfileId || "";
  const allPhotos = state.adminRuntime?.photos || [];
  const users = (state.adminRuntime?.users || [])
    .filter((user) => user.role !== "admin")
    .filter((user) => {
      if (statusFilter !== "all" && user.accountStatus !== statusFilter) return false;
      if (!filterText) return true;
      return [user.name, user.email, user.bio, user.goal, user.place]
        .some((value) => String(value || "").toLowerCase().includes(filterText));
    })
    .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());

  if (!users.length) {
    return buildEmptyState("Aucun utilisateur à modérer", "Les comptes utilisateurs apparaîtront ici dès qu’ils s’inscrivent.", "", "");
  }

  return `
    <div class="admin-user-list">
      ${users.map((user) => {
        const photoCount = allPhotos.filter((photo) => photo.profileId === user.id).length;
        const isActive = selectedProfileId === user.id && state.adminRuntime?.detailOpen;
        return `
          <article class="admin-user-card ${isActive ? "active" : ""}">
            <div class="admin-user-card-copy">
              <strong>${escapeHtml(user.name || user.email || "Utilisateur")}</strong>
              <span>${escapeHtml(buildUserMeta(user, photoCount))}</span>
              ${buildUserSummary(user) ? `<p class="muted">${escapeHtml(buildUserSummary(user))}</p>` : ""}
            </div>
            <div class="actions-row admin-card-actions">
              <button class="btn ${isActive ? "btn-main" : "btn-outline"}" data-action="admin-open-user" data-id="${escapeHtml(user.id)}" data-tab="photos">${isActive ? "Ouvert" : "Ouvrir"}</button>
              <button class="btn ${user.accountStatus === "active" ? "btn-warn" : "btn-outline"}" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="${user.accountStatus === "active" ? "suspended" : "active"}">${user.accountStatus === "active" ? "Suspendre" : "Réactiver"}</button>
              <button class="btn btn-bad" data-action="admin-delete-account" data-id="${escapeHtml(user.id)}">Supprimer</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderDetailPhotos() {
  const detailPhotos = state.adminRuntime?.detailPhotos || [];
  if (!detailPhotos.length) {
    return buildEmptyState("Aucune photo postée", "Cet utilisateur n’a encore publié aucune photo de progression.", "", "");
  }

  return `
    <div class="list">
      ${detailPhotos.map((photo) => {
        const captionParts = [
          photo.zone || "Photo",
          formatShortDate(photo.date || photo.createdAt || new Date().toISOString()),
          photo.weightKg ? `${photo.weightKg} kg` : "",
          photo.context || ""
        ].filter(Boolean);
        return `
        <article class="progress-photo-card admin-photo-card">
          <div class="progress-photo-media" data-action="open-lightbox" data-src="${escapeHtml(photo.photoDataUrl || "")}" data-caption="${escapeHtml(captionParts.join(" · "))}">
            <img src="${escapeHtml(photo.photoDataUrl || "")}" alt="Photo ${escapeHtml(photo.zone || "")}" loading="lazy" />
          </div>
          <div class="progress-photo-copy">
            <div class="progress-photo-head">
              <strong>${escapeHtml(photo.zone || "Photo")}</strong>
              <span>${escapeHtml(formatShortDate(photo.date || photo.createdAt || new Date().toISOString()))}</span>
            </div>
            <div class="exercise-meta">
              ${photo.weightKg ? `<span class="pill">${escapeHtml(photo.weightKg)} kg</span>` : ""}
              ${photo.heightCm ? `<span class="pill">${escapeHtml(photo.heightCm)} cm</span>` : ""}
              ${photo.context ? `<span class="pill">${escapeHtml(photo.context)}</span>` : ""}
            </div>
            ${photo.note ? `<p class="muted">${escapeHtml(photo.note)}</p>` : ""}
            <div class="actions-row two">
              <button class="btn btn-outline" data-action="admin-delete-photo" data-id="${escapeHtml(photo.id)}">Supprimer la photo</button>
              <button class="btn btn-bad" data-action="admin-delete-user-photos" data-id="${escapeHtml(photo.profileId)}">Tout supprimer</button>
            </div>
          </div>
        </article>
      `}).join("")}
    </div>
  `;
}

function renderDetailNotes(user) {
  const notes = state.adminRuntime?.detailNotes || [];
  const profileSummary = [
    user?.goal ? `Objectif ${user.goal}` : "",
    user?.level ? `niveau ${user.level}` : "",
    user?.frequency ? `${user.frequency} séance(s) / semaine` : "",
    user?.place ? `lieu ${user.place}` : "",
    user?.sessionTime ? `${user.sessionTime} min cible` : "",
    user?.foodPreference ? `nutrition ${user.foodPreference}` : "",
    user?.recoveryPreference ? `recovery ${user.recoveryPreference}` : ""
  ].filter(Boolean);

  return `
    <div class="admin-detail-stack">
      <article class="admin-note-card admin-profile-note-card">
        <div class="progress-photo-head">
          <strong>Description</strong>
          <span>${escapeHtml(getStatusLabel(user))}</span>
        </div>
        <p class="muted">${escapeHtml(user?.bio || "Aucune description laissée par cet utilisateur.")}</p>
        <div class="exercise-meta">
          ${user?.age ? `<span class="pill">${escapeHtml(user.age)} ans</span>` : ""}
          ${user?.weightKg ? `<span class="pill">${escapeHtml(user.weightKg)} kg</span>` : ""}
          ${profileSummary.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}
        </div>
        ${user?.moderationReason ? `<div class="helper-note alert-note">Dernier motif de modération: ${escapeHtml(user.moderationReason)}</div>` : ""}
      </article>

      ${notes.length ? notes.map((note) => `
        <article class="admin-note-card">
          <div class="progress-photo-head">
            <strong>${escapeHtml(note.title || "Note")}</strong>
            <span>${note.date ? escapeHtml(formatShortDate(note.date)) : escapeHtml(note.kind || "note")}</span>
          </div>
          ${note.context ? `<div class="exercise-meta"><span class="pill">${escapeHtml(note.context)}</span></div>` : ""}
          <p class="muted">${escapeHtml(note.description || "Aucun texte associé.")}</p>
        </article>
      `).join("") : buildEmptyState("Aucune note", "Aucune note ou repère utilisateur n’a été relevé pour ce compte.", "", "")}
    </div>
  `;
}

function renderDetailSheet() {
  if (!state.adminRuntime?.detailOpen) return "";
  const user = state.adminRuntime?.detailUser;
  if (!user) return "";

  const photoCount = (state.adminRuntime?.detailPhotos || []).length;
  const isNotesTab = state.adminRuntime?.detailTab === "notes";

  return `
    <div class="sheet-backdrop" data-action="admin-close-user"></div>
    <div class="bottom-sheet admin-detail-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <div>
          <div class="eyebrow">Utilisateur</div>
          <h3>${escapeHtml(user.name || user.email || "Compte")}</h3>
          <p class="muted">${escapeHtml(user.email || "")}</p>
        </div>
        <button class="ghost-link" data-action="admin-close-user">Fermer</button>
      </div>

      <div class="exercise-meta">
        <span class="pill">${escapeHtml(getStatusLabel(user))}</span>
        <span class="pill">${photoCount} photo${photoCount > 1 ? "s" : ""}</span>
        ${user.createdAt ? `<span class="pill">inscrit ${escapeHtml(formatShortDate(user.createdAt))}</span>` : ""}
      </div>

      <div class="actions-row two">
        <button class="btn ${!isNotesTab ? "btn-main" : "btn-outline"}" data-action="admin-detail-tab" data-tab="photos">Photos postées</button>
        <button class="btn ${isNotesTab ? "btn-main" : "btn-outline"}" data-action="admin-detail-tab" data-tab="notes">Notes & description</button>
      </div>

      <div class="helper-note ${state.adminRuntime?.detailError ? "alert-note" : "info-note"}">
        ${escapeHtml(
          state.adminRuntime?.detailError
            || (state.adminRuntime?.detailLoading
              ? "Chargement du dossier utilisateur..."
              : "Modération centrée sur l’usage réel de l’app, pas sur la validation d’inscription.")
        )}
      </div>

      ${state.adminRuntime?.detailLoading
        ? `<div class="admin-detail-stack">${buildEmptyState("Chargement", "Les contenus de cet utilisateur arrivent…", "", "")}</div>`
        : (isNotesTab ? renderDetailNotes(user) : renderDetailPhotos())}

      <div class="actions-row admin-detail-actions">
        <button class="btn ${user.accountStatus === "active" ? "btn-warn" : "btn-outline"}" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="${user.accountStatus === "active" ? "suspended" : "active"}">${user.accountStatus === "active" ? "Suspendre le compte" : "Réactiver le compte"}</button>
        <button class="btn btn-bad" data-action="admin-delete-account" data-id="${escapeHtml(user.id)}">Supprimer le compte</button>
      </div>
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

  const visibleUsersCount = (state.adminRuntime?.users || []).filter((user) => user.role !== "admin").length;
  const filteredStatus = state.adminRuntime?.statusFilter || "all";

  node.innerHTML = `
    <div class="section admin-screen">
      <div class="card">
        <div class="native-block-head">
          <div>
            <div class="eyebrow">Modération</div>
            <h2>Pôle utilisateurs</h2>
            <p class="muted">Les inscriptions sont immédiates. La modération intervient uniquement pour surveiller l’usage, retirer des photos ou supprimer un compte si nécessaire.</p>
          </div>
          <button class="btn btn-main" data-action="admin-refresh">Actualiser</button>
        </div>

        <div class="settings-grid compact-grid" style="margin-top: 10px;">
          <div class="field-stack full-span">
            <label class="field-label" for="adminUserSearch">Rechercher un utilisateur</label>
            <div class="field-shell surface-form">
              <input id="adminUserSearch" data-admin-filter="filter" type="text" placeholder="email, nom, description..." value="${escapeHtml(state.adminRuntime?.filter || "")}" />
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label" for="adminStatusFilter">Statut</label>
            <div class="field-shell surface-form">
              <select id="adminStatusFilter" data-admin-filter="statusFilter">
                ${[
                  ["all", "Tous"],
                  ["active", "Actifs"],
                  ["suspended", "Suspendus"],
                  ["banned", "Bannis"]
                ].map(([value, label]) => `<option value="${value}" ${filteredStatus === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
            </div>
          </div>
          <div class="field-stack">
            <label class="field-label">Dossier ouvert</label>
            <div class="actions-row">
              <button class="btn btn-outline" data-action="admin-close-user" ${state.adminRuntime?.detailOpen ? "" : "disabled"}>Fermer la fiche</button>
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
            <h3>Comptes à surveiller</h3>
          </div>
          <span class="pill">${visibleUsersCount}</span>
        </div>
        ${renderUserList()}
      </div>
    </div>

    ${renderDetailSheet()}
  `;
}
