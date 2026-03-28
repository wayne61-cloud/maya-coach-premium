import { NOUSHI_EXOS } from "../catalog.js";
import { escapeHtml } from "../utils.js";

export function renderNoushi(node) {
  node.innerHTML = `
    <div class="section">
      <div class="card module-relax glow-violet">
        <h2>NOUSHI</h2>
        <p class="muted">Les protocoles NOUSHI créent maintenant une entrée d'historique pour impacter stats, streak et recovery score.</p>
      </div>
      <div class="list">
        ${NOUSHI_EXOS.map((item) => `
          <article class="exercise-card module-relax">
            <div class="exercise-title">${escapeHtml(item.nom)}</div>
            <div class="exercise-meta">
              <span class="pill">${item.temps} min</span>
              <span class="pill">${escapeHtml(item.objectif)}</span>
            </div>
            <div class="coach-grid">
              <div><strong>Bénéfices:</strong> ${escapeHtml(item.benefices)}</div>
              <div><strong>Séquence:</strong> ${escapeHtml(item.prep)}</div>
            </div>
            <button class="btn btn-main" data-action="start-protocol" data-type="noushi" data-id="${item.id}">Lancer et compter dans l'historique</button>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}
