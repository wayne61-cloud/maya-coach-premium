import { RELAX_DATA } from "../catalog.js";
import { escapeHtml } from "../utils.js";

export function renderRelax(node) {
  node.innerHTML = `
    <div class="section">
      <div class="card">
        <h2>Relax</h2>
        <p class="muted">Chaque protocole Relax crée une trace recovery pour enrichir le streak et les stats de récupération.</p>
      </div>
      <div class="list">
        ${RELAX_DATA.map((item) => `
          <article class="exercise-card">
            <div class="exercise-title">${escapeHtml(item.nom)}</div>
            <div class="exercise-meta">
              <span class="pill">${item.temps} min</span>
              <span class="pill">${escapeHtml(item.type)}</span>
            </div>
            <div class="coach-grid">
              <div><strong>Bénéfices:</strong> ${escapeHtml(item.benefices)}</div>
              <div><strong>Flow:</strong> ${escapeHtml(item.prep)}</div>
            </div>
            <button class="btn btn-main" data-action="start-protocol" data-type="relax" data-id="${item.id}">Lancer et compter dans l'historique</button>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}
