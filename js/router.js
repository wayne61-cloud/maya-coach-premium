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

function getPageNode(page) {
  return document.getElementById(`page-${page}`);
}

export function refreshCurrentPage() {
  const renderer = renderers[state.page];
  const pageNode = getPageNode(state.page);
  if (renderer && pageNode) {
    renderer(pageNode);
  }
  renderOnboarding(document.getElementById("onboardingShell"));
}

export function goToPage(page) {
  state.page = page;
  document.querySelectorAll(".page").forEach((section) => section.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
  const pageNode = getPageNode(page);
  if (pageNode) pageNode.classList.add("active");
  refreshCurrentPage();
}

export function initRouter() {
  refreshCurrentPage();
}
