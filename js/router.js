import { state } from "./state.js";
import { renderHome } from "./render/home.js";
import { renderIA } from "./render/ia.js";
import { renderWorkout } from "./render/workout.js";
import { renderExos } from "./render/exos.js";
import { renderNutrition } from "./render/nutrition.js";
import { renderHistory } from "./render/history.js";
import { renderStats } from "./render/stats.js";
import { renderFavoris } from "./render/favoris.js";
import { renderNoushi } from "./render/noushi.js";
import { renderRelax } from "./render/relax.js";
import { renderSettings } from "./render/settings.js";
import { renderOnboarding } from "./render/onboarding.js";

const renderers = {
  home: renderHome,
  ia: renderIA,
  workout: renderWorkout,
  exos: renderExos,
  nutrition: renderNutrition,
  history: renderHistory,
  stats: renderStats,
  favoris: renderFavoris,
  noushi: renderNoushi,
  relax: renderRelax,
  settings: renderSettings
};

const PAGE_LABELS = {
  home: "Accueil",
  ia: "Coach IA",
  workout: "Séance",
  exos: "Bibliothèque",
  nutrition: "Nutrition",
  history: "Progression",
  stats: "Stats",
  favoris: "Favoris",
  noushi: "NOUSHI",
  relax: "Recovery",
  settings: "Profil"
};

function getPageNode(page) {
  return document.getElementById(`page-${page}`);
}

function syncShell(page) {
  const app = document.querySelector(".app");
  if (app) app.dataset.page = page;
  const labelNode = document.getElementById("headerPageLabel");
  if (labelNode) {
    labelNode.textContent = PAGE_LABELS[page] || "MAYA Coach";
  }
}

export function refreshCurrentPage() {
  const renderer = renderers[state.page];
  const pageNode = getPageNode(state.page);
  if (renderer && pageNode) {
    renderer(pageNode);
  }
  syncShell(state.page);
  renderOnboarding(document.getElementById("onboardingShell"));
}

export function goToPage(page) {
  state.page = page;
  if (page === "settings" && !state.settingsTab) {
    state.settingsTab = "profile";
  }
  document.querySelectorAll(".page").forEach((section) => section.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  const pageNode = getPageNode(page);
  if (pageNode) pageNode.classList.add("active");
  syncShell(page);
  refreshCurrentPage();
}

export function initRouter() {
  refreshCurrentPage();
}
