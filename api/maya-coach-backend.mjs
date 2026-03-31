#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "maya-coach.sqlite");
const PORT = Number(process.env.MAYA_BACKEND_PORT || 8788);
const SESSION_TTL_DAYS = Math.max(1, Number(process.env.MAYA_SESSION_TTL_DAYS || 30));
const ADMIN_EMAILS = parseList(process.env.MAYA_ADMIN_EMAILS || "");
const ADMIN_PASSWORD = String(process.env.MAYA_ADMIN_PASSWORD || "").trim();
const ADMIN_DISPLAY_NAME = String(process.env.MAYA_ADMIN_DISPLAY_NAME || "Admin").trim() || "Admin";
const PUBLIC_BASE_URL = String(process.env.MAYA_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.MAYA_ALLOWED_ORIGINS || "*");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

initializeSchema();
bootstrapAdminUsers();

function parseList(raw) {
  return [...new Set(
    String(raw || "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )];
}

function parseAllowedOrigins(raw) {
  if (!String(raw || "").trim() || String(raw || "").trim() === "*") {
    return "*";
  }
  return parseList(raw);
}

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isValidPassword(password) {
  return String(password || "").length >= 8;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, userRow) {
  const expected = Buffer.from(String(userRow.password_hash || ""), "hex");
  const actual = Buffer.from(crypto.scryptSync(String(password || ""), String(userRow.password_salt || ""), 64).toString("hex"), "hex");
  if (!expected.length || expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      account_status TEXT NOT NULL CHECK (account_status IN ('pending', 'active', 'suspended', 'banned')),
      state_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  `);
}

function buildDefaultCustomWorkoutState() {
  return {
    activeId: "session_default",
    sessions: [
      {
        id: "session_default",
        title: "Séance personnalisée",
        objective: "muscle",
        place: "mixte",
        targetExerciseCount: "4",
        blocks: [
          { id: "block_1", exerciseId: "pushup_classic", sets: "3", reps: "10-12", restSec: "60" },
          { id: "block_2", exerciseId: "squat_bodyweight", sets: "3", reps: "10-12", restSec: "75" }
        ]
      }
    ]
  };
}

function buildDefaultState({ displayName, role, accountStatus }) {
  return {
    profile: {
      name: displayName || "",
      age: "",
      weightKg: "",
      photoDataUrl: "",
      role,
      accountStatus,
      goal: "muscle",
      level: "2",
      frequency: "3",
      place: "mixte",
      sessionTime: "35",
      equipment: ["aucun", "elastique"],
      preferredSplit: "adaptive",
      foodPreference: "omnivore",
      recoveryPreference: "equilibre",
      coachTone: "direct"
    },
    profileSnapshots: [],
    history: [],
    favorites: [],
    nutritionProfile: null,
    nutritionHistory: [],
    customWorkoutState: buildDefaultCustomWorkoutState(),
    customWorkoutDraft: buildDefaultCustomWorkoutState().sessions[0],
    visualProgressEntries: [],
    aiConfig: null,
    notificationConfig: null,
    feedbackTrend: { loadAdjust: 0, history: [] },
    cycleState: { cycleWeek: 1, sessionsInWeek: 0, cycleLength: 4 },
    updatedAt: nowIso()
  };
}

function parseStateJson(raw, userRow) {
  try {
    const payload = JSON.parse(String(raw || "{}"));
    return hydrateStatePayload(payload, userRow);
  } catch {
    return hydrateStatePayload({}, userRow);
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function hydrateStatePayload(payload, userRow) {
  const baseline = buildDefaultState({
    displayName: userRow?.display_name || "",
    role: userRow?.role || "user",
    accountStatus: userRow?.account_status || "active"
  });
  const next = (payload && typeof payload === "object") ? cloneJson(payload) : {};
  const profile = (next.profile && typeof next.profile === "object") ? next.profile : {};

  return {
    ...baseline,
    ...next,
    profile: {
      ...baseline.profile,
      ...profile,
      name: String(profile.name || userRow?.display_name || baseline.profile.name).trim().slice(0, 80),
      role: userRow?.role || baseline.profile.role,
      accountStatus: userRow?.account_status || baseline.profile.accountStatus
    },
    profileSnapshots: Array.isArray(next.profileSnapshots) ? next.profileSnapshots : baseline.profileSnapshots,
    history: Array.isArray(next.history) ? next.history : baseline.history,
    favorites: Array.isArray(next.favorites) ? next.favorites : baseline.favorites,
    nutritionProfile: next.nutritionProfile ?? baseline.nutritionProfile,
    nutritionHistory: Array.isArray(next.nutritionHistory) ? next.nutritionHistory : baseline.nutritionHistory,
    customWorkoutState: next.customWorkoutState && typeof next.customWorkoutState === "object"
      ? next.customWorkoutState
      : baseline.customWorkoutState,
    customWorkoutDraft: next.customWorkoutDraft && typeof next.customWorkoutDraft === "object"
      ? next.customWorkoutDraft
      : baseline.customWorkoutDraft,
    visualProgressEntries: Array.isArray(next.visualProgressEntries) ? next.visualProgressEntries : baseline.visualProgressEntries,
    aiConfig: next.aiConfig ?? baseline.aiConfig,
    notificationConfig: next.notificationConfig ?? baseline.notificationConfig,
    feedbackTrend: next.feedbackTrend && typeof next.feedbackTrend === "object"
      ? next.feedbackTrend
      : baseline.feedbackTrend,
    cycleState: next.cycleState && typeof next.cycleState === "object"
      ? next.cycleState
      : baseline.cycleState,
    updatedAt: typeof next.updatedAt === "string" && next.updatedAt ? next.updatedAt : baseline.updatedAt
  };
}

function sanitizeIncomingState(rawPayload, userRow) {
  const current = parseStateJson(userRow.state_json, userRow);
  const incoming = (rawPayload && typeof rawPayload === "object") ? rawPayload : {};
  const profile = (incoming.profile && typeof incoming.profile === "object") ? incoming.profile : {};

  return {
    ...current,
    profile: {
      ...(current.profile || {}),
      ...profile,
      name: String(profile.name || current.profile?.name || userRow.display_name || "").trim().slice(0, 80),
      role: userRow.role,
      accountStatus: userRow.account_status
    },
    profileSnapshots: Array.isArray(incoming.profileSnapshots) ? incoming.profileSnapshots : current.profileSnapshots,
    history: Array.isArray(incoming.history) ? incoming.history : current.history,
    favorites: Array.isArray(incoming.favorites) ? incoming.favorites : current.favorites,
    nutritionProfile: incoming.nutritionProfile ?? current.nutritionProfile,
    nutritionHistory: Array.isArray(incoming.nutritionHistory) ? incoming.nutritionHistory : current.nutritionHistory,
    customWorkoutState: incoming.customWorkoutState && typeof incoming.customWorkoutState === "object"
      ? incoming.customWorkoutState
      : current.customWorkoutState,
    customWorkoutDraft: incoming.customWorkoutDraft && typeof incoming.customWorkoutDraft === "object"
      ? incoming.customWorkoutDraft
      : current.customWorkoutDraft,
    visualProgressEntries: Array.isArray(incoming.visualProgressEntries) ? incoming.visualProgressEntries : current.visualProgressEntries,
    aiConfig: incoming.aiConfig ?? current.aiConfig,
    notificationConfig: incoming.notificationConfig ?? current.notificationConfig,
    feedbackTrend: incoming.feedbackTrend && typeof incoming.feedbackTrend === "object"
      ? incoming.feedbackTrend
      : current.feedbackTrend,
    cycleState: incoming.cycleState && typeof incoming.cycleState === "object"
      ? incoming.cycleState
      : current.cycleState,
    updatedAt: nowIso()
  };
}

function serializeState(payload) {
  return JSON.stringify(payload);
}

function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(normalizeEmail(email)) || null;
}

function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(String(id || "")) || null;
}

function listUsers() {
  return db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
}

function createUser({ email, password, displayName, role, accountStatus }) {
  const safeEmail = normalizeEmail(email);
  const now = nowIso();
  const id = randomId("usr");
  const passwordData = hashPassword(password);
  const payload = buildDefaultState({
    displayName,
    role,
    accountStatus
  });

  db.prepare(`
    INSERT INTO users (
      id,
      email,
      password_hash,
      password_salt,
      display_name,
      role,
      account_status,
      state_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    safeEmail,
    passwordData.hash,
    passwordData.salt,
    String(displayName || "").trim() || safeEmail,
    role,
    accountStatus,
    serializeState(payload),
    now,
    now
  );

  return getUserById(id);
}

function updateUserState(userId, payload) {
  const now = nowIso();
  db.prepare("UPDATE users SET state_json = ?, updated_at = ? WHERE id = ?").run(
    serializeState(payload),
    now,
    userId
  );
  return getUserById(userId);
}

function updateUserStatus(userId, accountStatus) {
  const userRow = getUserById(userId);
  if (!userRow) return null;
  const payload = parseStateJson(userRow.state_json, userRow);
  payload.profile = {
    ...(payload.profile || {}),
    role: userRow.role,
    accountStatus
  };
  db.prepare("UPDATE users SET account_status = ?, state_json = ?, updated_at = ? WHERE id = ?").run(
    accountStatus,
    serializeState(payload),
    nowIso(),
    userId
  );
  return getUserById(userId);
}

function createSession(userRow) {
  const token = crypto.randomBytes(48).toString("base64url");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, userRow.id, createdAt, expiresAt, createdAt);

  db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(createdAt, createdAt, userRow.id);

  return { token, createdAt, expiresAt };
}

function deleteSession(token) {
  db.prepare("DELETE FROM sessions WHERE token = ?").run(String(token || ""));
}

function deleteSessionsForUser(userId) {
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(String(userId || ""));
}

function cleanupExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
}

function getSessionToken(req) {
  const auth = String(req.headers.authorization || "");
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

function buildStatusErrorMessage(accountStatus) {
  if (accountStatus === "pending") {
    return "Compte en attente de validation. L’administrateur doit approuver ton accès.";
  }
  if (accountStatus === "banned") {
    return "Compte banni. Contacte l’administrateur si tu penses qu’il s’agit d’une erreur.";
  }
  return "Compte suspendu. Contacte l’administrateur pour réactiver l’accès.";
}

function assertAllowedAccount(userRow, { revokeSessionToken = "" } = {}) {
  if (userRow.role === "admin") return;
  if (userRow.account_status === "active") return;
  if (revokeSessionToken) {
    deleteSession(revokeSessionToken);
  }
  const error = new Error(buildStatusErrorMessage(userRow.account_status));
  error.status = 403;
  throw error;
}

function getAuthenticatedUser(req) {
  cleanupExpiredSessions();
  const token = getSessionToken(req);
  if (!token) return null;

  const sessionRow = db.prepare(`
    SELECT
      sessions.token,
      sessions.user_id,
      sessions.created_at,
      sessions.expires_at,
      sessions.last_seen_at,
      users.id,
      users.email,
      users.display_name,
      users.role,
      users.account_status,
      users.state_json,
      users.created_at AS user_created_at,
      users.updated_at AS user_updated_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token = ?
  `).get(token);

  if (!sessionRow) return null;
  if (new Date(sessionRow.expires_at).getTime() <= Date.now()) {
    deleteSession(token);
    return null;
  }

  assertAllowedAccount(sessionRow, { revokeSessionToken: token });
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE token = ?").run(nowIso(), token);
  return { token, session: sessionRow, user: sessionRow };
}

function toClientUser(userRow) {
  return {
    id: userRow.id,
    email: userRow.email,
    displayName: userRow.display_name,
    role: userRow.role,
    accountStatus: userRow.account_status,
    createdAt: userRow.user_created_at || userRow.created_at || "",
    updatedAt: userRow.user_updated_at || userRow.updated_at || ""
  };
}

function buildAuthResponse({ userRow, session }) {
  const payload = parseStateJson(userRow.state_json, userRow);
  return {
    ok: true,
    user: toClientUser(userRow),
    sessionToken: session?.token || "",
    session: session
      ? {
          token: session.token,
          createdAt: session.createdAt || session.created_at || "",
          expiresAt: session.expiresAt || session.expires_at || ""
        }
      : null,
    profile: payload.profile,
    updatedAt: payload.updatedAt || userRow.updated_at || nowIso()
  };
}

function buildAdminNoteItem({ id, kind, title, date, description, context = "" }) {
  return {
    id,
    kind,
    title,
    date,
    description,
    context
  };
}

function buildAdminNotes(userRow) {
  const payload = parseStateJson(userRow.state_json, userRow);
  const notes = [];

  (Array.isArray(payload.history) ? payload.history : []).forEach((entry) => {
    const exerciseCount = Array.isArray(entry.exercises) ? entry.exercises.length : 0;
    const details = [
      entry.coachNote || "",
      entry.feedback ? `feedback ${entry.feedback}` : "",
      exerciseCount ? `${exerciseCount} exercice(s)` : ""
    ].filter(Boolean).join(" • ");

    notes.push(buildAdminNoteItem({
      id: `history:${entry.id || randomId("history")}`,
      kind: entry.type || "history",
      title: entry.title || "Activité",
      date: entry.date || "",
      description: details || "Aucun texte détaillé associé à cette activité.",
      context: [entry.objective || "", entry.zone || "", entry.place || ""].filter(Boolean).join(" • ")
    }));
  });

  (Array.isArray(payload.nutritionHistory) ? payload.nutritionHistory : []).forEach((entry, index) => {
    notes.push(buildAdminNoteItem({
      id: `nutrition:${entry.id || index}`,
      kind: "nutrition",
      title: entry.goal ? `Nutrition ${entry.goal}` : "Nutrition",
      date: entry.date || "",
      description: [
        entry.calories ? `${entry.calories} kcal` : "",
        entry.trainingLoad ? `charge ${entry.trainingLoad}` : "",
        Array.isArray(entry.mealIds) && entry.mealIds.length ? `${entry.mealIds.length} repas planifiés` : ""
      ].filter(Boolean).join(" • ") || "Aucun détail nutritionnel disponible.",
      context: entry.goal || ""
    }));
  });

  return notes
    .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
    .slice(0, 40);
}

function resolveLastActivityAt(payload, userRow) {
  const candidates = [
    userRow.last_login_at,
    userRow.updated_at,
    payload.updatedAt,
    ...(Array.isArray(payload.history) ? payload.history.map((entry) => entry?.date) : []),
    ...(Array.isArray(payload.nutritionHistory) ? payload.nutritionHistory.map((entry) => entry?.date) : []),
    ...(Array.isArray(payload.visualProgressEntries) ? payload.visualProgressEntries.map((entry) => entry?.date) : [])
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((value) => ({ raw: value, ts: new Date(value).getTime() }))
    .filter((item) => Number.isFinite(item.ts))
    .sort((left, right) => right.ts - left.ts);

  return candidates[0]?.raw || userRow.created_at || "";
}

function buildAdminUserRecord(userRow) {
  const payload = parseStateJson(userRow.state_json, userRow);
  const profile = payload.profile || {};

  return {
    id: userRow.id,
    authUserId: userRow.id,
    email: userRow.email,
    name: profile.name || userRow.display_name || userRow.email,
    bio: profile.bio || "",
    age: profile.age || "",
    weightKg: profile.weightKg || "",
    role: userRow.role,
    accountStatus: userRow.account_status,
    moderationReason: profile.moderationReason || "",
    deletedAt: profile.deletedAt || "",
    goal: profile.goal || "muscle",
    level: profile.level || "2",
    frequency: profile.frequency || "3",
    place: profile.place || "mixte",
    sessionTime: profile.sessionTime || "35",
    preferredSplit: profile.preferredSplit || "adaptive",
    foodPreference: profile.foodPreference || "omnivore",
    recoveryPreference: profile.recoveryPreference || "equilibre",
    coachTone: profile.coachTone || "direct",
    photoPath: profile.photoDataUrl || "",
    createdAt: userRow.created_at || "",
    updatedAt: userRow.updated_at || "",
    lastLoginAt: userRow.last_login_at || "",
    lastActivityAt: resolveLastActivityAt(payload, userRow)
  };
}

function buildAdminDashboard() {
  const users = listUsers().map((userRow) => buildAdminUserRecord(userRow));

  const photos = listUsers().flatMap((userRow) => {
    const payload = parseStateJson(userRow.state_json, userRow);
    const photoEntries = Array.isArray(payload.visualProgressEntries) ? payload.visualProgressEntries : [];
    return photoEntries
      .filter((entry) => String(entry?.photoDataUrl || "").trim())
      .map((entry) => ({
        id: `${userRow.id}:${String(entry.id || randomId("photo"))}`,
        profileId: userRow.id,
        userName: userRow.display_name || "",
        userEmail: userRow.email,
        date: entry.date || "",
        zone: entry.zone || "",
        weightKg: entry.weightKg || "",
        heightCm: entry.heightCm || "",
        context: entry.context || "",
        note: entry.note || "",
        photoStoragePath: entry.photoStoragePath || "",
        photoDataUrl: entry.photoDataUrl || "",
        createdAt: entry.date || userRow.updated_at || ""
      }));
  }).sort((left, right) => new Date(right.date || right.createdAt || 0).getTime() - new Date(left.date || left.createdAt || 0).getTime());

  return { users, photos };
}

function buildAdminUserDetail(userId) {
  const userRow = getUserById(userId);
  if (!userRow) {
    const error = new Error("Utilisateur introuvable");
    error.status = 404;
    throw error;
  }

  return {
    profile: buildAdminUserRecord(userRow),
    notes: buildAdminNotes(userRow)
  };
}

function deletePhotoByCompositeId(photoId) {
  const [userId, entryId] = String(photoId || "").split(":");
  if (!userId || !entryId) {
    const error = new Error("Photo admin introuvable");
    error.status = 404;
    throw error;
  }

  const userRow = getUserById(userId);
  if (!userRow) {
    const error = new Error("Utilisateur introuvable");
    error.status = 404;
    throw error;
  }

  const payload = parseStateJson(userRow.state_json, userRow);
  const currentPhotos = Array.isArray(payload.visualProgressEntries) ? payload.visualProgressEntries : [];
  const nextPhotos = currentPhotos.filter((entry) => String(entry?.id || "") !== entryId);

  if (nextPhotos.length === currentPhotos.length) {
    const error = new Error("Photo admin introuvable");
    error.status = 404;
    throw error;
  }

  payload.visualProgressEntries = nextPhotos;
  payload.updatedAt = nowIso();
  updateUserState(userId, payload);
}

function deleteAllPhotosForUser(userId) {
  const userRow = getUserById(userId);
  if (!userRow) {
    const error = new Error("Utilisateur introuvable");
    error.status = 404;
    throw error;
  }

  const payload = parseStateJson(userRow.state_json, userRow);
  payload.visualProgressEntries = [];
  payload.updatedAt = nowIso();
  updateUserState(userId, payload);
}

function bootstrapAdminUsers() {
  if (!ADMIN_EMAILS.length) {
    console.warn("No MAYA_ADMIN_EMAILS configured. Admin moderation will stay locked until an admin seed is provided.");
    return;
  }

  ADMIN_EMAILS.forEach((email) => {
    const existing = getUserByEmail(email);
    if (existing) {
      const payload = parseStateJson(existing.state_json, existing);
      payload.profile = {
        ...(payload.profile || {}),
        role: "admin",
        accountStatus: "active"
      };
      db.prepare(`
        UPDATE users
        SET role = 'admin',
            account_status = 'active',
            display_name = ?,
            state_json = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        existing.display_name || ADMIN_DISPLAY_NAME,
        serializeState(payload),
        nowIso(),
        existing.id
      );
      return;
    }

    if (!isValidPassword(ADMIN_PASSWORD)) {
      console.warn(`Admin seed skipped for ${email}: MAYA_ADMIN_PASSWORD must contain at least 8 characters.`);
      return;
    }

    createUser({
      email,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_DISPLAY_NAME,
      role: "admin",
      accountStatus: "active"
    });
    console.log(`Admin account seeded for ${email}`);
  });
}

function resolveOrigin(req) {
  if (ALLOWED_ORIGINS === "*") return "*";
  const origin = String(req.headers.origin || "").trim().toLowerCase();
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return req.headers.origin;
  }
  return ALLOWED_ORIGINS[0] || "null";
}

function json(res, req, code, body) {
  const origin = resolveOrigin(req);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Vary": "Origin"
  });
  res.end(JSON.stringify(body));
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_500_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("JSON invalide"));
      }
    });
    req.on("error", reject);
  });
}

function getRequestUrl(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || `localhost:${PORT}`);
  const protocol = String(req.headers["x-forwarded-proto"] || "http");
  return new URL(req.url || "/", `${protocol}://${host}`);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = getRequestUrl(req);
    const pathname = url.pathname;

    if (req.method === "OPTIONS") {
      return json(res, req, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/api/health") {
      return json(res, req, 200, {
        ok: true,
        service: "maya-coach-backend",
        port: PORT,
        database: path.basename(DB_FILE),
        provider: "sqlite",
        authMode: "email-password",
        publicBaseUrl: PUBLIC_BASE_URL || `${url.protocol}//${url.host}`
      });
    }

    if (req.method === "POST" && pathname === "/api/auth/signup") {
      const body = await collectBody(req);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const displayName = String(body.displayName || "").trim();

      if (!displayName) return json(res, req, 400, { error: "Pseudo requis" });
      if (!isValidEmail(email)) return json(res, req, 400, { error: "Email invalide" });
      if (!isValidPassword(password)) return json(res, req, 400, { error: "Mot de passe trop court (8 caractères minimum)" });
      if (getUserByEmail(email)) return json(res, req, 409, { error: "Un compte existe déjà avec cet email" });

      const role = ADMIN_EMAILS.includes(email) ? "admin" : "user";
      const accountStatus = role === "admin" ? "active" : "pending";
      const userRow = createUser({ email, password, displayName, role, accountStatus });

      if (role === "admin") {
        const session = createSession(userRow);
        return json(res, req, 201, {
          ...buildAuthResponse({ userRow, session }),
          message: "Compte admin créé et connecté."
        });
      }

      return json(res, req, 201, {
        ok: true,
        pending: true,
        user: toClientUser(userRow),
        message: "Compte créé. L’administrateur doit maintenant valider ton accès."
      });
    }

    if (req.method === "POST" && pathname === "/api/auth/signin") {
      const body = await collectBody(req);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const userRow = getUserByEmail(email);

      if (!email) return json(res, req, 400, { error: "Email requis" });
      if (!password) return json(res, req, 400, { error: "Mot de passe requis" });
      if (!userRow || !verifyPassword(password, userRow)) {
        return json(res, req, 401, { error: "Identifiants invalides" });
      }

      try {
        assertAllowedAccount(userRow);
      } catch (error) {
        return json(res, req, error.status || 403, { error: error.message });
      }

      const session = createSession(userRow);
      return json(res, req, 200, buildAuthResponse({ userRow, session }));
    }

    if (req.method === "POST" && pathname === "/api/auth/signout") {
      const token = getSessionToken(req);
      if (token) deleteSession(token);
      return json(res, req, 200, { ok: true });
    }

    if (req.method === "GET" && pathname === "/api/auth/session") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });
      return json(res, req, 200, buildAuthResponse({ userRow: auth.user, session: auth.session }));
    }

    if (req.method === "GET" && pathname === "/api/sync/pull") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });

      const payload = parseStateJson(auth.user.state_json, auth.user);
      return json(res, req, 200, {
        ...payload,
        updatedAt: payload.updatedAt || auth.user.updated_at || nowIso()
      });
    }

    if (req.method === "POST" && pathname === "/api/sync/push") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });

      const body = await collectBody(req);
      const payload = sanitizeIncomingState(body, auth.user);
      const updatedUser = updateUserState(auth.user.id, payload);

      return json(res, req, 200, {
        ok: true,
        synced: true,
        updatedAt: payload.updatedAt,
        profile: parseStateJson(updatedUser.state_json, updatedUser).profile
      });
    }

    if (req.method === "PUT" && pathname === "/api/profile") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });

      const body = await collectBody(req);
      const current = parseStateJson(auth.user.state_json, auth.user);
      const merged = sanitizeIncomingState({
        ...current,
        profile: {
          ...(current.profile || {}),
          ...(body.profile || {})
        }
      }, auth.user);
      const updatedUser = updateUserState(auth.user.id, merged);

      if (merged.profile?.name && merged.profile.name !== auth.user.display_name) {
        db.prepare("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?").run(
          merged.profile.name,
          nowIso(),
          auth.user.id
        );
      }

      return json(res, req, 200, {
        ok: true,
        profile: parseStateJson(updatedUser.state_json, updatedUser).profile,
        updatedAt: merged.updatedAt
      });
    }

    if (pathname === "/api/admin/dashboard" && req.method === "GET") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });
      if (auth.user.role !== "admin") return json(res, req, 403, { error: "Accès admin requis" });
      return json(res, req, 200, {
        ok: true,
        ...buildAdminDashboard(),
        updatedAt: nowIso()
      });
    }

    const matchUserDetailRoute = pathname.match(/^\/api\/admin\/users\/([^/]+)\/detail$/);
    if (matchUserDetailRoute && req.method === "GET") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });
      if (auth.user.role !== "admin") return json(res, req, 403, { error: "Accès admin requis" });

      return json(res, req, 200, {
        ok: true,
        ...buildAdminUserDetail(decodeURIComponent(matchUserDetailRoute[1]))
      });
    }

    const matchStatusRoute = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (matchStatusRoute && req.method === "PATCH") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });
      if (auth.user.role !== "admin") return json(res, req, 403, { error: "Accès admin requis" });

      const userId = decodeURIComponent(matchStatusRoute[1]);
      const body = await collectBody(req);
      const nextStatus = ["pending", "active", "suspended", "banned"].includes(body.status) ? body.status : "active";

      if (auth.user.id === userId && nextStatus !== "active") {
        return json(res, req, 400, { error: "Impossible de désactiver le compte admin connecté." });
      }

      const updatedUser = updateUserStatus(userId, nextStatus);
      if (!updatedUser) return json(res, req, 404, { error: "Utilisateur introuvable" });
      if (nextStatus !== "active") {
        deleteSessionsForUser(userId);
      }

      return json(res, req, 200, {
        ok: true,
        user: toClientUser(updatedUser)
      });
    }

    const matchPhotoRoute = pathname.match(/^\/api\/admin\/photos\/([^/]+)$/);
    if (matchPhotoRoute && req.method === "DELETE") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });
      if (auth.user.role !== "admin") return json(res, req, 403, { error: "Accès admin requis" });

      deletePhotoByCompositeId(decodeURIComponent(matchPhotoRoute[1]));
      return json(res, req, 200, { ok: true });
    }

    const matchUserPhotosRoute = pathname.match(/^\/api\/admin\/users\/([^/]+)\/photos$/);
    if (matchUserPhotosRoute && req.method === "DELETE") {
      const auth = getAuthenticatedUser(req);
      if (!auth) return json(res, req, 401, { error: "Session invalide ou expirée" });
      if (auth.user.role !== "admin") return json(res, req, 403, { error: "Accès admin requis" });

      deleteAllPhotosForUser(decodeURIComponent(matchUserPhotosRoute[1]));
      return json(res, req, 200, { ok: true });
    }

    return json(res, req, 404, { error: "Not found" });
  } catch (error) {
    return json(res, req, error.status || 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, () => {
  console.log(`MAYA Coach backend ready on http://localhost:${PORT}`);
  console.log(`Database: ${DB_FILE}`);
  console.log("Endpoints: /api/health, /api/auth/signup, /api/auth/signin, /api/auth/signout, /api/auth/session, /api/sync/pull, /api/sync/push, /api/profile, /api/admin/dashboard");
});
