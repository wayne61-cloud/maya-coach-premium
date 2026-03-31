import { state } from "../state.js";
import { buildEmptyState, escapeHtml, formatShortDate } from "../utils.js";
import { renderPhotoViewer } from "./photo-viewer.js";

const STATUS_LABELS = {
  pending: "en attente",
  active: "actif",
  suspended: "suspendu",
  banned: "banni"
};

const ADMIN_SECTIONS = [
  ["profiles", "Profils utilisateurs"],
  ["activity", "Activité de connexion"],
  ["stats", "Stats"],
  ["photos", "Modération photos"],
  ["texts", "Modération textes"],
  ["suspended", "Comptes suspendus"]
];

function getStatusLabel(user) {
  if (user?.deletedAt) return "supprimé";
  return STATUS_LABELS[user?.accountStatus] || user?.accountStatus || "actif";
}

function buildUserSummary(user) {
  return [
    user.bio,
    user.goal ? `objectif ${user.goal}` : "",
    user.place ? `entraînement ${user.place}` : "",
    user.frequency ? `${user.frequency} séance(s)/sem` : ""
  ].filter(Boolean).join(" • ");
}

function buildActivityStamp(user) {
  if (user?.lastLoginAt) {
    return {
      label: "Dernière connexion",
      value: formatShortDate(user.lastLoginAt)
    };
  }
  if (user?.lastActivityAt) {
    return {
      label: "Dernière activité",
      value: formatShortDate(user.lastActivityAt)
    };
  }
  if (user?.updatedAt) {
    return {
      label: "Dernière mise à jour",
      value: formatShortDate(user.updatedAt)
    };
  }
  return {
    label: "Inscription",
    value: user?.createdAt ? formatShortDate(user.createdAt) : "inconnue"
  };
}

function buildUserMeta(user, photoCount) {
  const activity = buildActivityStamp(user);
  return [
    user.email || "email inconnu",
    `${photoCount} photo${photoCount > 1 ? "s" : ""}`,
    getStatusLabel(user),
    `${activity.label.toLowerCase()} ${activity.value}`
  ].filter(Boolean).join(" • ");
}

function getAdminUsers() {
  const users = (state.adminRuntime?.users || [])
    .filter((user) => user.role !== "admin")
    .filter((user) => !user.deletedAt)
    .map((user) => {
      const photoCount = (state.adminRuntime?.photos || []).filter((photo) => photo.profileId === user.id).length;
      return {
        ...user,
        photoCount,
        summary: buildUserSummary(user),
        activityStamp: buildActivityStamp(user)
      };
    });

  return users;
}

function getVisibleUsers(section = state.adminRuntime?.section || "profiles") {
  const filterText = String(state.adminRuntime?.filter || "").trim().toLowerCase();
  const statusFilter = state.adminRuntime?.statusFilter || "all";

  return getAdminUsers()
    .filter((user) => {
      if (section === "suspended") {
        return ["suspended", "pending", "banned"].includes(user.accountStatus);
      }
      if (statusFilter !== "all" && user.accountStatus !== statusFilter) return false;
      return true;
    })
    .filter((user) => {
      if (!filterText) return true;
      return [
        user.name,
        user.email,
        user.bio,
        user.goal,
        user.place,
        user.moderationReason
      ].some((value) => String(value || "").toLowerCase().includes(filterText));
    })
    .sort((left, right) => {
      const leftDate = new Date(left.lastLoginAt || left.lastActivityAt || left.updatedAt || left.createdAt || 0).getTime();
      const rightDate = new Date(right.lastLoginAt || right.lastActivityAt || right.updatedAt || right.createdAt || 0).getTime();
      return rightDate - leftDate;
    });
}

function renderAdminHeader() {
  const activeSection = state.adminRuntime?.section || "profiles";
  const pendingCount = getAdminUsers().filter((user) => user.accountStatus === "pending").length;
  return `
    <div class="card admin-panel-card">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Administration</div>
          <h2>Pôles admin dédiés</h2>
          <p class="muted">Profils, activité, stats, modération et gestion des suspensions sont maintenant séparés pour éviter un back-office monolithique.</p>
        </div>
        <button class="btn btn-main" data-action="admin-refresh">Actualiser</button>
      </div>

      <div class="admin-section-grid">
        ${ADMIN_SECTIONS.map(([sectionId, label]) => `
          <button
            class="admin-section-chip ${activeSection === sectionId ? "active" : ""}"
            type="button"
            data-action="admin-set-section"
            data-section="${sectionId}"
          >
            ${escapeHtml(label)}
          </button>
        `).join("")}
      </div>

      <div class="settings-grid compact-grid admin-filter-grid">
        <div class="field-stack full-span">
          <label class="field-label" for="adminUserSearch">Recherche transversale</label>
          <div class="field-shell surface-form">
            <input id="adminUserSearch" data-admin-filter="filter" type="text" placeholder="email, nom, bio, objectif..." value="${escapeHtml(state.adminRuntime?.filter || "")}" />
          </div>
        </div>
        <div class="field-stack">
          <label class="field-label" for="adminStatusFilter">Statut visible</label>
          <div class="field-shell surface-form">
              <select id="adminStatusFilter" data-admin-filter="statusFilter">
              ${[
                ["all", "Tous"],
                ["active", "Actifs"],
                ["pending", "En attente"],
                ["suspended", "Suspendus"],
                ["banned", "Bannis"]
              ].map(([value, label]) => `<option value="${value}" ${(state.adminRuntime?.statusFilter || "all") === value ? "selected" : ""}>${label}</option>`).join("")}
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
        ${escapeHtml(state.adminRuntime?.error || (pendingCount
          ? `${pendingCount} compte(s) en attente • modération live active`
          : (state.adminRuntime?.lastFetchedAt ? `Dernière mise à jour ${formatShortDate(state.adminRuntime.lastFetchedAt)} • modération live active` : "Dashboard prêt à charger")))}
      </div>
    </div>
  `;
}

function renderProfilesSection(users) {
  if (!users.length) {
    return buildEmptyState("Aucun profil visible", "Les comptes utilisateurs apparaîtront ici dès qu’ils s’inscrivent.", "", "");
  }

  return `
    <div class="admin-user-list">
      ${users.map((user) => {
        const isActive = state.adminRuntime?.selectedProfileId === user.id && state.adminRuntime?.detailOpen;
        const nextStatus = user.accountStatus === "pending"
          ? "active"
          : user.accountStatus === "active"
            ? "suspended"
            : "active";
        const actionLabel = user.accountStatus === "pending"
          ? "Valider"
          : user.accountStatus === "active"
            ? "Suspendre"
            : "Réactiver";
        return `
          <article class="admin-user-card ${isActive ? "active" : ""}">
            <div class="admin-user-card-copy">
              <strong>${escapeHtml(user.name || user.email || "Utilisateur")}</strong>
              <span>${escapeHtml(buildUserMeta(user, user.photoCount || 0))}</span>
              ${user.summary ? `<p class="muted">${escapeHtml(user.summary)}</p>` : ""}
            </div>
            <div class="actions-row admin-card-actions">
              <button class="btn ${isActive ? "btn-main" : "btn-outline"}" data-action="admin-open-user" data-id="${escapeHtml(user.id)}" data-tab="notes">${isActive ? "Ouvert" : "Ouvrir le dossier"}</button>
              <button class="btn ${user.accountStatus === "pending" ? "btn-main" : user.accountStatus === "active" ? "btn-warn" : "btn-outline"}" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="${nextStatus}">${actionLabel}</button>
              <button class="btn btn-bad" data-action="admin-open-delete-account" data-id="${escapeHtml(user.id)}" data-name="${escapeHtml(user.name || user.email || "Utilisateur")}">Supprimer</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderActivitySection(users) {
  if (!users.length) {
    return buildEmptyState("Aucune activité", "Les connexions et activités visibles des comptes apparaîtront ici.", "", "");
  }

  return `
    <div class="admin-activity-list">
      ${users.map((user) => `
        <article class="admin-activity-card">
          <div class="progress-photo-head">
            <strong>${escapeHtml(user.name || user.email || "Utilisateur")}</strong>
            <span>${escapeHtml(getStatusLabel(user))}</span>
          </div>
          <div class="exercise-meta">
            <span class="pill">${escapeHtml(user.email || "email inconnu")}</span>
            <span class="pill">${escapeHtml(user.activityStamp.label)}</span>
            <span class="pill">${escapeHtml(user.activityStamp.value)}</span>
            <span class="pill">${user.photoCount || 0} photo${(user.photoCount || 0) > 1 ? "s" : ""}</span>
          </div>
          <p class="muted">${escapeHtml(user.summary || "Aucune description de profil pour le moment.")}</p>
          <div class="actions-row two">
            <button class="btn btn-outline" data-action="admin-open-user" data-id="${escapeHtml(user.id)}" data-tab="notes">Voir le profil</button>
            <button class="btn btn-outline" data-action="admin-open-user" data-id="${escapeHtml(user.id)}" data-tab="photos">Voir les photos</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderStatsSection(users) {
  const photos = state.adminRuntime?.photos || [];
  const activeUsers = users.filter((user) => user.accountStatus === "active").length;
  const pendingUsers = users.filter((user) => user.accountStatus === "pending").length;
  const suspendedUsers = users.filter((user) => user.accountStatus === "suspended").length;
  const bannedUsers = users.filter((user) => user.accountStatus === "banned").length;
  const usersWithBio = users.filter((user) => String(user.bio || "").trim()).length;
  const usersWithPhotos = users.filter((user) => (user.photoCount || 0) > 0).length;
  const recentSignups = users.filter((user) => {
    const createdAt = new Date(user.createdAt || 0).getTime();
    return Number.isFinite(createdAt) && createdAt >= Date.now() - (7 * 24 * 60 * 60 * 1000);
  }).length;

  return `
    <div class="admin-stats-grid">
      <article class="stat-box stat-box-large">
        <span class="stat-label">Utilisateurs suivis</span>
        <strong class="stat-value">${users.length}</strong>
      </article>
      <article class="stat-box stat-box-blue">
        <span class="stat-label">Actifs</span>
        <strong class="stat-value">${activeUsers}</strong>
      </article>
      <article class="stat-box stat-box-coral">
        <span class="stat-label">En attente / suspendus</span>
        <strong class="stat-value">${pendingUsers + suspendedUsers + bannedUsers}</strong>
      </article>
      <article class="stat-box stat-box-green">
        <span class="stat-label">Photos modérables</span>
        <strong class="stat-value">${photos.length}</strong>
      </article>
    </div>

    <div class="admin-stat-list">
      <article class="admin-stat-card">
        <strong>Profils complétés</strong>
        <span>${usersWithBio}/${users.length} comptes avec bio ou contexte exploitable.</span>
      </article>
      <article class="admin-stat-card">
        <strong>Comptes avec photos</strong>
        <span>${usersWithPhotos} utilisateur(s) ont au moins une photo visible en modération.</span>
      </article>
      <article class="admin-stat-card">
        <strong>Nouveaux comptes 7 jours</strong>
        <span>${recentSignups} inscription(s) récentes détectées dans le cloud.</span>
      </article>
      <article class="admin-stat-card">
        <strong>Répartition statuts</strong>
        <span>Actifs ${activeUsers} • En attente ${pendingUsers} • Suspendus ${suspendedUsers} • Bannis ${bannedUsers}</span>
      </article>
    </div>
  `;
}

function renderPhotosSection() {
  const photos = [...(state.adminRuntime?.photos || [])]
    .sort((left, right) => new Date(right.date || right.createdAt || 0).getTime() - new Date(left.date || left.createdAt || 0).getTime());

  if (!photos.length) {
    return buildEmptyState("Aucune photo à modérer", "Les photos de progression des utilisateurs apparaîtront ici.", "", "");
  }

  return `
    <div class="list">
      ${photos.map((photo) => `
        <article class="progress-photo-card admin-photo-card">
          <button class="progress-photo-media photo-media-button" type="button" data-action="open-photo-viewer" data-source="admin" data-id="${escapeHtml(photo.id)}" aria-label="Ouvrir la photo ${escapeHtml(photo.zone || "progression")}">
            <img src="${escapeHtml(photo.photoDataUrl || "")}" alt="Photo ${escapeHtml(photo.zone || "")}" loading="lazy" decoding="async" />
          </button>
          <div class="progress-photo-copy">
            <div class="progress-photo-head">
              <strong>${escapeHtml(photo.userName || "Utilisateur")}</strong>
              <span>${escapeHtml(formatShortDate(photo.date || photo.createdAt || new Date().toISOString()))}</span>
            </div>
            <div class="exercise-meta">
              ${photo.zone ? `<span class="pill">${escapeHtml(photo.zone)}</span>` : ""}
              ${photo.weightKg ? `<span class="pill">${escapeHtml(photo.weightKg)} kg</span>` : ""}
              ${photo.context ? `<span class="pill">${escapeHtml(photo.context)}</span>` : ""}
            </div>
            ${photo.note ? `<p class="muted">${escapeHtml(photo.note)}</p>` : ""}
            <div class="actions-row admin-card-actions">
              <button class="btn btn-outline" type="button" data-action="open-photo-viewer" data-source="admin" data-id="${escapeHtml(photo.id)}">Ouvrir en grand</button>
              <button class="btn btn-outline" data-action="admin-open-user" data-id="${escapeHtml(photo.profileId)}" data-tab="photos">Voir le compte</button>
              <button class="btn btn-bad" data-action="admin-delete-photo" data-id="${escapeHtml(photo.id)}">Supprimer</button>
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderTextsSection(users) {
  const textUsers = users.filter((user) => String(user.bio || "").trim() || String(user.moderationReason || "").trim());
  if (!textUsers.length) {
    return buildEmptyState("Aucun texte à modérer", "Les bios, descriptions et motifs de modération apparaîtront ici.", "", "");
  }

  return `
    <div class="admin-text-list">
      ${textUsers.map((user) => `
        <article class="admin-note-card">
          <div class="progress-photo-head">
            <strong>${escapeHtml(user.name || user.email || "Utilisateur")}</strong>
            <span>${escapeHtml(getStatusLabel(user))}</span>
          </div>
          <div class="exercise-meta">
            <span class="pill">${escapeHtml(user.email || "email inconnu")}</span>
            ${user.goal ? `<span class="pill">${escapeHtml(user.goal)}</span>` : ""}
            ${user.place ? `<span class="pill">${escapeHtml(user.place)}</span>` : ""}
          </div>
          <p class="muted">${escapeHtml(user.bio || "Aucune bio utilisateur pour le moment.")}</p>
          ${user.moderationReason ? `<div class="helper-note alert-note">Motif admin enregistré: ${escapeHtml(user.moderationReason)}</div>` : ""}
          <div class="actions-row two">
            <button class="btn btn-outline" data-action="admin-open-user" data-id="${escapeHtml(user.id)}" data-tab="notes">Ouvrir les textes</button>
            <button class="btn ${user.accountStatus === "active" ? "btn-warn" : "btn-outline"}" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="${user.accountStatus === "active" ? "suspended" : "active"}">${user.accountStatus === "active" ? "Suspendre" : "Réactiver"}</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderSuspendedSection(users) {
  if (!users.length) {
    return buildEmptyState("Aucune suspension en cours", "Les comptes suspendus, bannis ou en attente apparaîtront ici pour action rapide.", "", "");
  }

  return `
    <div class="admin-user-list">
      ${users.map((user) => `
        <article class="admin-user-card">
          <div class="admin-user-card-copy">
            <strong>${escapeHtml(user.name || user.email || "Utilisateur")}</strong>
            <span>${escapeHtml(buildUserMeta(user, user.photoCount || 0))}</span>
            ${user.moderationReason ? `<p class="muted">${escapeHtml(user.moderationReason)}</p>` : ""}
          </div>
          <div class="actions-row admin-card-actions">
            <button class="btn btn-main" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="active">${user.accountStatus === "pending" ? "Valider le compte" : "Retirer la suspension"}</button>
            <button class="btn btn-outline" data-action="admin-open-user" data-id="${escapeHtml(user.id)}" data-tab="notes">Ouvrir le dossier</button>
            ${user.accountStatus !== "banned" ? `<button class="btn btn-bad" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="banned">Bannir</button>` : ""}
          </div>
        </article>
      `).join("")}
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
      ${detailPhotos.map((photo) => `
        <article class="progress-photo-card admin-photo-card">
          <button class="progress-photo-media photo-media-button" type="button" data-action="open-photo-viewer" data-source="admin" data-id="${escapeHtml(photo.id)}" aria-label="Ouvrir la photo ${escapeHtml(photo.zone || "progression")}">
            <img src="${escapeHtml(photo.photoDataUrl || "")}" alt="Photo ${escapeHtml(photo.zone || "")}" loading="lazy" decoding="async" />
          </button>
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
            <div class="actions-row admin-card-actions">
              <button class="btn btn-outline" type="button" data-action="open-photo-viewer" data-source="admin" data-id="${escapeHtml(photo.id)}">Ouvrir en grand</button>
              <button class="btn btn-outline" data-action="admin-delete-photo" data-id="${escapeHtml(photo.id)}">Supprimer la photo</button>
              <button class="btn btn-bad" data-action="admin-delete-user-photos" data-id="${escapeHtml(photo.profileId)}">Tout supprimer</button>
            </div>
          </div>
        </article>
      `).join("")}
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
        <div class="exercise-meta">
          ${user?.lastLoginAt ? `<span class="pill">connexion ${escapeHtml(formatShortDate(user.lastLoginAt))}</span>` : ""}
          ${user?.updatedAt ? `<span class="pill">activité ${escapeHtml(formatShortDate(user.updatedAt))}</span>` : ""}
          ${user?.createdAt ? `<span class="pill">inscrit ${escapeHtml(formatShortDate(user.createdAt))}</span>` : ""}
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
  const isNotesTab = state.adminRuntime?.detailTab !== "photos";

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
        <button class="btn ${isNotesTab ? "btn-main" : "btn-outline"}" data-action="admin-detail-tab" data-tab="notes">Textes & description</button>
      </div>

      <div class="helper-note ${state.adminRuntime?.detailError ? "alert-note" : "info-note"}">
        ${escapeHtml(
          state.adminRuntime?.detailError
            || (state.adminRuntime?.detailLoading
              ? "Chargement du dossier utilisateur..."
              : "Fiche admin détaillée avec profil, textes et photos.")
        )}
      </div>

      ${state.adminRuntime?.detailLoading
        ? `<div class="admin-detail-stack">${buildEmptyState("Chargement", "Les contenus de cet utilisateur arrivent…", "", "")}</div>`
        : (isNotesTab ? renderDetailNotes(user) : renderDetailPhotos())}

      <div class="actions-row admin-detail-actions">
        <button class="btn ${user.accountStatus === "active" ? "btn-warn" : "btn-outline"}" data-action="admin-set-user-status" data-id="${escapeHtml(user.id)}" data-status="${user.accountStatus === "active" ? "suspended" : "active"}">${user.accountStatus === "active" ? "Suspendre le compte" : "Réactiver le compte"}</button>
        <button class="btn btn-bad" data-action="admin-open-delete-account" data-id="${escapeHtml(user.id)}" data-name="${escapeHtml(user.name || user.email || "Utilisateur")}">Supprimer le compte</button>
      </div>
    </div>
  `;
}

function renderDeleteAccountSheet() {
  if (!state.adminRuntime?.deleteDialogOpen) return "";

  const reason = String(state.adminRuntime?.deleteReason || "");
  const canSubmit = !state.adminRuntime?.deleteSubmitting;

  return `
    <div class="sheet-backdrop" data-action="admin-close-delete-account"></div>
    <div class="bottom-sheet admin-delete-sheet">
      <div class="sheet-handle"></div>
      <div class="sheet-head">
        <div>
          <div class="eyebrow">Suppression compte</div>
          <h3>${escapeHtml(state.adminRuntime?.deleteTargetName || "Utilisateur")}</h3>
          <p class="muted">Le motif sera enregistré dans la modération et visible lors d’une tentative de reconnexion.</p>
        </div>
        <button class="ghost-link" data-action="admin-close-delete-account">Fermer</button>
      </div>

      <div class="field-stack">
        <label class="field-label" for="adminDeleteReason">Motif de suppression</label>
        <div class="field-shell surface-form">
          <textarea id="adminDeleteReason" data-admin-delete-field="reason" rows="4" placeholder="Explique précisément pourquoi le compte est supprimé.">${escapeHtml(reason)}</textarea>
        </div>
      </div>

      <div class="helper-note ${state.adminRuntime?.deleteError ? "alert-note" : "info-note"}">
        ${escapeHtml(state.adminRuntime?.deleteError || "Exemple: contenu hors cadre, mauvais usage répété de l’app, comportement non conforme.")}
      </div>

      <div class="actions-row two">
        <button class="btn btn-outline" data-action="admin-close-delete-account" ${state.adminRuntime?.deleteSubmitting ? "disabled" : ""}>Annuler</button>
        <button class="btn btn-bad" data-action="admin-confirm-delete-account" ${canSubmit ? "" : "disabled"}>${state.adminRuntime?.deleteSubmitting ? "Suppression..." : "Supprimer définitivement"}</button>
      </div>
    </div>
  `;
}

function renderSectionCard(title, eyebrow, body) {
  return `
    <div class="card admin-panel-card">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">${escapeHtml(eyebrow)}</div>
          <h3>${escapeHtml(title)}</h3>
        </div>
      </div>
      ${body}
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

  const activeSection = state.adminRuntime?.section || "profiles";
  const users = getVisibleUsers(activeSection);

  let sectionContent = "";
  if (activeSection === "profiles") {
    sectionContent = renderSectionCard("Profils utilisateurs", "Profils", renderProfilesSection(users));
  }
  if (activeSection === "activity") {
    sectionContent = renderSectionCard("Activité de connexion et usage", "Activité", renderActivitySection(users));
  }
  if (activeSection === "stats") {
    sectionContent = renderSectionCard("Statistiques back-office", "Stats", renderStatsSection(getAdminUsers()));
  }
  if (activeSection === "photos") {
    sectionContent = renderSectionCard("Modération photos utilisateurs", "Photos", renderPhotosSection());
  }
  if (activeSection === "texts") {
    sectionContent = renderSectionCard("Modération texte utilisateurs", "Textes", renderTextsSection(getVisibleUsers("profiles")));
  }
  if (activeSection === "suspended") {
    sectionContent = renderSectionCard("Liste des comptes suspendus", "Suspensions", renderSuspendedSection(users));
  }

  node.innerHTML = `
    <div class="section admin-screen">
      ${renderAdminHeader()}
      ${sectionContent}
    </div>

    ${renderDetailSheet()}
    ${renderDeleteAccountSheet()}
    ${renderPhotoViewer()}
  `;
}
