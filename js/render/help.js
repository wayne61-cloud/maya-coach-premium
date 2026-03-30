import { HELP_ARTICLES, HELP_CATEGORIES } from "../../data/help.js";
import { escapeHtml } from "../utils.js";

function renderCategory(articleGroup) {
  return `
    <section class="card help-category-card">
      <div class="native-block-head">
        <div>
          <div class="eyebrow">Catégorie</div>
          <h3>${escapeHtml(articleGroup.titre)}</h3>
        </div>
        <span class="pill">${articleGroup.articles.length} articles</span>
      </div>
      <p class="muted">${escapeHtml(articleGroup.description)}</p>

      <div class="list">
        ${articleGroup.articles.map((article) => `
          <details class="help-article-card">
            <summary class="help-article-summary">
              <span class="help-article-summary-copy">
                <span class="eyebrow">Guide pratique</span>
                <strong class="help-article-title">${escapeHtml(article.titre)}</strong>
                <span class="help-article-hook">${escapeHtml(article.accroche)}</span>
              </span>
              <span class="pill pill-soft">Ouvrir</span>
            </summary>

            <div class="help-article-content">
              <p class="muted">${escapeHtml(article.resume)}</p>

              <div class="coach-grid">
                <div>
                  <strong>À retenir</strong><br>
                  ${article.pointsCles.map((item) => `• ${escapeHtml(item)}`).join("<br>")}
                </div>
                <div>
                  <strong>Plan d’action</strong><br>
                  ${article.planAction.map((item) => `• ${escapeHtml(item)}`).join("<br>")}
                </div>
              </div>

              <div class="actions-row two">
                <button class="btn btn-main" data-action="go-page" data-page="${escapeHtml(article.raccourci.page)}">${escapeHtml(article.raccourci.label)}</button>
                ${article.raccourci.search ? `
                  <button
                    class="btn btn-outline"
                    data-action="open-help-search"
                    data-search="${escapeHtml(article.raccourci.search)}"
                    data-mode="${escapeHtml(article.raccourci.mode || "all")}"
                  >
                    Voir l’exo lié
                  </button>
                ` : ""}
              </div>
            </div>
          </details>
        `).join("")}
      </div>
    </section>
  `;
}

export function renderHelp(node) {
  const groups = HELP_CATEGORIES.map((category) => ({
    ...category,
    articles: HELP_ARTICLES.filter((article) => article.categorie === category.id)
  })).filter((group) => group.articles.length);

  node.innerHTML = `
    <div class="section help-screen">
      <div class="card help-hero">
        <div class="eyebrow">Je sais pas comment</div>
        <h2>Guides pratiques repliables</h2>
        <p class="muted">Chaque titre ouvre maintenant son détail à la demande. La base contient près d’une cinquantaine d’articles répartis par thème pour aller plus vite vers la bonne réponse.</p>

        <div class="selected-exercise-strip">
          ${groups.map((group) => `<span class="pill pill-soft">${escapeHtml(group.titre)} • ${group.articles.length}</span>`).join("")}
        </div>
      </div>

      ${groups.map(renderCategory).join("")}
    </div>
  `;
}
