export const NOUSHI_EXOS = [
  {
    id: "noushi_shoulder_reset",
    nom: "Reset épaules 8 min",
    temps: 8,
    objectif: "posture",
    benefices: "Mobilité scapulaire, ouverture de cage et meilleure qualité de tirage.",
    prep: "Band pull-apart 2x15, wall slide 2x10, Y-T-W 2x8.",
    impactRecuperation: 2,
    stressImpact: -1
  },
  {
    id: "noushi_core_control",
    nom: "Core control 10 min",
    temps: 10,
    objectif: "gainage",
    benefices: "Anti-extension et anti-rotation pour un tronc plus stable en séance.",
    prep: "Dead bug, side plank, bird dog en circuit 3 tours.",
    impactRecuperation: 1,
    stressImpact: -1
  },
  {
    id: "noushi_hips_mobility",
    nom: "Hips mobility 12 min",
    temps: 12,
    objectif: "mobilite",
    benefices: "Amplitude de hanches, squat plus propre et tension psoas réduite.",
    prep: "90/90, hip opener, couch stretch, Cossack léger.",
    impactRecuperation: 2,
    stressImpact: -1
  },
  {
    id: "noushi_grip_posture",
    nom: "Grip & posture 9 min",
    temps: 9,
    objectif: "posture",
    benefices: "Prépare farmer carry, face pull et stabilité du haut du dos.",
    prep: "Dead hang, face pull élastique, suitcase hold et respiration costale.",
    impactRecuperation: 1,
    stressImpact: -1
  }
];

export const NOUSHI_CHALLENGES = [
  {
    id: "noushi_upper_blackout",
    nom: "Upper Blackout",
    zone: "haut",
    place: "mixte",
    temps: 34,
    objectif: "force",
    promesse: "Tractions lourdes, dips lestés, épaules en feu. Rien ici n’est confortable.",
    mantra: "Tu entres pour finir. Tu finis pour débloquer le badge NOUSHI.",
    prep: "Scapula pull 2x8, dips assistés 2x6, wall line hold 2x20s.",
    exerciseIds: ["weighted_dips", "pullup_pronation", "wall_handstand_hold", "pushup_decline"]
  },
  {
    id: "noushi_lower_shutdown",
    nom: "Lower Shutdown",
    zone: "bas",
    place: "mixte",
    temps: 36,
    objectif: "muscle",
    promesse: "Fentes bulgares, hinges et poussées de hanches pour faire douter les jambes.",
    mantra: "Les quadriceps brûlent, les fessiers tremblent, la séance continue.",
    prep: "Pont fessier 2x12, hinge à vide 2x10, split squat iso 2x20s.",
    exerciseIds: ["split_squat", "hip_thrust_barbell", "romanian_deadlift_db", "stiff_leg_deadlift"]
  },
  {
    id: "noushi_total_surrender",
    nom: "Total Surrender",
    zone: "full",
    place: "mixte",
    temps: 48,
    objectif: "force",
    promesse: "Le package total: haut, bas, gainage de fer et densité volontairement hostile.",
    mantra: "Si tu termines tout, le badge NOUSHI s’allume. Sinon l’app avait raison.",
    prep: "3 min mobilité globale, activation scapulaire, hinge léger et gainage respiratoire.",
    exerciseIds: ["pullup_pronation", "weighted_dips", "split_squat", "hip_thrust_barbell", "wall_handstand_hold", "stiff_leg_deadlift"]
  }
];

export const NOUSHI_BEAST_SPOTLIGHTS = [
  {
    exerciseId: "pullup_pronation",
    surnom: "Roi du dos",
    description: "Traction stricte, amplitude complète, zéro élan. Le moindre relâchement se voit.",
    prep: "Dead hang 20s, scap pull 2x6, hollow hold 20s.",
    reps: "4-6",
    restSec: 140,
    warning: "Si le grip lâche avant le dos, repose-toi plus longtemps et serre davantage le tronc."
  },
  {
    exerciseId: "weighted_dips",
    surnom: "Triceps execution",
    description: "Un classique brutal pour le haut du corps quand la stabilité d’épaule est irréprochable.",
    prep: "Push-up scapulaire 2x10, dips assistés 2x6, rotation externe légère.",
    reps: "5-8",
    restSec: 120,
    warning: "Descends seulement dans une amplitude que tu contrôles parfaitement."
  },
  {
    exerciseId: "wall_handstand_hold",
    surnom: "Mur d’acier",
    description: "La ligne doit rester propre sous fatigue. Le mur n’aide que si le gainage tient.",
    prep: "Pike hold 2x20s, shoulder taps légers, respiration costale.",
    reps: "25-35s",
    restSec: 90,
    warning: "Sors de la position dès que la cambrure prend le dessus."
  },
  {
    exerciseId: "split_squat",
    surnom: "Jambe par jambe",
    description: "Chaque côté travaille seul, sans triche et avec une forte tension locale.",
    prep: "Fente arrière 2x8, isométrie basse 20s, cheville active.",
    reps: "8-10 / côté",
    restSec: 100,
    warning: "Garde le tronc gainé et ne rebondis pas en bas."
  },
  {
    exerciseId: "hip_thrust_barbell",
    surnom: "Pont de guerre",
    description: "Charge lourde, verrouillage net et tension maximale sur la phase haute.",
    prep: "Bridge 2x12, hip hinge léger, ouverture de hanches.",
    reps: "6-8",
    restSec: 120,
    warning: "Ne perds pas le bassin en haut. La dernière seconde doit rester propre."
  },
  {
    exerciseId: "stiff_leg_deadlift",
    surnom: "Ischios verdict",
    description: "Un hinge exigeant pour ceux qui savent garder un dos neutre et de vrais ischios actifs.",
    prep: "Good morning à vide 2x10, hinge au mur, respiration abdominale.",
    reps: "6-8",
    restSec: 130,
    warning: "Arrête la descente au moment où le bassin veut compenser."
  }
];
