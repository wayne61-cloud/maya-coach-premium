import { getFlowiseProductConfig, hasFlowiseProductConfig } from "./app-config.js";
import { getSharedDashboardData } from "./insights.js";
import { persistFlowiseConfig, sanitizeFlowiseConfig, state } from "./state.js";

const FLOWISE_WIDGETS = "flowise-chatbot, flowise-fullchatbot";
const DEFAULT_EMBED_URL = "https://cdn.jsdelivr.net/npm/flowise-embed/dist/web.js";
const moduleLoaders = new Map();
let activeSignature = "";

export function generateFlowiseSessionId() {
  if (state.currentUser?.id) {
    return `maya_${state.currentUser.id}`;
  }
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `maya_${crypto.randomUUID()}`;
  }
  return `maya_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getEmbedUrl(version) {
  return version && version !== "latest"
    ? `https://cdn.jsdelivr.net/npm/flowise-embed@${version}/dist/web.js`
    : DEFAULT_EMBED_URL;
}

function loadFlowiseLibrary(version) {
  const url = getEmbedUrl(version);
  if (!moduleLoaders.has(url)) {
    moduleLoaders.set(
      url,
      import(url).then((module) => module.default || module.Chatbot || window.Chatbot)
    );
  }
  return moduleLoaders.get(url);
}

function buildWidgetSignature(config, context) {
  return JSON.stringify({
    version: config.version,
    apiHost: config.apiHost,
    chatflowId: config.chatflowId,
    sessionId: config.sessionId,
    profile: context.profile?.name || "",
    latestTraining: context.latestTraining?.id || context.latestTraining?.date || "",
    latestNutrition: context.nutrition?.goal || ""
  });
}

function buildWidgetTheme() {
  return {
    button: {
      backgroundColor: "#f4c537",
      iconColor: "#120d03",
      right: 14,
      bottom: 88,
      size: 44,
      dragAndDrop: false,
      autoWindowOpen: {
        autoOpen: false,
        autoOpenOnMobile: false
      }
    },
    tooltip: {
      showTooltip: true,
      tooltipMessage: "Parler à Maya",
      tooltipBackgroundColor: "#15120b",
      tooltipTextColor: "#fff4d1",
      tooltipFontSize: 13
    },
    chatWindow: {
      showTitle: true,
      title: "Maya Coach",
      titleTextColor: "#fff8e8",
      titleBackgroundColor: "#111111",
      titleAvatarSrc: "./maya-coach-ui/web-opt/logo/maya-app-icon.jpg",
      welcomeMessage: "Salut, je suis Maya. Je vois ton profil, ta dernière séance, ta récupération et ton fuel du jour.",
      errorMessage: "Le coach Flowise est indisponible. Le coach intégré reste disponible dans l’app.",
      backgroundColor: "#0c0c0c",
      height: 560,
      width: 360,
      fontSize: 14,
      clearChatOnReload: false,
      starterPrompts: [
        "Analyse ma séance du jour",
        "Que manger après l'entraînement ?",
        "Comment progresser cette semaine ?"
      ],
      starterPromptFontSize: 13,
      sourceDocsTitle: "Sources",
      botMessage: {
        backgroundColor: "#17140f",
        textColor: "#fff7e4",
        showAvatar: true,
        avatarSrc: "./maya-coach-ui/web-opt/logo/maya-app-icon.jpg"
      },
      userMessage: {
        backgroundColor: "#f4c537",
        textColor: "#120d03",
        showAvatar: false
      },
      textInput: {
        placeholder: "Question rapide pour Maya...",
        backgroundColor: "#111111",
        textColor: "#fff8e8",
        sendButtonColor: "#f4c537",
        maxChars: 280,
        maxCharsWarningMessage: "Reste sous 280 caractères pour un échange mobile plus fluide.",
        autoFocus: false,
        sendMessageSound: false,
        receiveMessageSound: false
      },
      footer: {
        textColor: "#cdbf9e",
        text: "Powered by",
        company: "Flowise",
        companyLink: "https://flowiseai.com"
      }
    },
    customCSS: `
      .chatbot-container,
      .chatbot-container * {
        font-family: "Avenir Next", "Trebuchet MS", sans-serif !important;
      }
      .chatbot-container {
        border: 1px solid rgba(244, 197, 55, 0.22) !important;
        border-radius: 24px !important;
        overflow: hidden !important;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.42) !important;
      }
      .chatbot-icon-button,
      .chatbot-icon-button:hover {
        box-shadow: 0 18px 34px rgba(0, 0, 0, 0.34) !important;
      }
      .chatbot-bot-message,
      .chatbot-user-message {
        border-radius: 16px !important;
      }
    `
  };
}

function syncPublicFlowiseState(partialConfig = {}) {
  const product = getFlowiseProductConfig();
  state.flowiseConfig = sanitizeFlowiseConfig({
    ...(state.flowiseConfig || {}),
    enabled: Boolean(product.enabled),
    version: product.version || state.flowiseConfig?.version || "latest",
    sessionId: state.flowiseConfig?.sessionId || generateFlowiseSessionId(),
    ...partialConfig
  });
  persistFlowiseConfig();
  return state.flowiseConfig;
}

function buildChatflowContext(shared) {
  return {
    sessionId: state.flowiseConfig?.sessionId || generateFlowiseSessionId(),
    returnSourceDocuments: true,
    profileContext: JSON.stringify({
      name: shared.profile?.name || "",
      goal: shared.profile?.goal || "",
      level: shared.profile?.level || "",
      frequency: shared.profile?.frequency || "",
      sessionTime: shared.profile?.sessionTime || ""
    }),
    latestTrainingContext: JSON.stringify({
      title: shared.latestTraining?.title || "",
      date: shared.latestTraining?.date || "",
      load: shared.latestTraining?.trainingLoad || "",
      feedback: shared.latestTraining?.feedback || ""
    }),
    nutritionContext: JSON.stringify({
      goal: shared.nutrition?.goal || "",
      proteins: shared.nutrition?.totals?.proteins || 0,
      calories: shared.nutrition?.totals?.calories || 0,
      trainingLoad: shared.nutrition?.trainingLoad || ""
    }),
    progressContext: JSON.stringify({
      streak: shared.stats?.streak || 0,
      weekSessions: shared.stats?.weekSessions || 0,
      weekRatio: shared.weekRatio || 0,
      recoveryScore: shared.recoveryScore || 0
    })
  };
}

export function updateFlowiseConfig(partialConfig) {
  return syncPublicFlowiseState(partialConfig);
}

export function destroyFlowiseWidget() {
  try {
    window.Chatbot?.destroy?.();
  } catch {}
  document.querySelectorAll(FLOWISE_WIDGETS).forEach((node) => node.remove());
  activeSignature = "";
}

export async function syncFlowiseWidget() {
  syncPublicFlowiseState();
  const currentConfig = state.flowiseConfig || {};
  const productConfig = getFlowiseProductConfig();

  if (!currentConfig.enabled || !state.currentUser?.id || state.page === "auth") {
    destroyFlowiseWidget();
    syncPublicFlowiseState({ status: "idle", error: "" });
    return { ok: false, reason: "disabled" };
  }

  if (!hasFlowiseProductConfig()) {
    destroyFlowiseWidget();
    syncPublicFlowiseState({
      status: "fallback",
      error: "Flowise non configuré dans l’app",
      lastMountedAt: new Date().toISOString()
    });
    return { ok: false, reason: "unconfigured" };
  }

  const nextSessionId = currentConfig.sessionId || generateFlowiseSessionId();
  syncPublicFlowiseState({ sessionId: nextSessionId });

  const shared = getSharedDashboardData();
  const context = buildChatflowContext(shared);
  const signature = buildWidgetSignature({
    version: productConfig.version || currentConfig.version,
    apiHost: productConfig.apiHost,
    chatflowId: productConfig.chatflowId,
    sessionId: nextSessionId
  }, shared);

  if (signature === activeSignature && document.querySelector(FLOWISE_WIDGETS)) {
    return { ok: true, reused: true };
  }

  try {
    const Chatbot = await loadFlowiseLibrary(productConfig.version || currentConfig.version);
    if (!Chatbot?.init) {
      throw new Error("Widget Flowise indisponible");
    }

    destroyFlowiseWidget();
    Chatbot.init({
      chatflowid: productConfig.chatflowId,
      apiHost: productConfig.apiHost,
      chatflowConfig: context,
      theme: buildWidgetTheme()
    });

    activeSignature = signature;
    syncPublicFlowiseState({
      status: "ready",
      error: "",
      sessionId: nextSessionId,
      lastMountedAt: new Date().toISOString()
    });
    return { ok: true };
  } catch (error) {
    destroyFlowiseWidget();
    const message = error instanceof Error ? error.message : String(error);
    syncPublicFlowiseState({
      status: "fallback",
      error: message,
      sessionId: nextSessionId,
      lastMountedAt: new Date().toISOString()
    });
    return { ok: false, error: message };
  }
}
