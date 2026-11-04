export type Day = {
  n: number; name: string; theme: string; goal: string; where: string
  slots: [string, string][]; phare?: boolean
}

/* Programme officiel MDPISE, novembre 2026. */
export const DAYS: Day[] = [
  {
    n: 16, name: 'Lundi', theme: 'Ouverture',
    goal: 'Le Ministre ouvre la semaine, présente le bilan, puis visite les entreprises de la PIA.',
    where: 'Palais des Congrès ; Plateforme industrielle d’Adétikopé (PIA) l’après-midi',
    slots: [
      ['9h00', 'Accueil des invités et de la presse'],
      ['9h30', 'Cérémonie d’ouverture : mot de bienvenue, message du bureau de l’ONUDI, mot de la CCIT, discours du Ministre, présentation du symbole et du label'],
      ['9h50', 'Film de 3 minutes : « 2020-2025, ce que l’industrie togolaise a construit », et la vision 2026-2031'],
      ['10h00-11h00', 'Panel sur le thème national : « Accélérer l’industrialisation togolaise : transformation productive, innovation et compétitivité »'],
      ['11h10', 'Remise des premiers labels aux entreprises et aux écoles ; interviews et prises de vue'],
      ['15h00-16h30', 'Visite des entreprises de la PIA, avec le Ministre et les autorités'],
    ],
  },
  {
    n: 17, name: 'Mardi', theme: 'Jeunes, métiers et qualité',
    goal: 'Les usines ouvrent leurs portes, puis les jeunes découvrent les métiers.',
    where: 'Usines le matin ; Palais des Congrès',
    slots: [
      ['8h30-12h00', 'Visites d’usines, ouvertes à tous : deux créneaux de 90 minutes, à 8h30 et à 10h30 ; les groupes scolaires de 20 à 30 élèves sont encadrés par leurs enseignants ; à chaque visite, un salarié explique une machine et son métier'],
      ['9h00-12h00', 'En parallèle, HAUQE : lancement des Journées nationales de la qualité et célébration de la Journée mondiale de la qualité'],
      ['14h00-16h00', 'Forum d’orientation des métiers : écoles et entreprises présentent les métiers de l’industrie, les formations qui y mènent et les opportunités ; questions de la salle'],
      ['16h00-16h45', '« Ils ont commencé petit » : trois industriels, dont au moins une femme, racontent leur première machine, leur premier client et leurs erreurs ; questionnaire'],
    ],
  },
  {
    n: 18, name: 'Mercredi', theme: 'Innovation et mise à niveau',
    goal: 'La journée de l’INPIT et du BRMN : montrer ce que les Togolais inventent, le protéger, et faire grandir les entreprises.',
    where: 'Palais des Congrès, une salle toute la journée',
    slots: [
      ['9h00', 'Accueil des participants'],
      ['9h30-12h30', 'INPIT, avec les pôles d’innovation et les incubateurs : atelier « De la recherche à l’innovation ; protéger et valoriser les inventions et les modèles d’utilité », et vitrine des innovateurs togolais'],
      ['12h30-14h00', 'Pause'],
      ['14h00-17h00', 'BRMN : Journée de la mise à niveau'],
    ],
  },
  {
    n: 19, name: 'Jeudi', theme: 'Femmes dans l’industrie',
    goal: 'Montrer que l’industrie togolaise est aussi faite par des femmes, puis aller les voir au travail.',
    where: 'Palais des Congrès, puis visite d’entreprises',
    slots: [
      ['9h00', 'Accueil des invités'],
      ['9h30-9h40', 'Projection de portraits filmés de femmes de l’industrie'],
      ['9h40-10h50', 'Panel « Les métiers de l’industrie au féminin » : des industrielles togolaises et une jeune femme qui démarre son activité industrielle'],
      ['11h00', 'Visite d’entreprises, ouverte à tous'],
    ],
  },
  {
    n: 20, name: 'Vendredi', theme: 'Journée de l’industrialisation de l’Afrique', phare: true,
    goal: 'Une table ronde sur le thème africain de l’édition 2026, la clôture, puis l’ouverture de l’exposition.',
    where: 'Palais des Congrès',
    slots: [
      ['8h30-9h00', 'Accueil des invités'],
      ['9h00-9h10', 'Ouverture : mot du président du comité d’organisation'],
      ['9h10-9h20', 'Projection de la vidéo sur la nouvelle stratégie d’industrialisation du Togo'],
      ['9h20-10h30', 'Table ronde : « Financer l’industrialisation pour un développement inclusif et durable » : un industriel, une industrielle, un investisseur, un jeune entrepreneur industriel, un partenaire technique et financier ; questions du public'],
      ['10h30-10h45', 'Lecture des recommandations ; clôture'],
      ['10h45-11h15', 'Collation'],
      ['13h30', 'Le Ministre ou son représentant inaugure l’exposition « Fabriqué au Togo »'],
      ['14h00-18h00', 'Exposition ouverte au public ; guichet « Je me lance »'],
    ],
  },
  {
    n: 21, name: 'Samedi', theme: 'Exposition · grand public',
    goal: 'Familles, jeunes et grand public à l’exposition « Fabriqué au Togo » ; 1 500 à 2 000 visiteurs attendus.',
    where: 'Palais des Congrès',
    slots: [
      ['9h00', 'Ouverture de l’exposition « Fabriqué au Togo » au public'],
    ],
  },
  {
    n: 22, name: 'Dimanche', theme: 'Bilan',
    goal: 'Dernier jour de l’exposition ; bilan en chiffres et en images publié le soir ; remerciements publics à chaque entreprise et à chaque école.',
    where: 'Palais des Congrès ; en ligne',
    slots: [],
  },
]

/* Thème national de l'édition 2026 ; « L'industrie à portée de main » reste le slogan. */
export const NATIONAL_THEME = 'Accélérer l’industrialisation togolaise : transformation productive, innovation et compétitivité'

export const SPEAKERS = [
  ['Faïka Bako', 'Panel · WAFO, huiles et corps gras'],
  ['Mme Soukou', 'Panel · retenue par le comité, identité à confirmer'],
  ['Une jeune femme qui démarre', 'Panel · à identifier avec les incubateurs et AWEP-Togo'],
  ['Amina Azia Ouro-Agoro', 'Portrait · MINAGRO Group, farines de manioc et de plantain'],
  ['Aimée Abra Tenu Lawani', 'Portrait · Kari Kari, savonnerie'],
  ['Akouvi Agbon', 'Portrait · L’Aigle Blanc d’Akouvi, transformation du palmiste'],
]

export const PLACES = [
  ['Zone portuaire de Lomé', 'Plastique, pharmacie, agro-alimentaire, métal, bois, cosmétique.'],
  ['Zone franche', '141 entreprises agréées depuis 1994 et environ 19 000 emplois directs.'],
  ['Plateforme d’Adétikopé (PIA)', 'Textile, soja, engrais, bois, brasserie, assemblage ; plus de 3 000 emplois.'],
  ['Matières premières', 'Phosphates, calcaire et clinker.'],
  ['Agro-industrie', 'Environ 46 % de la valeur ajoutée manufacturière.'],
  ['Régions', 'Agbélouvé (parc éco-industriel à l’étude) et Kara (pôle en gestation).'],
]

export const PARTNERS = [
  'Ministère de l’Éducation nationale',
  'Universités et grandes écoles',
  'CCI-Togo et organisations patronales',
  'Port autonome de Lomé',
  'Coopération allemande (GIZ)',
  'Bureau national de l’ONUDI',
  'Pôles d’innovation et incubateurs',
  'AWEP-Togo',
]

/* Fil jeunesse V3 : pages / contenus à brancher progressivement. */
export const YOUTH_PILLAR = {
  title: 'L’industrie à portée de main',
  steps: ['Rêver', 'Comprendre', 'Commencer'] as const,
}
