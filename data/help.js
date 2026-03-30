const shortcut = (label, page, extras = {}) => ({ label, page, ...extras });

const article = (
  id,
  categorie,
  titre,
  accroche,
  resume,
  pointsCles,
  planAction,
  raccourci
) => ({
  id,
  categorie,
  titre,
  accroche,
  resume,
  pointsCles,
  planAction,
  raccourci
});

export const HELP_CATEGORIES = [
  { id: "fondations", titre: "Fondations", description: "Objectif, rythme et reprise propre." },
  { id: "maison", titre: "Maison", description: "Progressions utiles sans matériel lourd." },
  { id: "salle", titre: "Salle", description: "Repères simples pour mieux exploiter la salle." },
  { id: "technique", titre: "Technique", description: "Mieux bouger pour mieux progresser." },
  { id: "progression", titre: "Progression", description: "Mesurer, ajuster et relancer la progression." },
  { id: "nutrition", titre: "Nutrition", description: "Manger plus simple, plus cohérent, plus tenable." },
  { id: "recuperation", titre: "Récupération", description: "Sommeil, fatigue, mobilité et gestion de charge." },
  { id: "organisation", titre: "Organisation", description: "Tenir dans le temps malgré les contraintes." }
];

export const HELP_ARTICLES = [
  article(
    "lose-fat",
    "fondations",
    "Comment perdre du gras",
    "Créer un déficit simple sans casser la récupération.",
    "Le plus important n’est pas de tout faire parfaitement mais de rester régulier sur l’assiette, le sommeil et les séances utiles.",
    [
      "Vise 2 à 4 séances utiles par semaine avant d’ajouter du cardio partout.",
      "Garde un apport protéiné élevé pour protéger le muscle.",
      "Cherche la régularité calorique sur 7 jours, pas la perfection sur 1 repas."
    ],
    [
      "Commence par marcher davantage et sécuriser 7 à 9 h de sommeil.",
      "Choisis des repas simples, répétables et riches en protéines.",
      "Utilise Nutrition pour cadrer tes journées et Suivi pour regarder la tendance."
    ],
    shortcut("Ouvrir Nutrition", "nutrition")
  ),
  article(
    "gain-muscle",
    "fondations",
    "Comment prendre du muscle",
    "Un peu plus de calories, beaucoup de régularité et des reps propres.",
    "Le muscle vient surtout d’un volume bien réparti, d’une surcharge progressive et d’un apport énergétique suffisant.",
    [
      "Travaille assez près de l’échec sans transformer chaque série en carnage.",
      "Mange assez de protéines et un léger surplus si ton poids stagne.",
      "Garde les mêmes mouvements assez longtemps pour progresser dessus."
    ],
    [
      "Monte à 3 ou 4 séances structurées par semaine si ton agenda le permet.",
      "Suis les reps et charges sur les mouvements principaux.",
      "Prends une photo de progression toutes les 2 semaines."
    ],
    shortcut("Ouvrir Progression photo", "progress")
  ),
  article(
    "beginner-routine",
    "fondations",
    "Je débute, par quoi commencer",
    "Mieux vaut une structure simple qu’un programme spectaculaire.",
    "Quand on débute, la priorité est d’apprendre les grands mouvements, de tenir le rythme et de récupérer correctement.",
    [
      "Garde peu d’exercices mais répète-les souvent.",
      "Travaille tout le corps plusieurs fois par semaine.",
      "Laisse 1 à 2 reps en réserve sur la majorité des séries."
    ],
    [
      "Construis une séance full body courte dans Créer séance.",
      "Choisis d’abord des patterns push, pull, squat, hinge et core.",
      "Utilise le pôle Exercices pour regarder la technique avant d’augmenter la charge."
    ],
    shortcut("Créer ma séance", "my-session")
  ),
  article(
    "no-time",
    "fondations",
    "Je n’ai que 20 à 25 minutes",
    "Une séance courte fonctionne si tu sais quoi couper.",
    "Le manque de temps impose de garder les blocs qui rapportent le plus et d’éviter les détours inutiles.",
    [
      "Priorise 3 à 4 mouvements utiles au lieu d’un gros catalogue.",
      "Réduis les transitions et prépare le matériel à l’avance.",
      "Garde les exercices techniques quand tu es frais."
    ],
    [
      "Fais une séance rapide ou crée une séance compacte de 4 blocs.",
      "Supprime les doublons de pattern dans la même séance.",
      "Chronomètre tes repos pour garder le temps sous contrôle."
    ],
    shortcut("Ouvrir le Coach", "ia")
  ),
  article(
    "restart-break",
    "fondations",
    "Je reprends après une pause",
    "Revenir un peu en dessous de ton ancien niveau fait gagner du temps.",
    "La reprise se passe mieux quand on accepte une courte phase de recalibrage plutôt que d’essayer de reprendre exactement là où on s’était arrêté.",
    [
      "La technique revient plus vite que les sensations de force.",
      "La fatigue monte vite si tu reprends trop lourd d’un coup.",
      "Une reprise réussie donne envie d’enchaîner les semaines suivantes."
    ],
    [
      "Redémarre à 70 ou 80 % de ton ancien volume.",
      "Choisis des versions plus stables des exercices pendant 1 à 2 semaines.",
      "Note ton ressenti dans le Suivi pour ajuster la charge."
    ],
    shortcut("Voir le Suivi", "history")
  ),
  article(
    "consistency",
    "fondations",
    "Je suis irrégulier",
    "Rendre le système plus simple est souvent plus efficace que chercher plus de motivation.",
    "L’irrégularité vient rarement d’un manque d’informations; elle vient souvent d’une structure trop lourde à tenir.",
    [
      "Un plan réaliste vaut mieux qu’un plan parfait abandonné au bout de 10 jours.",
      "Les routines fixes réduisent la friction mentale.",
      "La preuve visuelle de la progression aide à rester engagé."
    ],
    [
      "Bloque 2 ou 3 créneaux fixes dans la semaine.",
      "Prépare une séance maison et une séance salle pour éviter les excuses logistiques.",
      "Utilise Favoris et Progression pour garder un fil conducteur."
    ],
    shortcut("Ouvrir Profil", "settings")
  ),

  article(
    "pushups",
    "maison",
    "Je n’arrive pas à faire des pompes",
    "Repartir d’une version inclinée et construire la force sans ego.",
    "Les pompes se débloquent plus vite quand on garde une amplitude propre, un gainage fort et une progression de levier réaliste.",
    [
      "Commence sur un support haut puis baisse la hauteur progressivement.",
      "Travaille aussi le gainage et les triceps pour sécuriser la poussée.",
      "Garde 1 à 2 reps en réserve plutôt que d’échouer à chaque série."
    ],
    [
      "Fais 3 séries de pompes inclinées propres 2 à 3 fois par semaine.",
      "Ajoute un bloc de gainage de 20 à 30 secondes.",
      "Teste les pompes classiques quand tu tiens 15 reps inclinées propres."
    ],
    shortcut("Voir l’exo lié", "exos", { search: "Pompes inclinées", mode: "maison" })
  ),
  article(
    "pullups-no-bar",
    "maison",
    "Je veux bosser le dos à la maison sans barre",
    "Le tirage peut progresser sans traction stricte au départ.",
    "Même sans barre fixe, tu peux développer le dos avec des variantes de rowing, d’élastiques et de portés.",
    [
      "Cherche une traction horizontale avant de chercher une traction verticale.",
      "Le contrôle des épaules est prioritaire sur le volume.",
      "Le grip et le gainage comptent beaucoup."
    ],
    [
      "Utilise row inversé, rowing élastique et farmer carry.",
      "Travaille lentement la phase de retour.",
      "Ajoute 1 ou 2 séries de dead hang si tu as un point d’accroche."
    ],
    shortcut("Voir les exos maison", "exos", { search: "row", mode: "maison" })
  ),
  article(
    "legs-home",
    "maison",
    "Comment faire les jambes à la maison",
    "Le travail unilatéral change tout quand la charge manque.",
    "À la maison, les jambes répondent bien aux variantes unilatérales, aux tempos lents et aux isométriques.",
    [
      "Les fentes bulgares valent souvent mieux qu’un squat rapide mal contrôlé.",
      "Le tempo et les pauses augmentent vite la difficulté.",
      "Le bas du corps progresse si tu restes honnête sur l’amplitude."
    ],
    [
      "Base ta séance sur split squat, hip thrust et squat tempo.",
      "Ajoute une pause de 2 secondes en bas sur le premier exercice.",
      "Monte le volume progressivement avant d’ajouter des sauts."
    ],
    shortcut("Voir les exos jambes", "exos", { search: "fentes", mode: "maison" })
  ),
  article(
    "glutes-home",
    "maison",
    "Comment développer les fessiers à la maison",
    "Mélanger poussée de hanche, unilatéral et contrôle de bassin.",
    "Les fessiers réagissent bien même à la maison si tu tiens les positions hautes et si tu choisis des exercices réellement stimulants.",
    [
      "Le verrouillage de hanche compte plus que la vitesse.",
      "Les variantes une jambe augmentent vite l’intensité.",
      "Le suivi photo est utile quand la progression visuelle est lente."
    ],
    [
      "Travaille hip thrust sur banc, split squat et hinge léger.",
      "Tiens 1 à 2 secondes en haut sur chaque rep utile.",
      "Prends une photo toutes les 2 semaines, même angle, même lumière."
    ],
    shortcut("Ouvrir Progression photo", "progress")
  ),
  article(
    "core-home",
    "maison",
    "Comment renforcer les abdos à la maison",
    "Le gainage utile se voit dans la qualité de la séance, pas seulement dans la brûlure.",
    "Les abdos servent à transmettre la force, à stabiliser le bassin et à protéger la colonne pendant les autres mouvements.",
    [
      "Travaille anti-extension, anti-rotation et contrôle respiratoire.",
      "Les holds propres sont souvent plus utiles que des crunchs bâclés.",
      "Le core progresse vite quand il est fréquent mais dosé."
    ],
    [
      "Mixe hollow body hold, planche latérale et dead bug avancé.",
      "Place 2 blocs courts en fin de séance plutôt qu’un seul énorme circuit.",
      "Reste propre et coupe avant de perdre le placement."
    ],
    shortcut("Voir les exos core", "exos", { search: "hollow", mode: "maison" })
  ),
  article(
    "cardio-quiet",
    "maison",
    "Je veux du cardio à la maison sans trop de bruit",
    "Le cardio discret existe, il faut juste accepter moins d’impact.",
    "Tu peux monter le cardio sans sauter partout en jouant sur le tempo, les enchaînements et les temps de travail.",
    [
      "Le bruit n’est pas un indicateur d’efficacité.",
      "Les formats par intervalles marchent bien en appartement.",
      "Le cardio discret fatigue aussi la posture si tu vas trop vite."
    ],
    [
      "Fais des mountain climbers contrôlés, des marches rapides sur place et du gainage dynamique.",
      "Travaille sur 30 à 40 secondes d’effort puis 20 secondes de repos.",
      "Garde 2 ou 3 tours de qualité au lieu de 8 tours brouillons."
    ],
    shortcut("Voir les exos cardio", "exos", { search: "mountain", mode: "maison" })
  ),

  article(
    "start-gym",
    "salle",
    "Je débute en salle",
    "La salle devient simple quand tu sais quoi regarder.",
    "Tu n’as pas besoin de tout comprendre le premier jour; tu as surtout besoin d’un ordre clair et de quelques repères sûrs.",
    [
      "Repère les zones push, pull, jambes et haltères.",
      "Les machines peuvent être très utiles au début.",
      "Une séance courte et préparée enlève beaucoup de stress."
    ],
    [
      "Prépare une séance de 4 blocs avant d’arriver.",
      "Commence avec une charge facile pour apprendre les réglages.",
      "Note immédiatement les machines que tu as appréciées."
    ],
    shortcut("Créer ma séance", "my-session")
  ),
  article(
    "first-pull-day",
    "salle",
    "Je veux construire un premier dos propre en salle",
    "Un bon pull day repose sur peu de mouvements, bien exécutés.",
    "Pour le dos, mieux vaut une sélection courte de tirages bien maîtrisés qu’un long menu de variations faites trop vite.",
    [
      "Cherche d’abord la trajectoire et la stabilité des épaules.",
      "Le dos répond bien quand tu alternes vertical et horizontal.",
      "Le grip peut devenir le facteur limitant avant le dos."
    ],
    [
      "Choisis tirage vertical, rowing un bras et chest-supported row.",
      "Commence par la machine ou l’haltère la plus stable.",
      "Garde le torse immobile et ralentis le retour."
    ],
    shortcut("Voir les exos salle", "exos", { search: "tirage", mode: "salle" })
  ),
  article(
    "machines-vs-freeweights",
    "salle",
    "Machines ou poids libres, quoi choisir",
    "Le bon outil est celui qui te fait progresser proprement aujourd’hui.",
    "Les machines sont excellentes pour apprendre, stabiliser et accumuler du volume; les poids libres demandent souvent plus de coordination.",
    [
      "Tu peux progresser très loin avec des machines.",
      "Les poids libres ne sont pas automatiquement supérieurs.",
      "Le contexte compte: fatigue, technique, objectif et confiance."
    ],
    [
      "Utilise les machines pour apprendre les trajectoires et charger proprement.",
      "Garde les poids libres sur quelques mouvements prioritaires.",
      "Compare surtout la qualité de tes reps et la régularité de ta progression."
    ],
    shortcut("Ouvrir Exercices", "exos", { mode: "salle" })
  ),
  article(
    "glutes-gym",
    "salle",
    "Comment développer les fessiers en salle",
    "La salle permet enfin de charger lourd et régulièrement.",
    "Les fessiers répondent très bien à un mix de hip thrust, presse unilatérale, split squat guidé et hinges contrôlés.",
    [
      "Le verrouillage et l’amplitude font la différence.",
      "Un gros exercice ne suffit pas à lui seul.",
      "Le volume doit rester récupérable sur la semaine."
    ],
    [
      "Base la séance sur hip thrust barre, split squat guidé et hinge.",
      "Suis la charge, les reps et le tempo sur le mouvement principal.",
      "Ajoute une seconde séance plus légère plus tard dans la semaine."
    ],
    shortcut("Voir les exos fessiers", "exos", { search: "hip thrust", mode: "salle" })
  ),
  article(
    "back-gym",
    "salle",
    "Je ne sens pas mon dos en salle",
    "Le problème vient souvent du placement, pas du manque d’exercices.",
    "Quand le dos ne travaille pas comme prévu, il faut souvent mieux caler le buste, ralentir le retour et réduire la charge.",
    [
      "Si les bras fatiguent avant le dos, la charge est souvent trop haute.",
      "Le retour contrôlé vaut autant que le tirage.",
      "La stabilité du buste conditionne la qualité du tirage."
    ],
    [
      "Réduis la charge de 10 à 20 % pendant quelques séances.",
      "Garde 1 seconde de pause en contraction sur les rows.",
      "Teste chest-supported row si tu compenses beaucoup."
    ],
    shortcut("Voir les rows", "exos", { search: "row", mode: "salle" })
  ),
  article(
    "fear-gym",
    "salle",
    "La salle m’intimide",
    "Plus tu réduis les décisions à prendre sur place, plus le stress baisse.",
    "Le stress de la salle vient souvent d’un manque de scénario clair, pas d’un manque de capacité physique.",
    [
      "Prévoir l’ordre des exercices calme beaucoup.",
      "Personne ne suit ta séance autant que tu l’imagines.",
      "La répétition crée très vite des repères familiers."
    ],
    [
      "Répète 2 ou 3 séances fixes pendant plusieurs semaines.",
      "Arrive avec ton échauffement déjà décidé.",
      "Commence aux heures calmes si possible."
    ],
    shortcut("Créer ma séance", "my-session")
  ),

  article(
    "squat-better",
    "technique",
    "Comment mieux squatter",
    "Mieux vaut un squat propre et un peu moins chargé qu’un squat flou.",
    "Le squat devient plus stable quand le pied reste actif, le tronc gainé et l’amplitude cohérente avec ta mobilité réelle.",
    [
      "Pense pression au sol et genoux qui suivent la ligne du pied.",
      "Cherche la même vitesse sur toute la rep quand c’est possible.",
      "Le gainage prépare la descente."
    ],
    [
      "Filme 2 ou 3 reps de profil et de face.",
      "Baisse la charge si tu perds la trajectoire.",
      "Travaille une pause courte en bas pour sentir le placement."
    ],
    shortcut("Voir les squats", "exos", { search: "squat" })
  ),
  article(
    "hinge-better",
    "technique",
    "Je ne comprends pas le hip hinge",
    "Le hinge est un recul de hanches, pas une flexion molle du dos.",
    "Quand le hinge n’est pas clair, le dos prend tout et les ischios ne font pas le travail attendu.",
    [
      "Le bassin recule avant que la charge descende.",
      "Le tronc reste rigide pendant la rep.",
      "L’amplitude s’arrête quand le bassin veut compenser."
    ],
    [
      "Travaille d’abord au mur ou avec une charge légère.",
      "Garde les tibias presque verticaux sur les hinges classiques.",
      "Ajoute ensuite le roumain haltères ou jambes tendues."
    ],
    shortcut("Voir les hinges", "exos", { search: "soulevé", mode: "salle" })
  ),
  article(
    "dips-shoulder",
    "technique",
    "Les dips me gênent les épaules",
    "Une amplitude trop ambitieuse casse vite la qualité.",
    "Les dips demandent de la stabilité d’épaule, une cage bien tenue et une amplitude que tu contrôles vraiment.",
    [
      "La descente s’arrête avant la perte de contrôle.",
      "Les épaules ne doivent pas s’écraser vers l’avant.",
      "Une version assistée vaut mieux qu’une rep forcée."
    ],
    [
      "Réduis l’amplitude pendant 2 semaines.",
      "Renforce la poussée avec pompes et dips chaise contrôlés.",
      "Reviens aux dips plus profonds seulement si la trajectoire reste propre."
    ],
    shortcut("Voir les dips", "exos", { search: "dips" })
  ),
  article(
    "pullup-clean",
    "technique",
    "Comment rendre mes tractions plus propres",
    "Amplitude, gainage et départ d’épaules avant tout.",
    "Les tractions montent mieux quand la scapula s’organise, que le corps reste gainé et que l’élan ne fait pas le travail.",
    [
      "Commence par une suspension active, pas par un tirage brouillon.",
      "Le tronc reste solide pendant toute la rep.",
      "La descente lente construit beaucoup."
    ],
    [
      "Travaille des séries plus courtes mais plus nettes.",
      "Ajoute des scap pulls et des négatives contrôlées.",
      "Coupe la série dès que le menton passe à peine par triche."
    ],
    shortcut("Voir les tractions", "exos", { search: "tractions", mode: "salle" })
  ),
  article(
    "handstand-wall",
    "technique",
    "Comment progresser sur l’appui tendu renversé au mur",
    "La ligne vaut plus que la durée brute.",
    "L’exercice progresse quand tu tiens un alignement propre, une respiration calme et un volume modéré mais fréquent.",
    [
      "La cage ne doit pas sortir vers l’avant.",
      "Les mains poussent le sol pendant tout le hold.",
      "Quelques secondes très propres valent mieux qu’un hold cassé."
    ],
    [
      "Commence par des holds courts et répétés.",
      "Travaille la ligne contre le mur avant les variations plus libres.",
      "Sors de la position dès que tu arches franchement."
    ],
    shortcut("Voir l’exo lié", "exos", { search: "Appui tendu renversé", mode: "maison" })
  ),
  article(
    "bracing-breathe",
    "technique",
    "Comment mieux respirer et me gainer",
    "Le gainage n’est pas juste serrer les abdos au hasard.",
    "Un bon gainage crée de la pression autour du tronc, stabilise la cage et t’aide à transférer la force vers la charge.",
    [
      "Inspire sans monter excessivement les épaules.",
      "Verrouille le tronc avant la phase difficile.",
      "Relâche seulement quand la rep est finie."
    ],
    [
      "Entraîne la respiration costale sur des charges légères.",
      "Utilise une expiration contrôlée sur les mouvements plus longs.",
      "Garde le même rituel de placement avant chaque série."
    ],
    shortcut("Ouvrir Coach", "ia")
  ),
  article(
    "mind-muscle",
    "technique",
    "Je ne sens pas le bon muscle travailler",
    "La sensation suit souvent la qualité du placement et du tempo.",
    "Si tu ne sens pas le muscle visé, il faut souvent ralentir, stabiliser et choisir une variante plus claire plutôt que charger davantage.",
    [
      "La sensation n’est pas tout, mais elle peut guider l’apprentissage.",
      "Le tempo lent améliore souvent le recrutement perçu.",
      "Le bon outil simplifie parfois plus qu’un long coaching."
    ],
    [
      "Réduis la charge et ralentis la phase excentrique.",
      "Teste une variante plus stable du même pattern.",
      "Garde une courte pause dans la position forte."
    ],
    shortcut("Voir les exos", "exos")
  ),

  article(
    "add-load",
    "progression",
    "Quand augmenter la charge",
    "Charge, reps et qualité doivent monter ensemble.",
    "Tu peux augmenter la charge quand la technique reste propre sur le haut de ta fourchette de reps et que la récupération suit.",
    [
      "La meilleure progression est souvent petite mais continue.",
      "Monter trop tôt casse la technique et la confiance.",
      "Le rep range donne un cadre simple."
    ],
    [
      "Garde une fourchette de reps cible sur tes mouvements principaux.",
      "Monte légèrement la charge quand tu atteins le haut de la fourchette sur toutes les séries propres.",
      "Si la qualité chute, garde la même charge une semaine de plus."
    ],
    shortcut("Voir le Suivi", "history")
  ),
  article(
    "plateau",
    "progression",
    "Je stagne",
    "Un plateau n’est pas toujours un manque d’effort.",
    "La stagnation peut venir d’un volume mal réparti, d’un sommeil instable, d’une surcharge trop rapide ou d’un manque de suivi objectif.",
    [
      "Changer tout en même temps masque la vraie cause.",
      "Le sommeil et le stress peuvent bloquer autant que l’entraînement.",
      "La progression repart souvent avec un ajustement simple."
    ],
    [
      "Choisis une seule variable à modifier: charge, reps ou volume.",
      "Regarde tes dernières semaines dans le Suivi.",
      "Teste une semaine plus légère avant de tout réécrire."
    ],
    shortcut("Voir le Suivi", "history")
  ),
  article(
    "photo-progress",
    "progression",
    "Comment utiliser les photos de progression",
    "Le protocole de prise de vue compte plus que la pose.",
    "Les photos sont utiles si elles sont répétables: même lumière, même angle, même distance et même moment de la journée.",
    [
      "La cohérence visuelle vaut plus que la fréquence excessive.",
      "Le poids seul ne montre pas tout.",
      "Le progrès se lit mieux sur plusieurs semaines que sur 3 jours."
    ],
    [
      "Choisis 1 ou 2 zones fixes à photographier.",
      "Prends les photos toutes les 2 semaines.",
      "Note le contexte si une photo semble très différente."
    ],
    shortcut("Ouvrir Progression photo", "progress")
  ),
  article(
    "track-reps",
    "progression",
    "Pourquoi suivre mes reps et séries",
    "Ce que tu ne suis pas finit souvent par stagner en silence.",
    "Noter les reps et séries t’aide à voir si tu progresses vraiment ou si tu répètes juste la même séance sans levier.",
    [
      "La mémoire déforme vite les performances réelles.",
      "Un mini historique guide mieux les décisions.",
      "Suivre peu de variables suffit souvent."
    ],
    [
      "Note au minimum charge, reps et ressenti.",
      "Compare seulement avec des séances comparables.",
      "Utilise l’historique pour adapter la semaine suivante."
    ],
    shortcut("Ouvrir le Suivi", "history")
  ),
  article(
    "deload",
    "progression",
    "Quand faire une semaine plus légère",
    "Le deload sert à relancer la qualité, pas à tout arrêter.",
    "Une semaine plus légère peut remettre de l’énergie, redonner des sensations propres et calmer les petites douleurs de surcharge.",
    [
      "Le deload est un outil, pas un aveu d’échec.",
      "Le volume baisse souvent plus que l’intensité.",
      "La reprise après deload est souvent meilleure."
    ],
    [
      "Réduis le volume d’environ 30 à 40 % pendant quelques jours.",
      "Garde les mêmes mouvements mais avec plus de marge.",
      "Reviens progressivement sur la charge normale la semaine suivante."
    ],
    shortcut("Ouvrir Recovery", "relax")
  ),
  article(
    "imbalance-left-right",
    "progression",
    "J’ai un côté plus fort que l’autre",
    "Les asymétries se gèrent mieux avec du calme qu’avec des charges héroïques.",
    "Un côté plus faible n’est pas rare; l’objectif est surtout de réduire l’écart sans dérégler tout le reste.",
    [
      "Les unilatéraux rendent l’écart visible rapidement.",
      "Commencer par le côté faible aide à mieux doser.",
      "La technique doit rester identique des deux côtés."
    ],
    [
      "Ajoute 1 ou 2 exercices unilatéraux dans la semaine.",
      "Commence toujours par le côté faible.",
      "Évite d’ajouter beaucoup de volume correctif d’un coup."
    ],
    shortcut("Créer ma séance", "my-session")
  ),

  article(
    "protein-target",
    "nutrition",
    "Combien de protéines viser",
    "Un repère simple aide plus qu’un calcul anxieux.",
    "Pour la majorité des pratiquants, viser une dose protéinée régulière sur la journée est plus utile que chercher la précision parfaite.",
    [
      "La répartition sur 3 ou 4 prises aide souvent.",
      "Les protéines soutiennent la récupération et la satiété.",
      "Le contexte compte: objectif, poids, fréquence d’entraînement."
    ],
    [
      "Commence par mettre une vraie source protéinée à chaque repas.",
      "Vérifie si le petit-déjeuner et la collation sont trop faibles.",
      "Ajuste ensuite avec le pôle Nutrition."
    ],
    shortcut("Ouvrir Nutrition", "nutrition")
  ),
  article(
    "build-plate",
    "nutrition",
    "Comment composer une assiette simple",
    "Une structure visuelle claire évite beaucoup d’hésitations.",
    "Une assiette simple, répétable et rassasiante t’aide à tenir sans avoir besoin de recalculer tout le temps.",
    [
      "Une base protéinée stabilise le repas.",
      "Les légumes et féculents se dosent selon la dépense du moment.",
      "Les repas répétables font gagner de l’énergie mentale."
    ],
    [
      "Commence par la protéine, puis ajoute le féculent utile, puis le végétal.",
      "Garde 2 ou 3 repas de secours toujours disponibles.",
      "Utilise les recettes rapides quand la journée déborde."
    ],
    shortcut("Voir les recettes", "nutrition")
  ),
  article(
    "preworkout-meal",
    "nutrition",
    "Que manger avant la séance",
    "Le bon pré-workout dépend surtout du délai avant l’entraînement.",
    "Avant la séance, le plus important est d’arriver ni lourd ni à vide avec quelque chose que tu digères bien.",
    [
      "Plus la séance est proche, plus le repas doit rester simple.",
      "Évite les aliments que tu digères mal les jours d’entraînement.",
      "L’hydratation compte aussi."
    ],
    [
      "Si tu manges 2 à 3 h avant, fais un vrai repas simple.",
      "Si tu manges 30 à 60 min avant, reste sur une collation digeste.",
      "Teste et garde ce qui te réussit le mieux."
    ],
    shortcut("Ouvrir Nutrition", "nutrition")
  ),
  article(
    "postworkout",
    "nutrition",
    "Que manger après la séance",
    "Pas besoin d’un rituel compliqué, mais un vrai repas aide.",
    "Après l’entraînement, un apport en protéines, en glucides utiles et en hydratation accélère souvent la récupération perçue.",
    [
      "Le repas post-workout n’a pas besoin d’être parfait pour être utile.",
      "Le contexte de la journée compte plus qu’un shake isolé.",
      "Le sommeil reste un énorme levier ensuite."
    ],
    [
      "Mange dans les heures qui suivent avec une vraie portion de protéines.",
      "Ajoute des glucides si la séance était dense ou si une autre arrive vite.",
      "Hydrate-toi avant de compenser avec du sucre au hasard."
    ],
    shortcut("Voir les recettes", "nutrition")
  ),
  article(
    "cravings-evening",
    "nutrition",
    "Je craque le soir",
    "La faim du soir se prépare souvent bien avant 21 h.",
    "Les craquages du soir viennent souvent d’une journée trop légère, trop chaotique ou trop stricte plutôt que d’un manque de volonté pur.",
    [
      "Un déjeuner trop faible se paie souvent le soir.",
      "La fatigue augmente l’impulsivité alimentaire.",
      "Interdire totalement certains aliments peut aggraver le rebond."
    ],
    [
      "Renforce les protéines et fibres plus tôt dans la journée.",
      "Prévois une collation maîtrisée si tu sais que le soir est un point faible.",
      "Évite d’attendre d’être affamé pour improviser."
    ],
    shortcut("Ouvrir Nutrition", "nutrition")
  ),
  article(
    "vegan-protein",
    "nutrition",
    "Comment gérer mes protéines si je mange végétal",
    "Le végétal demande surtout plus d’organisation, pas moins de résultats.",
    "Une alimentation végétale peut très bien soutenir l’entraînement si les apports sont répartis et les sources variées.",
    [
      "La diversité des sources aide à couvrir les besoins.",
      "Certaines journées végétales demandent plus d’anticipation.",
      "Les repas trop pauvres en protéines sont faciles à sous-estimer."
    ],
    [
      "Planifie 3 ou 4 apports protéinés identifiés dans la journée.",
      "Ajoute tofu, tempeh, légumineuses, skyr végétal ou poudre selon ton contexte.",
      "Vérifie la satiété et la récupération sur 2 semaines."
    ],
    shortcut("Ouvrir Profil", "settings")
  ),
  article(
    "weekend-control",
    "nutrition",
    "Je perds tout le week-end",
    "Le week-end demande des garde-fous, pas une cage.",
    "Le problème n’est pas d’avoir des repas plus libres, mais de perdre totalement la structure pendant deux jours entiers.",
    [
      "Un ou deux repas plus libres ne ruinent pas une semaine.",
      "La privation excessive avant le week-end aggrave souvent le rebond.",
      "Le mouvement et l’hydratation aident à garder le cap."
    ],
    [
      "Garde au moins un vrai repas structuré chaque jour du week-end.",
      "Prévois à l’avance les moments plus libres.",
      "Reprends le cadre normal dès le repas suivant au lieu d’attendre lundi."
    ],
    shortcut("Ouvrir Nutrition", "nutrition")
  ),

  article(
    "exhausted-after-workout",
    "recuperation",
    "Je suis épuisé après mes séances",
    "La réponse n’est pas toujours d’en faire plus, mais d’ajuster densité, repos et récupération.",
    "Quand une séance devient trop dense, il faut souvent augmenter le repos, réduire un bloc ou déplacer la charge sur la semaine.",
    [
      "Allonger le repos améliore parfois beaucoup la séance suivante.",
      "Le manque de sommeil amplifie la sensation de mur.",
      "Plus n’est pas toujours mieux si la récupération ne suit pas."
    ],
    [
      "Passe sur un format plus court pendant quelques jours.",
      "Rééquilibre le nombre d’exercices dans Ma séance.",
      "Réserve NOUSHI aux semaines où la récupération est bonne."
    ],
    shortcut("Construire Ma séance", "my-session")
  ),
  article(
    "soreness",
    "recuperation",
    "J’ai des grosses courbatures",
    "Les courbatures ne sont pas un indicateur fiable de qualité d’une séance.",
    "Les courbatures baissent quand le corps s’habitue, quand le volume est mieux dosé et quand les retours au calme sont plus cohérents.",
    [
      "Le nouveau mouvement donne souvent plus de courbatures.",
      "La récupération active aide souvent plus que l’immobilité totale.",
      "La violence des courbatures ne garantit pas le progrès."
    ],
    [
      "Marche, mobilise doucement et hydrate-toi.",
      "Réduis un peu le volume si les courbatures te bloquent plusieurs jours.",
      "Reviens progressivement sur la dose normale."
    ],
    shortcut("Ouvrir Recovery", "relax")
  ),
  article(
    "sleep-better",
    "recuperation",
    "Comment mieux dormir pour progresser",
    "Le sommeil est souvent le meilleur booster de progression gratuit.",
    "Quand le sommeil est instable, la récupération, l’humeur, la force et même la gestion alimentaire deviennent plus fragiles.",
    [
      "Les horaires réguliers aident beaucoup.",
      "La lumière et l’écran tardif pèsent plus qu’on le croit.",
      "Une séance très tardive peut perturber certains profils."
    ],
    [
      "Stabilise ton heure de coucher sur plusieurs jours.",
      "Réduis les écrans forts et les grosses stimulations en fin de soirée.",
      "Observe si les séances tardives nuisent à ton endormissement."
    ],
    shortcut("Ouvrir Profil", "settings")
  ),
  article(
    "rest-day",
    "recuperation",
    "Que faire les jours de repos",
    "Un jour de repos utile n’est ni une punition ni un abandon.",
    "Le repos sert à absorber l’entraînement précédent et à préparer le suivant, pas à disparaître complètement de tes habitudes.",
    [
      "Bouger légèrement aide souvent à mieux récupérer.",
      "Le repos complet peut être utile après une grosse semaine.",
      "Le but est d’arriver plus frais à la séance suivante."
    ],
    [
      "Marche, fais un peu de mobilité ou un protocole Recovery.",
      "Évite d’ajouter du volume caché sans t’en rendre compte.",
      "Garde une alimentation cohérente même sans entraînement."
    ],
    shortcut("Ouvrir Recovery", "relax")
  ),
  article(
    "stress-training",
    "recuperation",
    "Je suis stressé, dois-je quand même m’entraîner",
    "Le stress change la dose utile du jour.",
    "Quand la charge mentale monte, il faut parfois garder l’habitude d’entraînement mais réduire l’ambition de la séance.",
    [
      "L’objectif du jour peut être de préserver le rythme, pas de battre un record.",
      "Une séance courte et propre peut aider à te remettre en route.",
      "Le stress chronique demande des ajustements réels."
    ],
    [
      "Choisis une version courte ou plus stable de ta séance.",
      "Supprime les blocs les plus taxants si besoin.",
      "Si le stress dure, revois la semaine complète plutôt qu’un seul jour."
    ],
    shortcut("Ouvrir le Coach", "ia")
  ),
  article(
    "mobility-stiffness",
    "recuperation",
    "Je suis raide partout",
    "La mobilité progresse mieux en petites doses répétées qu’en grande séance rare.",
    "La raideur chronique vient souvent d’un mélange de manque de mouvement, de fatigue, de stress et de positions répétées.",
    [
      "La mobilité utile se colle bien à l’échauffement.",
      "Le contrôle actif vaut mieux qu’un étirement subi trop agressif.",
      "Quelques minutes régulières changent plus qu’une grosse session occasionnelle."
    ],
    [
      "Choisis 2 ou 3 zones à travailler pendant 5 minutes.",
      "Ajoute la mobilité avant les mouvements concernés.",
      "Reste progressif sur l’amplitude et la respiration."
    ],
    shortcut("Ouvrir Recovery", "relax")
  ),

  article(
    "weekly-planning",
    "organisation",
    "Comment planifier ma semaine",
    "Une semaine lisible réduit beaucoup les séances ratées.",
    "La planification sert à répartir les contraintes, pas à te piéger dans un planning impossible à vivre.",
    [
      "Place les séances clés aux moments les plus réalistes.",
      "Prévoyez une alternative maison si la logistique saute.",
      "La récupération fait partie du plan."
    ],
    [
      "Bloque les séances fortes en priorité.",
      "Prévois une séance maison courte de secours.",
      "Revois le plan chaque fin de semaine à partir du Suivi."
    ],
    shortcut("Créer ma séance", "my-session")
  ),
  article(
    "travel-workouts",
    "organisation",
    "Je voyage souvent, comment rester régulier",
    "Le voyage demande des options prêtes à l’emploi.",
    "Quand les semaines bougent beaucoup, tu tiens mieux si tu as déjà une séance courte maison et une version salle très simple.",
    [
      "La continuité compte plus que la perfection pendant le déplacement.",
      "Le mode maison évite de dépendre d’un équipement inconnu.",
      "La fatigue du voyage doit être prise en compte."
    ],
    [
      "Garde une séance maison sauvegardée en favori.",
      "Prévois un format 20 minutes avec peu de décisions.",
      "Utilise la salle seulement si elle simplifie vraiment la semaine."
    ],
    shortcut("Créer ma séance", "my-session")
  ),
  article(
    "when-sick",
    "organisation",
    "Je suis malade, comment décider",
    "Il faut protéger la reprise plutôt que forcer le jour de trop.",
    "Quand tu es malade, la bonne décision dépend du type de symptômes, de l’énergie réelle et de la reprise prévue derrière.",
    [
      "Fièvre, grosse fatigue et gêne respiratoire sont des signaux d’arrêt.",
      "Une mauvaise reprise peut coûter plusieurs jours.",
      "La récupération reste du progrès quand elle évite la rechute."
    ],
    [
      "Coupe franchement si l’état général est mauvais.",
      "Reprends par une séance légère ou un protocole Recovery.",
      "Attends de retrouver de vraies sensations avant NOUSHI ou les blocs lourds."
    ],
    shortcut("Ouvrir Recovery", "relax")
  ),
  article(
    "motivation-down",
    "organisation",
    "Je n’ai plus envie",
    "L’envie revient souvent quand la friction baisse.",
    "Quand la motivation descend, il faut souvent réduire la charge mentale, simplifier l’entrée dans la séance et retrouver une forme de réussite rapide.",
    [
      "Le manque d’envie n’est pas toujours un manque de discipline.",
      "Une séance raccourcie peut remettre la machine en route.",
      "Voir des progrès concrets aide à relancer l’élan."
    ],
    [
      "Autorise-toi une séance plus courte au lieu de sauter complètement.",
      "Relance un exercice que tu maîtrises bien.",
      "Regarde ton historique ou tes photos de progression pour te reconnecter au process."
    ],
    shortcut("Voir le Suivi", "history")
  ),
  article(
    "schedule-overloaded",
    "organisation",
    "Mon emploi du temps explose",
    "Quand tout se charge, il faut protéger l’essentiel.",
    "Les périodes chargées demandent une hiérarchie claire: une ou deux séances importantes, le sommeil, et une alimentation pas complètement improvisée.",
    [
      "Le mode survie intelligent vaut mieux que l’arrêt total.",
      "La fatigue décisionnelle fait perdre beaucoup de séances.",
      "Le plan minimal doit déjà exister avant la crise."
    ],
    [
      "Passe en priorité sur 2 séances majeures par semaine.",
      "Prépare un repas ou une collation de secours.",
      "Réduis le nombre d’exercices au lieu de vouloir tout maintenir."
    ],
    shortcut("Ouvrir le Coach", "ia")
  ),
  article(
    "keep-favorites",
    "organisation",
    "Comment garder mes meilleurs repères dans l’app",
    "Plus tu rends tes repères visibles, moins tu repars de zéro.",
    "Les favoris, la bibliothèque de séances et les articles d’aide servent à construire ton propre système dans l’app.",
    [
      "Garde quelques exercices et séances vraiment utiles.",
      "Évite de sauver tout et n’importe quoi.",
      "Tes repères doivent accélérer la décision, pas l’alourdir."
    ],
    [
      "Ajoute en favoris les exos et recettes que tu répètes vraiment.",
      "Crée une séance maison et une séance salle prêtes à lancer.",
      "Utilise l’aide comme base de réponses rapides quand tu bloques."
    ],
    shortcut("Ouvrir Favoris", "favoris")
  )
];
