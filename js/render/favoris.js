import { EXO_BY_ID, RECIPE_BY_ID } from "../catalog.js";
import { state } from "../state.js";
import { buildEmptyState, escapeHtml } from "../utils.js";

export function renderFavoris(node) {
  const items = [...state.favorites]
    .map((favoriteKey) => {
      const [type, id] = favoriteKey.split(":");
      if (type === "exo") return { type, item: EXO_BY_ID.get(id) };
      if (type === "recipe") return { type, item: RECIPE_BY_ID.get(id) };
      if (type === "session") return { type, item: state.history.find((entry) => entry.id === id) };
      return null;
    })
    .filter((entry) => entry?.item);

  node.innerHTML = `
    <div class="section">
      <div class="card">
        <h2>Favoris</h2>
        <p class="muted">Tu peux maintenant sauvegarder des exercices, des recettes et des séances complètes comme templates de relance.</p>
      </div>
      <div class="list">
        ${items.length ? items.map(({ type, item }) => {
          if (type === "exo") {
            return `
              <article class="exercise-card">
                <div class="exercise-head">
                  <div>
                    <div class="exercise-title">${escapeHtml(item.nom)}</div>
                    <div class="exercise-meta"><span class="pill">Exercice</span><span class="pill">${escapeHtml(item.muscle)}</span></div>
                  </div>
                  <button class="icon-btn active" data-action="toggle-favorite" data-type="exo" data-id="${item.id}">⭐</button>
                </div>
                <div class="actions-row two">
                  <button class="btn btn-main" data-action="add-exo-session" data-id="${item.id}">Ajouter à Ma séance</button>
                  <button class="btn btn-soft" data-action="ai-around-exo" data-id="${item.id}">Séance IA associée</button>
                </div>
              </article>
            `;
          }
          if (type === "recipe") {
            return `
              <article class="exercise-card">
                <div class="exercise-head">
                  <div>
                    <div class="exercise-title">${escapeHtml(item.nom)}</div>
                    <div class="exercise-meta"><span class="pill">Recette</span><span class="pill">${item.prot} g prot</span></div>
                  </div>
                  <button class="icon-btn active" data-action="toggle-favorite" data-type="recipe" data-id="${item.id}">⭐</button>
                </div>
                <div class="muted">${escapeHtml(item.moment)}</div>
              </article>
            `;
          }
          return `
            <article class="exercise-card">
              <div class="exercise-head">
                <div>
                  <div class="exercise-title">${escapeHtml(item.title)}</div>
                  <div class="exercise-meta"><span class="pill">Séance</span><span class="pill">${escapeHtml(item.objective || "-")}</span></div>
                </div>
                <button class="icon-btn active" data-action="toggle-favorite" data-type="session" data-id="${item.id}">⭐</button>
              </div>
              <div class="actions-row two">
                <button class="btn btn-main" data-action="replay-session" data-id="${item.id}">Rejouer</button>
                <button class="btn btn-soft" data-action="adapt-session" data-id="${item.id}">Adapter avec IA</button>
              </div>
            </article>
          `;
        }).join("") : buildEmptyState("Aucun favori", "Ajoute ton premier exo, ta première recette ou ta première séance favorite.", "Voir la bibliothèque", "go-exos")}
      </div>
    </div>
  `;
}
