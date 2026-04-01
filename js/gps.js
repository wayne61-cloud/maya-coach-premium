import { state, persistActiveRun, persistRuns } from "./state.js";
import { uid } from "./utils.js";

let gpsWatchId = null;
let timerHandle = null;
let wakeLock = null;

const RUN_TYPE_LABELS = {
  free: "Course libre",
  tempo: "Tempo",
  endurance: "Endurance fondamentale",
  intervals: "Fractionné",
  long_run: "Sortie longue",
  hills: "Côtes"
};

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function acquireWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch { /* non-critical */ }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}

function startGpsWatch() {
  if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
  gpsWatchId = navigator.geolocation.watchPosition(
    onGpsPosition,
    () => {},
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
}

function stopGpsWatch() {
  if (gpsWatchId !== null) {
    navigator.geolocation.clearWatch(gpsWatchId);
    gpsWatchId = null;
  }
}

function startTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = setInterval(() => {
    if (!state.activeRun || state.activeRun.status !== "running") return;
    state.activeRun.durationSec = Math.round(
      (Date.now() - state.activeRun.startedAt - state.activeRun.totalPausedMs) / 1000
    );
  }, 1000);
}

function stopTimer() {
  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }
}

function onGpsPosition(position) {
  if (!state.activeRun || state.activeRun.status !== "running") return;
  if (!position.coords || position.coords.accuracy > 30) return;

  const point = {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    ts: position.timestamp,
    acc: Math.round(position.coords.accuracy),
    alt: position.coords.altitude,
    speed: position.coords.speed
  };

  const last = state.activeRun.lastPosition;
  if (last) {
    const delta = haversine(last.lat, last.lng, point.lat, point.lng);
    if (delta > 2 && delta < 100) {
      state.activeRun.distanceM += delta;
    }
  }

  state.activeRun.gpsPoints.push(point);
  state.activeRun.lastPosition = { lat: point.lat, lng: point.lng };
  updateSplits();

  if (state.activeRun.gpsPoints.length % 10 === 0) {
    persistActiveRun();
  }
}

function updateSplits() {
  const run = state.activeRun;
  if (!run) return;
  const currentKm = Math.floor(run.distanceM / 1000);
  while (run.splits.length < currentKm) {
    const kmIndex = run.splits.length;
    const kmPoints = run.gpsPoints.filter((p) => {
      const d = computeDistanceAtPoint(run.gpsPoints, run.gpsPoints.indexOf(p));
      return d >= kmIndex * 1000 && d < (kmIndex + 1) * 1000;
    });
    const firstTs = kmPoints.length ? kmPoints[0].ts : run.startedAt;
    const lastTs = kmPoints.length ? kmPoints[kmPoints.length - 1].ts : Date.now();
    const elapsedSec = Math.round((lastTs - firstTs) / 1000);
    run.splits.push({
      km: kmIndex + 1,
      paceSec: elapsedSec,
      distanceM: 1000,
      elapsedSec
    });
  }
}

function computeDistanceAtPoint(points, targetIndex) {
  let dist = 0;
  for (let i = 1; i <= targetIndex && i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const d = haversine(prev.lat, prev.lng, curr.lat, curr.lng);
    if (d > 2 && d < 100) dist += d;
  }
  return dist;
}

function computeAvgPace(distanceM, durationSec) {
  if (!distanceM || distanceM < 10) return null;
  return Math.round((durationSec / distanceM) * 1000);
}

function computeBestSplitPace(splits) {
  if (!splits.length) return null;
  return Math.min(...splits.map((s) => s.paceSec));
}

function estimateCalories(distanceM) {
  const weightKg = parseFloat(state.profile?.weightKg || "70") || 70;
  const km = distanceM / 1000;
  return Math.round(km * weightKg * 1.036);
}

export async function startRun(runType = "free") {
  if (state.activeRun) return false;
  if (!navigator.geolocation) throw new Error("GPS non disponible sur cet appareil");

  await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      reject(new Error(err.code === 1 ? "Permission GPS refusée" : "GPS indisponible"));
    }, { enableHighAccuracy: true, timeout: 10000 });
  });

  state.activeRun = {
    id: uid("run"),
    status: "running",
    startedAt: Date.now(),
    pausedAt: null,
    totalPausedMs: 0,
    runType,
    gpsPoints: [],
    splits: [],
    distanceM: 0,
    durationSec: 0,
    lastPosition: null
  };

  startGpsWatch();
  startTimer();
  await acquireWakeLock();
  persistActiveRun();
  return true;
}

export function pauseRun() {
  if (!state.activeRun || state.activeRun.status !== "running") return;
  state.activeRun.status = "paused";
  state.activeRun.pausedAt = Date.now();
  stopGpsWatch();
  stopTimer();
  releaseWakeLock();
  persistActiveRun();
}

export function resumeRun() {
  if (!state.activeRun || state.activeRun.status !== "paused") return;
  state.activeRun.totalPausedMs += Date.now() - state.activeRun.pausedAt;
  state.activeRun.status = "running";
  state.activeRun.pausedAt = null;
  startGpsWatch();
  startTimer();
  acquireWakeLock().catch(() => {});
  persistActiveRun();
}

export function finishRun() {
  if (!state.activeRun) return null;
  stopGpsWatch();
  stopTimer();
  releaseWakeLock();

  if (state.activeRun.status === "paused" && state.activeRun.pausedAt) {
    state.activeRun.totalPausedMs += Date.now() - state.activeRun.pausedAt;
  }

  const finalDuration = Math.round(
    (Date.now() - state.activeRun.startedAt - state.activeRun.totalPausedMs) / 1000
  );

  const completed = {
    id: state.activeRun.id,
    title: RUN_TYPE_LABELS[state.activeRun.runType] || "Course",
    runType: state.activeRun.runType,
    startedAt: new Date(state.activeRun.startedAt).toISOString(),
    finishedAt: new Date().toISOString(),
    durationSec: finalDuration,
    distanceM: Math.round(state.activeRun.distanceM),
    avgPaceSec: computeAvgPace(state.activeRun.distanceM, finalDuration),
    bestPaceSec: computeBestSplitPace(state.activeRun.splits),
    caloriesEstimate: estimateCalories(state.activeRun.distanceM),
    gpsPoints: state.activeRun.gpsPoints,
    splits: state.activeRun.splits,
    status: "completed",
    metadata: {}
  };

  state.runs.unshift(completed);
  state.activeRun = null;
  persistRuns();
  persistActiveRun();
  return completed;
}

export function discardRun() {
  stopGpsWatch();
  stopTimer();
  releaseWakeLock();
  state.activeRun = null;
  persistActiveRun();
}

export function restoreActiveRun() {
  if (!state.activeRun) return;
  if (state.activeRun.status === "running") {
    startGpsWatch();
    startTimer();
    acquireWakeLock().catch(() => {});
  }
}

export function getActiveRunPace() {
  const run = state.activeRun;
  if (!run || run.distanceM < 50) return null;
  return computeAvgPace(run.distanceM, run.durationSec);
}

export function formatPace(secPerKm) {
  if (!secPerKm || !Number.isFinite(secPerKm)) return "--:--";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")}/km`;
}

export function formatRunDuration(totalSec) {
  if (!totalSec && totalSec !== 0) return "--:--";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDistance(meters) {
  if (!meters && meters !== 0) return "0 m";
  return meters >= 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${Math.round(meters)} m`;
}
