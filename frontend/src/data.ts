export type Day = {
  n: number; name: string; theme: string; goal: string; where: string
  slots: [string, string][]; phare?: boolean
}

/* Programme de la proposition MDPISE, octobre 2026. Lieux encore à arrêter. */
export const DAYS: Day[] = [
  {
    n: 16, name: 'Lundi', theme: 'Ouverture',
    goal: 'Cérémonie, bilan 2020-2025 et vision 2026-2031, premiers labels, puis visite de la PIA.',
    where: 'Lieu de cérémonie (PIA, Hôtel 2 Février ou Sarakawa) ; visite PIA l’après-midi',
    slots: [
      ['9h00', 'Accueil des invités et de la presse'],
      ['9h30', 'Cérémonie d’ouverture : mot de bienvenue, discours du Ministre, symbole et label'],
      ['9h50', 'Film « 2020-2025, ce que l’industrie togolaise a construit », et la vision 2026-2031'],
      ['10h10', 'Remise des premiers labels aux entreprises et aux écoles'],
      ['15h00', 'Visite des entreprises de la PIA avec le Ministre et la presse, jusqu’à 16h30'],
    ],
  },
  {
    n: 17, name: 'Mardi', theme: 'Jeunes, métiers et qualité',
    goal: 'Visites d’usines, Journées de la qualité (HAUQE), forum d’orientation des métiers et « Ils ont commencé petit ».',
    where: 'Usines le matin ; lieu principal l’après-midi',
    slots: [
      ['8h30', 'Visites d’usines, premier créneau (20 à 30 élèves, 90 min)'],
      ['10h30', 'Visites d’usines, second créneau ; une machine et son métier'],
      ['9h00', 'En parallèle : HAUQE, Journées nationale et mondiale de la qualité, Prix de la qualité'],
      ['14h00', 'Forum d’orientation des métiers'],
      ['16h00', '« Ils ont commencé petit » : trois industriels, dont au moins une femme'],
    ],
  },
  {
    n: 18, name: 'Mercredi', theme: 'Innovation et mise à niveau',
    goal: 'INPIT avec les incubateurs, vitrine des innovateurs togolais ; après-midi BRMN.',
    where: 'Lieu principal (salle toute la journée)',
    slots: [
      ['9h00', 'Accueil des participants'],
      ['9h30', 'INPIT : de la recherche à l’innovation, protéger et valoriser, vitrine des innovateurs togolais'],
      ['14h00', 'BRMN : Journée de la mise à niveau, jusqu’à 17h00'],
    ],
  },
  {
    n: 19, name: 'Jeudi', theme: 'Femmes dans l’industrie',
    goal: 'Portraits, panel, cercle des industrielles, puis visite d’entreprises de femmes en zone franche.',
    where: 'Lieu principal le matin ; zone franche l’après-midi (API-ZF)',
    slots: [
      ['9h00', 'Projection de portraits filmés de femmes de l’industrie'],
      ['9h30', 'Panel « Les métiers de l’industrie au féminin »'],
      ['11h00', 'Cercle des industrielles : échanges en petits groupes'],
      ['14h00', 'Visite d’entreprises de femmes en zone franche, avec l’API-ZF'],
    ],
  },
  {
    n: 20, name: 'Vendredi', theme: 'Journée phare', phare: true,
    goal: 'Journée de l’industrialisation de l’Afrique : opportunités, une table ronde, clôture, puis exposition et rencontres d’affaires.',
    where: 'Lieu principal (Palais des congrès ou Hôtel Sarakawa)',
    slots: [
      ['8h30', 'Accueil des invités'],
      ['9h00', 'Ouverture : comité d’organisation ; message de l’ONUDI'],
      ['9h20', 'API-ZF : opportunités d’investissement'],
      ['9h35', 'Table ronde : produire et transformer au Togo'],
      ['10h50', 'Recommandations et discours de clôture du Ministre'],
      ['11h30', 'Inauguration de l’exposition « Fabriqué au Togo »'],
      ['14h00', 'Rencontres d’affaires API-ZF (10 tables, 20 min), jusqu’à 17h00'],
      ['14h00', 'Exposition ouverte et guichet « Je me lance », jusqu’à 18h00'],
    ],
  },
  {
    n: 21, name: 'Samedi', theme: 'Exposition · grand public',
    goal: 'Familles et jeunes à l’exposition « Fabriqué au Togo » ; démonstrations et vote du produit coup de cœur.',
    where: 'Lieu principal',
    slots: [
      ['9h00', 'Ouverture de l’exposition au public ; un jeton de vote à l’entrée'],
      ['14h00', 'Démonstrations de fabrication ; espace enfants'],
      ['16h00', 'Résultat du vote du produit coup de cœur'],
    ],
  },
  {
    n: 22, name: 'Dimanche', theme: 'Bilan',
    goal: 'Dernier jour de l’exposition ; bilan et résultats publiés en ligne.',
    where: 'Lieu principal / en ligne',
    slots: [],
  },
]

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
