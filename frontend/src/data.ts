export type Day = {
  n: number; name: string; theme: string; goal: string; where: string
  slots: [string, string][]; phare?: boolean
}

/* Programme validé par le Ministre (MDPISE, novembre 2026) : trois rendez-vous au Palais des Congrès. */
export const DAYS: Day[] = [
  {
    n: 16, name: 'Lundi', theme: 'Ouverture', phare: true,
    goal: 'Le lancement de la semaine, puis le Ministre et les autorités chez les industriels.',
    where: 'Palais des Congrès de Lomé (grande salle)',
    slots: [
      ['8h30', 'Accueil et installation des invités et des autorités'],
      ['9h00', 'Mot de bienvenue du Président du comité d’organisation'],
      ['9h10', 'Allocutions : Directeur général de l’ONUDI (diffusion), Secrétaire général de l’ONU, Président de la CCI-Togo'],
      ['9h45', 'Film de 3 minutes : « 2020-2025, ce que l’industrie togolaise a construit », et la vision 2026-2031'],
      ['9h50-10h00', 'Discours de Monsieur le Ministre délégué, chargé de la Promotion des investissements, de l’Industrie et de la Souveraineté économique'],
      ['10h00', 'Remise symbolique des labels aux entreprises et aux écoles partenaires ; photo de famille'],
      ['10h15-10h45', 'Pause-café'],
      ['10h45-11h00', 'Keynote sur le thème « Accélérer l’industrialisation togolaise : transformation productive, innovation et compétitivité »'],
      ['11h00-12h00', 'Panel sur le thème, avec des acteurs de l’industrie'],
      ['12h00', 'Le Ministre lance l’exposition « Fabriqué au Togo » au 1er étage et visite les stands'],
      ['15h00-16h30', 'Visite d’industries par le Ministre et les autorités, avec la presse'],
    ],
  },
  {
    n: 17, name: 'Mardi', theme: 'Jeunes et métiers',
    goal: 'Les usines ouvrent leurs portes, puis les jeunes découvrent les métiers de l’industrie.',
    where: 'Usines le matin ; Palais des Congrès de Lomé (grande salle) l’après-midi',
    slots: [
      ['Matin', 'Usines ouvertes : premiers créneaux de visite'],
      ['14h00-16h00', 'Forum d’orientation des métiers : écoles et entreprises présentent les métiers de l’industrie et les formations qui y mènent ; questions de la salle'],
      ['16h00-16h45', '« Ils ont commencé petit » : des industriels, dont au moins une femme, racontent leurs débuts'],
    ],
  },
  {
    n: 18, name: 'Mercredi', theme: 'Femmes dans l’industrie',
    goal: 'Montrer que l’industrie togolaise est aussi faite par des femmes, puis aller les voir au travail.',
    where: 'Palais des Congrès de Lomé (salle polyvalente) le matin ; usines l’après-midi',
    slots: [
      ['9h00-9h10', 'Projection de portraits filmés de femmes de l’industrie'],
      ['9h10-10h45', 'Panel « Les métiers de l’industrie au féminin » : des industrielles et une jeune femme qui démarre son activité'],
      ['Après-midi', 'Visites d’usines, avec un accent sur les industries dirigées par des femmes'],
    ],
  },
]

/* Ce qui se déroule sur plusieurs jours : titre, période et lieu, description. */
export const ALL_WEEK: [string, string, string][] = [
  ['Les usines ouvrent leurs portes', 'Du lundi 16 au vendredi 20 novembre', 'Écoles et particuliers visitent les industries labellisées « Usine ouverte », par petits groupes et sur plusieurs créneaux, sur inscription.'],
  ['Exposition « Fabriqué au Togo »', 'Du lundi au mercredi, au 1er étage du Palais des Congrès', '19 stands d’industries togolaises, lancés par le Ministre le lundi 16 à l’issue de l’ouverture.'],
  ['Le parcours des métiers', 'Du lundi au mercredi, dans le hall du Palais des Congrès', 'Des silhouettes grandeur nature, chacune avec sa fiche métier : missions, formations, débouchés.'],
  ['« Ça se fabrique au Togo »', 'Toute la semaine, sur les réseaux du Ministère', 'Chaque jour, une usine ouverte présentée en vidéo dans la rubrique « L’usine du jour ».'],
  ['Concours vidéo', 'Sur les réseaux, pour les élèves et les étudiants', 'Filmez votre visite et publiez-la avec #SemaineIndustrieTogo2026 : la meilleure vidéo gagne 200 000 FCFA.'],
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
