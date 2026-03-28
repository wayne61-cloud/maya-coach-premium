#!/usr/bin/env node
import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function json(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2_000_000) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function extractOutputText(responseJson) {
  if (typeof responseJson?.output_text === "string" && responseJson.output_text.trim()) {
    return responseJson.output_text;
  }
  const parts = [];
  (responseJson?.output || []).forEach((out) => {
    (out.content || []).forEach((c) => {
      if (c.type === "output_text" && c.text) parts.push(c.text);
    });
  });
  return parts.join("\n");
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) throw new Error("OpenAI response text is empty");

  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end < 0 || end <= start) {
      throw new Error("JSON not found in OpenAI output");
    }
    return JSON.parse(raw.slice(start, end + 1));
  }
}

function validatePlanAgainstCatalog(plan, payload) {
  const allowedIds = new Set((payload?.exos || []).map((exo) => exo.id));
  const blocks = Array.isArray(plan?.blocks) ? plan.blocks : [];
  if (!blocks.length) {
    throw new Error("Generated plan has no blocks");
  }
  blocks.forEach((block, index) => {
    if (!allowedIds.has(block.exerciseId)) {
      throw new Error(`Unknown exerciseId at block ${index + 1}: ${block.exerciseId}`);
    }
    const sets = parseInt(block.sets, 10);
    const restSec = parseInt(block.restSec, 10);
    if (!Number.isFinite(sets) || sets < 1 || sets > 8) {
      throw new Error(`Invalid sets at block ${index + 1}`);
    }
    if (!Number.isFinite(restSec) || restSec < 20 || restSec > 240) {
      throw new Error(`Invalid restSec at block ${index + 1}`);
    }
    if (!/^(\d+(-\d+)?|\d+s|\d+x\d+)$/.test(String(block.reps || "").trim())) {
      throw new Error(`Invalid reps at block ${index + 1}`);
    }
  });
  return plan;
}

async function generatePlanWithOpenAI(payload) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing on proxy");
  }
  const systemText = [
    "You are MAYA Coach.",
    "Return strict JSON only, no markdown.",
    "Never invent unknown exercises.",
    "Pick exercises only from provided exos array.",
    "Account for cycleWeek, feedbackTrend and recent history.",
    "Every block must contain a valid exerciseId from exos.",
    "Schema:",
    "{title, warmup:string[], blocks:[{exerciseId,sets,reps,restSec,tempo}], finisher, coachReasoning:string[]}"
  ].join(" ");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      max_output_tokens: 900,
      ...(payload?.internetEnabled ? {
        tools: [{ type: "web_search" }],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"]
      } : {}),
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: `${systemText} Use athleteProfile for safer and smarter scaling. Use web search only if it materially improves your plan or recommendations.` }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(payload) }]
        }
      ]
    })
  });

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${txt.slice(0, 300)}`);
  }

  const data = await response.json();
  const outputText = extractOutputText(data);
  return validatePlanAgainstCatalog(extractJsonObject(outputText), payload);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && req.url === "/api/maya-coach/health") {
      return json(res, 200, {
        ok: true,
        service: "maya-coach-proxy",
        model: OPENAI_MODEL,
        configured: Boolean(OPENAI_API_KEY),
        webSearchAvailable: true
      });
    }

    if (req.method !== "POST" || req.url !== "/api/maya-coach") {
      return json(res, 404, { error: "Not found" });
    }

    const raw = await collectBody(req);
    const body = JSON.parse(raw || "{}");

    const plan = await generatePlanWithOpenAI(body);
    return json(res, 200, { plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json(res, 500, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`MAYA Coach proxy listening on http://localhost:${PORT}/api/maya-coach`);
  if (!OPENAI_API_KEY) {
    console.log("Warning: proxy started without OPENAI_API_KEY. Health endpoint works, generation returns an error until a key is configured.");
  }
});
