import { state } from "./state.js";
import { renderHome } from "./render/home.js";
import { renderIA } from "./render/ia.js";
import { renderMySession } from "./render/my-session.js";
import { renderWorkout } from "./render/workout.js";
import { renderExos } from "./render/exos.js";
import { renderNutrition } from "./render/nutrition.js";
import { renderHistory } from "./render/history.js";
import { renderProgress } from "./render/progress.js";
import { renderStats } from "./render/stats.js";
import { renderFavoris } from "./render/favoris.js";
import { renderNoushiHome, renderNoushiSession, renderNoushiExos } from "./render/noushi.js";
import { renderHelp } from "./render/help.js";
import { renderRelax } from "./render/relax.js";
import { renderSettings } from "./render/settings.js";
import { renderAdmin } from "./render/admin.js";
import { renderAuth } from "./render/auth.js";
import { renderOnboarding } from "./render/onboarding.js";
import { hydrateUI } from "./ui.js";

const ROUTE_ALIASES = {
  noushi: "noushi-home"
};

const renderers = {
  auth: renderAuth,
  home: renderHome,
  ia: renderIA,
  "my-session": renderMySession,
  workout: renderWorkout,
  exos: renderExos,
  nutrition: renderNutrition,
  history: renderHistory,
  progress: renderProgress,
  stats: renderStats,
  favoris: renderFavoris,
  "noushi-home": renderNoushiHome,
  "noushi-session": renderNoushiSession,
  "noushi-exos": renderNoushiExos,
  help: renderHelp,
  relax: renderRelax,
  settings: renderSettings,
  admin: renderAdmin
};

const PAGE_LABELS = {
  auth: "Connexion",
  home: "Accueil",
  ia: "Coach",
  "my-session": "Créer séance",
  workout: "Séance",
  exos: "Exercices",
  nutrition: "Nutrition",
  history: "Suivi",
  progress: "Progression visuelle",
  stats: "Stats",
  favoris: "Favoris",
  "noushi-home": "NOUSHI accueil",
  "noushi-session": "NOUSHI séances",
  "noushi-exos": "NOUSHI exos",
  help: "Je sais pas comment",
  relax: "Recovery",
  settings: "Profil",
  admin: "Administration"
};

function normalizePage(page) {
  return ROUTE_ALIASES[page] || page || "home";
}

function isNoushiPage(page) {
  return String(page || "").startsWith("noushi-");
}

function getFallbackPage(page) {
  return isNoushiPage(page) ? "noushi-home" : "home";
}

function getPageNode(page) {
  return document.getElementById(`page-${page}`);
}

function getTopNavTarget(page) {
  if (isNoushiPage(page)) return "noushi-home";
  return page;
}

function guardPageAccess(page) {
  if (!state.currentUser) {
    return page === "auth" ? "auth" : "auth";
  }

  if (page === "auth") {
    return "home";
  }

  if (page === "admin" && state.profile?.role !== "admin") {
    return "home";
  }

  return page;
}

function syncActiveNavigation(page) {
  const topTarget = getTopNavTarget(page);
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === topTarget);
  });
  document.querySelectorAll(".quick-nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === page);
  });
}

function syncQuickNav(page) {
  const quickNav = document.getElementById("quickNav");
  if (!quickNav) return;
  const hidden = page === "auth" || page === "admin";
  quickNav.classList.toggle("hidden", hidden);
  quickNav.dataset.group = isNoushiPage(page) ? "noushi" : "main";
}

function syncShell(page) {
  const app = document.querySelector(".app");
  if (app) {
    app.dataset.page = page;
    app.classList.toggle("shell-auth", page === "auth");
  }

  const nav = document.getElementById("mainNav");
  if (nav) {
    nav.classList.toggle("hidden", page === "auth");
    nav.classList.toggle("expanded", Boolean(state.navExpanded) && page !== "auth");
  }

  syncQuickNav(page);
  syncActiveNavigation(page);

  const labelNode = document.getElementById("headerPageLabel");
  if (labelNode) {
    labelNode.textContent = PAGE_LABELS[page] || "MAYA Fitness";
  }

  const currentNode = document.getElementById("navCurrentLabel");
  if (currentNode) {
    currentNode.textContent = PAGE_LABELS[page] || "MAYA Fitness";
  }

  const logoutButton = document.getElementById("headerLogout");
  if (logoutButton) {
    logoutButton.toggleAttribute("hidden", page === "auth");
  }

  const backButton = document.getElementById("headerBack");
  if (backButton) {
    const hasReachableParent = page !== "auth" && page !== getFallbackPage(page);
    backButton.toggleAttribute("hidden", !hasReachableParent);
  }

  const adminButton = document.getElementById("navAdminButton");
  if (adminButton) {
    adminButton.hidden = state.profile?.role !== "admin";
  }
}

export function refreshShell() {
  syncShell(state.page);
}

export function refreshCurrentPage() {
  const page = normalizePage(state.page);
  const renderer = renderers[page];
  const pageNode = getPageNode(page);
  if (renderer && pageNode) {
    renderer(pageNode);
  }
  syncShell(page);
  renderOnboarding(document.getElementById("onboardingShell"));
  hydrateUI(document);
}

export function goToPage(page, options = {}) {
  const nextPage = guardPageAccess(normalizePage(page));
  const { fromBack = false, resetHistory = false } = options;

  if (resetHistory) {
    state.pageHistory = [nextPage];
  } else if (fromBack) {
    if (!state.pageHistory.length) {
      state.pageHistory = [nextPage];
    }
  } else if (state.pageHistory[state.pageHistory.length - 1] !== nextPage) {
    state.pageHistory = [...(state.pageHistory || []), nextPage];
  } else if (!state.pageHistory.length) {
    state.pageHistory = [nextPage];
  }

  state.navExpanded = false;
  state.page = nextPage;
  if (nextPage !== "ia") state.coachSheetOpen = false;
  if (nextPage !== "nutrition") state.nutritionSheetOpen = false;
  if (nextPage === "settings" && !state.settingsTab) {
    state.settingsTab = "identity";
  }

  document.querySelectorAll(".page").forEach((section) => section.classList.remove("active"));
  const pageNode = getPageNode(nextPage);
  if (pageNode) pageNode.classList.add("active");

  syncShell(nextPage);
  refreshCurrentPage();
}

export function goBack() {
  if ((state.pageHistory || []).length <= 1) {
    const fallbackPage = getFallbackPage(state.page);
    if (state.page !== fallbackPage) {
      goToPage(fallbackPage, { resetHistory: true });
    }
    return;
  }
  state.pageHistory = state.pageHistory.slice(0, -1);
  const previousPage = state.pageHistory[state.pageHistory.length - 1] || "home";
  goToPage(previousPage, { fromBack: true });
}

export function initRouter() {
  refreshCurrentPage();
}
