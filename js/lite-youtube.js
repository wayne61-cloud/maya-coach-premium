const LITE_YOUTUBE_SCRIPT_ID = "maya-lite-youtube-script";
const LITE_YOUTUBE_STYLE_ID = "maya-lite-youtube-style";
const LITE_YOUTUBE_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/lite-youtube-embed/src/lite-yt-embed.js";
const LITE_YOUTUBE_STYLE_URL = "https://cdn.jsdelivr.net/npm/lite-youtube-embed/src/lite-yt-embed.css";

let liteYoutubeReadyPromise = null;

function ensureStylesheet() {
  if (document.getElementById(LITE_YOUTUBE_STYLE_ID)) return;
  const link = document.createElement("link");
  link.id = LITE_YOUTUBE_STYLE_ID;
  link.rel = "stylesheet";
  link.href = LITE_YOUTUBE_STYLE_URL;
  document.head.append(link);
}

export function ensureLiteYouTubeEmbed() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }
  if (window.customElements?.get("lite-youtube")) {
    return Promise.resolve();
  }
  if (liteYoutubeReadyPromise) {
    return liteYoutubeReadyPromise;
  }

  ensureStylesheet();

  liteYoutubeReadyPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(LITE_YOUTUBE_SCRIPT_ID);
    if (existingScript) {
      window.customElements.whenDefined("lite-youtube").then(resolve).catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.id = LITE_YOUTUBE_SCRIPT_ID;
    script.src = LITE_YOUTUBE_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      window.customElements.whenDefined("lite-youtube").then(resolve).catch(reject);
    };
    script.onerror = () => reject(new Error("Impossible de charger le lecteur YouTube léger"));
    document.head.append(script);
  }).catch((error) => {
    liteYoutubeReadyPromise = null;
    throw error;
  });

  return liteYoutubeReadyPromise;
}
