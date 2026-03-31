export const RUNNER_DASHBOARD = {
  objective: "Semi-marathon dans 6 semaines",
  raceName: "Semi de Paris",
  readiness: 78,
  fatigue: "fatigue sous contrôle",
  weeklyKm: 38,
  weather: {
    temp: "12°C",
    condition: "clair et sec",
    wind: "vent faible",
    bestWindow: "18:30 - 20:00"
  },
  liveRun: {
    title: "Tempo progressif",
    distanceKm: 9.8,
    duration: "47:18",
    pace: "4:49/km",
    heartRate: 154,
    vo2: 52,
    cadence: 178,
    audioCues: [
      "Ralentis de 5 secondes/km sur le prochain kilomètre.",
      "Encore 1 km à allure cible avant le retour au calme.",
      "Cadence propre, garde les épaules relâchées."
    ],
    routePoints: [
      [6, 82], [18, 70], [28, 58], [36, 44], [44, 36], [57, 32], [66, 40], [74, 52], [84, 48], [92, 60], [98, 56]
    ]
  },
  weeklyTrend: [
    { label: "S-5", value: 26 },
    { label: "S-4", value: 31 },
    { label: "S-3", value: 34 },
    { label: "S-2", value: 36 },
    { label: "S-1", value: 38 }
  ],
  paceTrend: [
    { label: "5 km", value: 293 },
    { label: "10 km", value: 301 },
    { label: "Tempo", value: 289 },
    { label: "Long", value: 322 }
  ]
};

export const RUNNER_SESSIONS = [
  {
    id: "runner_fractionne",
    type: "Fractionné",
    duration: "52 min",
    focus: "VO2 max",
    description: "10 x 400 m à allure 5 km, récup 1'15.",
    cues: ["Départ progressif", "Dernières répétitions sous contrôle", "Retour au calme 12 min"],
    audioMode: "Audio guidé agressif"
  },
  {
    id: "runner_endurance",
    type: "Endurance",
    duration: "45 min",
    focus: "Base aérobie",
    description: "Sortie souple en zone 2, respiration nasale la plus stable possible.",
    cues: ["Allure conversationnelle", "Cadence légère", "Aucune dérive cardiaque"],
    audioMode: "Audio flow"
  },
  {
    id: "runner_long_run",
    type: "Sortie longue",
    duration: "1h35",
    focus: "Résistance",
    description: "Bloc continu avec finish 15 min semi pace.",
    cues: ["Hydratation à 45 min", "Dernier tiers contrôlé", "Test nutrition course"],
    audioMode: "Audio course"
  },
  {
    id: "runner_tempo",
    type: "Tempo",
    duration: "58 min",
    focus: "Seuil",
    description: "3 x 10 min allure seuil, récup 3 min.",
    cues: ["Pace stable", "Bassin haut", "Retour au calme long"],
    audioMode: "Audio coaching"
  },
  {
    id: "runner_hills",
    type: "Côtes",
    duration: "48 min",
    focus: "Puissance + économie",
    description: "12 répétitions courtes en côte, travail de genou et poussée.",
    cues: ["Inclinaison légère du buste", "Bras actifs", "Descente technique"],
    audioMode: "Audio puissance"
  }
];

export const RUNNER_STRENGTH_BLOCKS = [
  {
    id: "feet_calves",
    title: "Pied / mollets",
    drills: ["Mollets unilatéraux tempo", "Tibial raises", "Sauts pogos contrôlés"],
    why: "Solidifie l'impact et réduit la casse sur les longues sorties."
  },
  {
    id: "knees",
    title: "Genoux",
    drills: ["Split squat isométrique", "Spanish squat", "Step-down lent"],
    why: "Stabilise le genou et calme les montées de charge trop brutales."
  },
  {
    id: "hips",
    title: "Hanches",
    drills: ["Hip airplane assisté", "Pont fessier lourd", "Monster walks"],
    why: "Améliore la propulsion et évite les fuites de bassin."
  },
  {
    id: "core",
    title: "Gainage",
    drills: ["Dead bug runner", "Side plank reach", "Carry unilatéral"],
    why: "Garde la ligne propre quand la fatigue monte après 45 minutes."
  }
];

export const RUNNER_INJURY_PLAYBOOK = [
  {
    id: "runner_knee",
    symptom: "J'ai mal au genou",
    causes: ["Charge hebdo trop rapide", "Faiblesse fessier moyen", "Descente trop agressive"],
    adaptations: ["Baisse le volume de 25%", "Passe les côtes en technique", "Remplace le tempo par de l'endurance douce"]
  },
  {
    id: "runner_shin",
    symptom: "Tibia qui tire",
    causes: ["Progression trop brutale", "Surface trop dure", "Mollets trop raides"],
    adaptations: ["Réduis les impacts intenses 5 jours", "Ajoute tibial raises", "Raccourcis la foulée"]
  },
  {
    id: "runner_achilles",
    symptom: "Achille sensible",
    causes: ["Pied peu tolérant", "Mollets saturés", "Retour à la vitesse trop tôt"],
    adaptations: ["Évite les sprints", "Travail excentrique mollet", "Réduis le drop de chaussure progressivement"]
  }
];

export const RUNNER_BADGES = [
  { id: "runner_5k", title: "5K unlocked", detail: "Premier 5 km validé sous 30 minutes." },
  { id: "runner_10k", title: "10K engine", detail: "10 km tenus avec pacing propre." },
  { id: "runner_half", title: "Half marathoner", detail: "Objectif semi en ligne de mire." },
  { id: "runner_sprinter", title: "Sprinter", detail: "Séances courtes explosives validées." },
  { id: "runner_endurance", title: "Endurance beast", detail: "Plus de 35 km sur la semaine." }
];

export const RUNNER_STACK_LINKS = [
  {
    label: "Here2Run",
    caption: "tracking GPS temps réel, historique, SQLite local",
    url: "https://github.com/ArtemOrlovUA/Here2Run"
  },
  {
    label: "React Native Maps",
    caption: "tracé, polylines, animations map",
    url: "https://github.com/react-native-maps/react-native-maps"
  },
  {
    label: "PubNub",
    caption: "live tracking multi-coureurs et défis temps réel",
    url: "https://www.pubnub.com/blog/realtime-geo-tracking-app-react-native/"
  },
  {
    label: "Geo Tracking System",
    caption: "backend Node/Mongo pour runs stockés et auth",
    url: "https://github.com/Uyadav207/Geolocation-Tracking-System"
  },
  {
    label: "Route Tracker",
    caption: "route preview et historique type Strava",
    url: "https://github.com/Jon1VK/running-route-tracker"
  }
];
