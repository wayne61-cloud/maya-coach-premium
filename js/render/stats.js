import { getWeightEvolution } from "../recommendations.js";
import { computeDashboardStats } from "../workout.js";
import { escapeHtml } from "../utils.js";

function renderBars(entries) {
  const max = Math.max(1, ...entries.map((entry) => entry.value));
  return entries.map((entry) => `
    <div class="bar-row">
      <div class="bar-label"><span>${escapeHtml(entry.label)}</span><span>${Math.round(entry.value)}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((entry.value / max) * 100)}%"></div></div>
    </div>
  `).join("");
}

export function renderStats(node) {
  const stats = computeDashboardStats();
  const weightEvolution = getWeightEvolution();
  const volume7d = Object.entries(stats.volume7d).sort((left, right) => right[1] - left[1]).map(([label, value]) => ({ label, value }));
  const volume4w = Object.entries(stats.volume4w).sort((left, right) => right[1] - left[1]).map(([label, value]) => ({ label, value }));
  const bestSeries = Object.entries(stats.bestSetByExercise).sort((left, right) => right[1] - left[1]).slice(0, 6).map(([label, value]) => ({ label, value }));
  const monthEntries = Object.entries(stats.monthlyCalories).map(([label, value]) => ({ label, value }));

  node.innerHTML = `
    <div class="section">
      <div class="card module-stats glow-blue">
        <div class="eyebrow">Pôle stats</div>
        <h2>Tableau de progression</h2>
        <div class="stats-grid">
          <div class="stat-box stat-box-blue stat-box-large"><div class="stat-label">Total séances</div><div class="stat-value">${stats.totalSessions}</div></div>
          <div class="stat-box stat-box-blue stat-box-large"><div class="stat-label">Minutes actives</div><div class="stat-value">${Math.round(stats.activeMinutes)}</div></div>
          <div class="stat-box stat-box-green"><div class="stat-label">Training</div><div class="stat-value">${stats.trainingSessions}</div></div>
          <div class="stat-box stat-box-green"><div class="stat-label">Régularité nutrition</div><div class="stat-value">${stats.nutritionRegularity.score}%</div></div>
          <div class="stat-box stat-box-coral"><div class="stat-label">Maison / salle</div><div class="stat-value">${stats.placeSplit.maison}/${stats.placeSplit.salle}</div></div>
          <div class="stat-box stat-box-coral"><div class="stat-label">IA / focus / quick</div><div class="stat-value">${stats.aiVsQuick.ia}/${stats.aiVsQuick.focus}/${stats.aiVsQuick.quick}</div></div>
        </div>
      </div>

      <div class="card module-stats">
        <h3>Évolution corporelle</h3>
        <div class="coach-grid">
          <div><strong>Poids suivi:</strong> ${escapeHtml(weightEvolution.label)}</div>
          <div><strong>Profil actuel:</strong> ${escapeHtml(weightEvolution.currentWeightKg ? `${weightEvolution.currentWeightKg} kg` : "non renseigné")}</div>
        </div>
      </div>

      <div class="card module-stats">
        <h3>Volume par muscle sur 7 jours</h3>
        <div class="bar-chart">${volume7d.length ? renderBars(volume7d) : '<div class="empty">Pas assez de données.</div>'}</div>
      </div>

      <div class="card module-stats">
        <h3>Volume sur 4 semaines</h3>
        <div class="bar-chart">${volume4w.length ? renderBars(volume4w) : '<div class="empty">Pas assez de données.</div>'}</div>
      </div>

      <div class="card module-stats">
        <h3>Meilleures séries par exercice</h3>
        <div class="bar-chart">${bestSeries.length ? renderBars(bestSeries) : '<div class="empty">Pas encore de records.</div>'}</div>
      </div>

      <div class="card module-stats">
        <h3>Séances hebdo sur 6 semaines</h3>
        <div class="bar-chart">${renderBars(stats.weekSeries.map((week) => ({ label: `S ${week.label}`, value: week.count })))}</div>
      </div>

      <div class="card module-stats">
        <h3>Calories estimées par mois</h3>
        <div class="bar-chart">${monthEntries.length ? renderBars(monthEntries) : '<div class="empty">Pas assez de données.</div>'}</div>
      </div>
    </div>
  `;
}
