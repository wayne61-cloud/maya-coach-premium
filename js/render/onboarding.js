import { defaultProfile, state } from "../state.js";
import { escapeHtml } from "../utils.js";

const steps = [
  {
    key: "identity",
    type: "fields",
    title: "Ton profil athlète",
    subtitle: "Nom, âge et poids aident l’IA à mieux doser l’impact, les variantes et la nutrition.",
    fields: [
      ["name", "Prénom / nom", "Maya Athlete", "text"],
      ["age", "Âge", "29", "number"],
      ["weightKg", "Poids (kg)", "74", "number"]
    ]
  },
  {
    key: "goal",
    title: "Ton objectif principal",
    subtitle: "Ça pilote les volumes, le type de séance et les repas suggérés.",
    options: [
      ["muscle", "Prise de muscle", "Plus de volume utile et d'exercices structurants."],
      ["force", "Force", "Repos plus longs, exos forts et progression nerveuse."],
      ["seche", "Sèche", "Conditioning mieux dosé et nutrition plus serrée."]
    ]
  },
  {
    key: "level",
    title: "Ton niveau",
    subtitle: "On règle la difficulté des variantes et la progression du cycle.",
    options: [
      ["1", "Débutant", "Plus de versions faciles et de garde-fous techniques."],
      ["2", "Intermédiaire", "Volume standard et vraies progressions semaine après semaine."],
      ["3", "Avancé", "Variantes plus denses et surcharge mieux exploitée."]
    ]
  },
  {
    key: "frequency",
    title: "Ta fréquence hebdo",
    subtitle: "On s'en sert pour le rythme de cycle et les rappels de progression.",
    options: [
      ["2", "2 séances", "Récupération haute, progression plus conservatrice."],
      ["3", "3 séances", "Cadence idéale pour le cycle premium intégré."],
      ["4", "4+ séances", "Volume plus ambitieux et modules recovery utiles."]
    ]
  },
  {
    key: "place",
    title: "Ton terrain principal",
    subtitle: "L'app préfiltre maison, salle ou mixte dans les plans IA.",
    options: [
      ["maison", "Maison", "Barre, élastique, poids du corps et formats compacts."],
      ["salle", "Salle", "Machines, charges libres et patterns plus complets."],
      ["mixte", "Mixte", "On te laisse naviguer entre les deux."]
    ]
  },
  {
    key: "sessionTime",
    title: "Durée moyenne par séance",
    subtitle: "Ça détermine le nombre de blocs et le niveau de densité.",
    options: [
      ["20", "20 min", "Version ultra efficace."],
      ["35", "35 min", "Le format premium le plus polyvalent."],
      ["45", "45+ min", "Plus de volume, plus de coaching." ]
    ]
  }
];

export function renderOnboarding(node) {
  if (!state.showOnboarding && state.profile) {
    node.classList.remove("active");
    node.innerHTML = "";
    return;
  }

  const step = steps[state.onboardingStep] || steps[0];
  const profileDraft = { ...defaultProfile, ...(state.onboardingDraft || {}) };
  const contentHtml = step.type === "fields"
    ? `
        <div class="choice-grid">
          ${step.fields.map(([key, label, placeholder, type]) => `
            <div class="field-group">
              <label class="field-label" for="onboardingField-${escapeHtml(key)}">${escapeHtml(label)}</label>
              <input
                id="onboardingField-${escapeHtml(key)}"
                data-onboarding-field="${escapeHtml(key)}"
                type="${escapeHtml(type)}"
                inputmode="${type === "number" ? "decimal" : "text"}"
                placeholder="${escapeHtml(placeholder)}"
                value="${escapeHtml(profileDraft[key] || "")}"
              />
            </div>
          `).join("")}
          <div class="muted">Tu pourras ajuster ces infos plus tard depuis l’accueil.</div>
        </div>
      `
    : `
        <div class="choice-grid">
          ${step.options.map(([value, label, desc]) => `
            <button class="choice-card ${(profileDraft[step.key] || defaultProfile[step.key]) === value ? "active" : ""}" data-action="select-onboarding-option" data-key="${step.key}" data-value="${value}">
              <div class="choice-title">${escapeHtml(label)}</div>
              <div class="choice-sub">${escapeHtml(desc)}</div>
            </button>
          `).join("")}
        </div>
      `;

  node.classList.add("active");
  node.innerHTML = `
    <div class="onboarding-card">
      <div class="stepper">${steps.map((_, index) => `<span class="${index <= state.onboardingStep ? "active" : ""}"></span>`).join("")}</div>
      <div>
        <div class="eyebrow">Onboarding premium</div>
        <h2>${escapeHtml(step.title)}</h2>
        <p class="muted">${escapeHtml(step.subtitle)}</p>
      </div>
      ${contentHtml}
      <div class="actions-row two">
        <button class="btn btn-outline" data-action="onboarding-back" ${state.onboardingStep === 0 ? "disabled" : ""}>Retour</button>
        <button class="btn btn-main" data-action="${state.onboardingStep === steps.length - 1 ? "finish-onboarding" : "onboarding-next"}">${state.onboardingStep === steps.length - 1 ? "Terminer" : "Continuer"}</button>
      </div>
    </div>
  `;
}
