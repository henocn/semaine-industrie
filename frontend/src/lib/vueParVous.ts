/* Contenus et calculs de « L'industrie, vue par vous ! » (quiz + explorateur de talents). */

export const VUE_PAR_VOUS_TITLE = "L'industrie, vue par vous !"

export type Letter = 'A' | 'B' | 'C' | 'D'
export const LETTERS: Letter[] = ['A', 'B', 'C', 'D']

/* ---------- Jeu 1 : Curieux de l'industrie ---------- */

export type QuizQuestion = {
  label: string
  options: string[]
  /* Index de la bonne réponse dans options. */
  answer: number
  explanation: string
}

export const QUIZ: QuizQuestion[] = [
  {
    label: 'Pour lancer une activité industrielle, faut-il nécessairement posséder une grande usine ?',
    options: [
      "Oui, dès lors qu'on souhaite commercialiser ses produits.",
      'Non, mais il faut obligatoirement disposer de plusieurs machines.',
      'Non, une petite unité de production peut suffire.',
      'Cela dépend uniquement du nombre de salariés.',
    ],
    answer: 2,
    explanation:
      'Une activité industrielle peut démarrer avec une petite unité de fabrication ou de transformation. Les équipements nécessaires dépendent surtout du produit, du procédé et des exigences applicables.',
  },
  {
    label: "Parmi ces activités, laquelle relève de l'industrie ?",
    options: [
      'Transformer du manioc en farine pour le vendre.',
      'Fabriquer du savon dans un atelier équipé.',
      'Confectionner des vêtements en série.',
      "Toutes ces activités peuvent relever de l'industrie.",
    ],
    answer: 3,
    explanation:
      "L'industrie englobe différents types d'activités de fabrication et de transformation, y compris à petite échelle. Une activité industrielle n'est pas définie uniquement par la taille de ses bâtiments.",
  },
  {
    label: "Dans une entreprise industrielle, qui contribue à la qualité d'un produit ?",
    options: [
      "L'équipe de contrôle, qui vérifie le produit terminé.",
      'Les équipes de production et de contrôle, principalement.',
      'Les équipes intervenant à différentes étapes, des matières premières au produit fini.',
      'La direction, qui fixe les objectifs de qualité.',
    ],
    answer: 2,
    explanation:
      "La qualité ne dépend pas seulement de l'inspection finale. Elle se construit tout au long du processus, grâce à plusieurs fonctions qui doivent travailler ensemble.",
  },
  {
    label: 'Une invention et une innovation, est-ce exactement la même chose ?',
    options: [
      "Oui, lorsqu'elles aboutissent toutes deux à un nouveau produit.",
      "Non, une invention est nécessairement technique, tandis qu'une innovation est commerciale.",
      'Non, une invention apporte une nouveauté ; une innovation suppose notamment sa mise en pratique ou son utilisation.',
      "Oui, à condition que l'idée soit protégée par un brevet.",
    ],
    answer: 2,
    explanation:
      "Une invention peut exister sans être mise en application. Une innovation implique la mise en œuvre d'une nouveauté ou d'une amélioration significative, par exemple dans un produit ou un procédé.",
  },
  {
    label: "Quels profils peuvent exercer un métier dans l'industrie ?",
    options: [
      'Principalement des ingénieurs, techniciens et opérateurs de production.',
      'Des profils techniques et scientifiques, ainsi que des spécialistes de la qualité.',
      'Des profils techniques, créatifs, commerciaux, logistiques et de gestion.',
      'Tous les profils, sans besoin de compétences particulières.',
    ],
    answer: 2,
    explanation:
      "L'industrie réunit de nombreux métiers. Les compétences nécessaires varient selon les postes : production, maintenance, conception, qualité, logistique, commercialisation et gestion.",
  },
]

/* Nombre de bonnes réponses (index choisis, null si sans réponse). */
export function quizScore(choices: (number | null)[]) {
  return QUIZ.reduce((sum, q, i) => sum + (choices[i] === q.answer ? 1 : 0), 0)
}

/* Message selon le score. */
export function quizMessage(score: number) {
  if (score >= 5) return "L'industrie n'a presque plus de secrets pour vous !"
  if (score >= 3) return "Belle culture industrielle : vous êtes sur la bonne voie !"
  return "L'industrie a encore beaucoup à vous faire découvrir !"
}

/* ---------- Jeu 2 : Explorateur de talents ---------- */

export type ProfileCode = 'P1' | 'P2' | 'P3' | 'P4'

export type Profile = {
  code: ProfileCode
  name: string
  orientation: string
  description: string
}

export const PROFILES: Record<ProfileCode, Profile> = {
  P1: {
    code: 'P1',
    name: "Explorateur d'idées",
    orientation: 'Innovation et conception',
    description:
      "Vous aimez imaginer et trouver de nouvelles solutions. L'univers de la conception de produits, la recherche et développement, l'innovation et la création de solutions industrielles pourrait éveiller votre curiosité.",
  },
  P2: {
    code: 'P2',
    name: 'Passionné de fabrication',
    orientation: 'Production, technique et qualité',
    description:
      "Vous aimez comprendre comment les choses sont fabriquées et chercher à les améliorer. Les métiers de la production, de la maintenance industrielle, du contrôle qualité et de l'amélioration des procédés pourraient vous correspondre.",
  },
  P3: {
    code: 'P3',
    name: 'Bâtisseur de projets',
    orientation: 'Entrepreneuriat industriel',
    description:
      "Vous aimez donner vie aux idées et les voir évoluer. L'entrepreneuriat industriel, la création d'entreprise, la gestion de projets et le développement des activités de production pourraient vous correspondre.",
  },
  P4: {
    code: 'P4',
    name: 'Développeur de marchés',
    orientation: 'Commercialisation et développement des débouchés',
    description:
      'Vous aimez comprendre les besoins des consommateurs et faire découvrir des produits. Le marketing industriel, la commercialisation, la distribution, les relations clients et le développement commercial pourraient vous intéresser.',
  },
}

export const TALENT_QUESTIONS: { label: string; options: string[] }[] = [
  {
    label: 'Parmi ces activités, laquelle aimeriez-vous le plus découvrir ?',
    options: [
      'Comprendre comment une entreprise développe son activité et trouve de nouvelles opportunités.',
      "Participer à l'amélioration d'un produit ou d'une méthode de fabrication.",
      "Suivre les étapes qui permettent de faire évoluer une idée vers un projet concret.",
      'Réfléchir à de nouvelles solutions pour répondre à un besoin.',
    ],
  },
  {
    label: "Quand vous découvrez un produit fabriqué au Togo, qu'est-ce qui retient d'abord votre attention ?",
    options: [
      'Les choix qui ont permis de concevoir ce produit.',
      'Les techniques et les étapes nécessaires à sa fabrication.',
      'La manière dont le produit trouve sa place sur le marché.',
      "Le parcours de l'entreprise qui le propose.",
    ],
  },
  {
    label:
      "Vous avez l'occasion de passer une journée dans une entreprise industrielle. Quelle expérience choisissez-vous ?",
    options: [
      'Accompagner une équipe qui réfléchit à une nouvelle gamme de produits.',
      "Participer à une réunion sur les projets et les prochaines étapes de l'entreprise.",
      "Découvrir comment l'entreprise développe ses relations avec ses clients et partenaires.",
      'Observer les opérations de production et les méthodes de travail.',
    ],
  },
  {
    label: 'Parmi ces défis, lequel vous donnerait le plus envie de vous impliquer ?',
    options: [
      'Améliorer un procédé pour gagner en efficacité.',
      'Trouver comment mieux faire connaître un produit auprès de nouveaux publics.',
      "Développer une solution originale à partir d'un besoin identifié.",
      'Faire évoluer une petite activité vers une entreprise plus structurée.',
    ],
  },
  {
    label: "Si vous pouviez bénéficier d'un accompagnement, lequel choisiriez-vous en priorité ?",
    options: [
      "Échanger avec des professionnels sur le développement et la gestion d'une activité.",
      'Découvrir les méthodes utilisées pour concevoir et tester de nouvelles solutions.',
      'Comprendre comment une entreprise identifie ses clients et développe ses débouchés.',
      'Approfondir vos connaissances sur les techniques de fabrication et la qualité.',
    ],
  },
]

/* Grille du cahier des charges : profil rapporté par chaque lettre, question par question. */
export const TALENT_GRID: Record<Letter, ProfileCode>[] = [
  { A: 'P4', B: 'P2', C: 'P3', D: 'P1' },
  { A: 'P1', B: 'P2', C: 'P4', D: 'P3' },
  { A: 'P1', B: 'P3', C: 'P4', D: 'P2' },
  { A: 'P2', B: 'P4', C: 'P1', D: 'P3' },
  { A: 'P3', B: 'P1', C: 'P4', D: 'P2' },
]

export const TALENT_DISCLAIMER =
  "Ce profil reflète vos réponses à ce parcours de découverte. Il ne définit pas vos aptitudes et n'exclut aucune autre voie professionnelle."

/* Profil(s) en tête : un seul, ou ceux à égalité au score maximal. */
export function computeProfiles(answers: (Letter | null)[]) {
  if (answers.length !== TALENT_GRID.length || answers.some((a, i) => !a || !TALENT_GRID[i][a])) {
    throw new Error('Les cinq réponses sont obligatoires.')
  }
  const scores: Record<ProfileCode, number> = { P1: 0, P2: 0, P3: 0, P4: 0 }
  answers.forEach((letter, i) => {
    scores[TALENT_GRID[i][letter as Letter]] += 1
  })
  const max = Math.max(...Object.values(scores))
  const winners = (Object.keys(scores) as ProfileCode[]).filter((code) => scores[code] === max)
  return { tie: winners.length > 1, scores, profiles: winners.map((code) => PROFILES[code]) }
}
