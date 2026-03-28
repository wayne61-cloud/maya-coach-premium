#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "maya-coach-db.json");
const PORT = Number(process.env.MAYA_BACKEND_PORT || 8788);
const DEV_TOKEN = process.env.MAYA_DEV_TOKEN || "maya-dev-token";

fs.mkdirSync(DATA_DIR, { recursive: true });

function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: {}, links: {} };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function json(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization"
  });
  res.end(JSON.stringify(body));
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(JSON.parse(raw || "{}")));
    req.on("error", reject);
  });
}

function getAuthUser(req, db) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;
  return db.users[token] || null;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return json(res, 200, { ok: true });
    }

    const db = readDb();

    if (req.method === "POST" && req.url === "/api/auth/magic-link") {
      const body = await collectBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      if (!email) return json(res, 400, { error: "email required" });

      const token = `${DEV_TOKEN}:${Buffer.from(email).toString("base64url")}`;
      db.users[token] = db.users[token] || {
        email,
        profile: {},
        profileSnapshots: [],
        history: [],
        favorites: [],
        nutritionProfile: null,
        nutritionHistory: [],
        aiConfig: null,
        notificationConfig: null,
        updatedAt: new Date().toISOString()
      };
      db.links[email] = { token, previewLink: `maya://magic-login?token=${encodeURIComponent(token)}` };
      writeDb(db);
      return json(res, 200, {
        ok: true,
        message: "Magic link simulated for local development.",
        previewLink: db.links[email].previewLink,
        token
      });
    }

    if (req.method === "GET" && req.url === "/api/sync/pull") {
      const user = getAuthUser(req, db);
      if (!user) return json(res, 401, { error: "Unauthorized" });
      return json(res, 200, {
        profile: user.profile,
        profileSnapshots: user.profileSnapshots,
        history: user.history,
        favorites: user.favorites,
        nutritionProfile: user.nutritionProfile,
        nutritionHistory: user.nutritionHistory,
        aiConfig: user.aiConfig,
        notificationConfig: user.notificationConfig,
        updatedAt: user.updatedAt
      });
    }

    if (req.method === "POST" && req.url === "/api/sync/push") {
      const user = getAuthUser(req, db);
      if (!user) return json(res, 401, { error: "Unauthorized" });
      const body = await collectBody(req);
      user.profile = body.profile ?? user.profile;
      user.profileSnapshots = Array.isArray(body.profileSnapshots) ? body.profileSnapshots : user.profileSnapshots;
      user.history = Array.isArray(body.history) ? body.history : user.history;
      user.favorites = Array.isArray(body.favorites) ? body.favorites : user.favorites;
      user.nutritionProfile = body.nutritionProfile ?? user.nutritionProfile;
      user.nutritionHistory = Array.isArray(body.nutritionHistory) ? body.nutritionHistory : user.nutritionHistory;
      user.aiConfig = body.aiConfig ?? user.aiConfig;
      user.notificationConfig = body.notificationConfig ?? user.notificationConfig;
      user.updatedAt = new Date().toISOString();
      writeDb(db);
      return json(res, 200, { ok: true, updatedAt: user.updatedAt });
    }

    if (req.method === "PUT" && req.url === "/api/profile") {
      const user = getAuthUser(req, db);
      if (!user) return json(res, 401, { error: "Unauthorized" });
      const body = await collectBody(req);
      user.profile = { ...(user.profile || {}), ...(body.profile || {}) };
      user.updatedAt = new Date().toISOString();
      writeDb(db);
      return json(res, 200, { ok: true, profile: user.profile, updatedAt: user.updatedAt });
    }

    if (req.method === "GET" && req.url === "/api/health") {
      return json(res, 200, { ok: true, service: "maya-coach-backend", port: PORT });
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, () => {
  console.log(`MAYA Coach backend ready on http://localhost:${PORT}`);
  console.log("Endpoints: POST /api/auth/magic-link, GET /api/sync/pull, POST /api/sync/push, PUT /api/profile, GET /api/health");
});
