export type Day = {
  n: number; name: string; theme: string; goal: string; where: string
  slots: [string, string][]; phare?: boolean
}

export const DAYS: Day[] = [
  {
    n: 16, name: 'Lundi', theme: 'Lancement',
    goal: 'Ouverture officielle de la semaine et première visite d’usine avec le Ministre.',
    where: 'CETEF Togo 2000, puis une usine de Lomé',
    slots: [
      ['9h00', 'Accueil des invités et de la presse'],
      ['9h30', 'Cérémonie d’ouverture et discours du Ministre'],
      ['10h15', 'Remise des premiers labels aux entreprises et aux écoles'],
      ['10h30', 'Conférence de presse'],
      ['15h00', 'Visite d’une première usine avec le Ministre et la presse'],
    ],
  },
  {
    n: 17, name: 'Mardi', theme: 'Jeunesse et métiers',
    goal: 'Les lycéens et les étudiants découvrent les métiers de l’industrie.',
    where: 'Usines le matin, CETEF Togo 2000 l’après-midi',
    slots: [
      ['8h30', 'Visites d’usines, premier créneau (groupes de 20 à 30 élèves)'],
      ['10h30', 'Visites d’usines, second créneau'],
      ['14h00', 'Forum des métiers : un stand par métier, tenu par des professionnels'],
      ['16h00', 'Conseils d’orientation et témoignages de jeunes professionnels'],
    ],
  },
  {
    n: 18, name: 'Mercredi', theme: 'Transformation locale',
    goal: 'Comment le Togo transforme ses propres matières premières.',
    where: 'Sites de transformation, puis CETEF Togo 2000',
    slots: [
      ['8h30', 'Visites : agro-industrie, matières premières, matériaux de construction'],
      ['14h30', 'Accueil des PME transformatrices'],
      ['14h45', 'Exposés : accès aux marchés, normes et qualité, financement'],
      ['15h45', 'Échanges en petits groupes avec des industriels installés'],
    ],
  },
  {
    n: 19, name: 'Jeudi', theme: 'Femmes dans l’industrie',
    goal: 'La place des femmes dans l’industrie, à partir des entreprises de la zone franche.',
    where: 'Zone franche, puis CETEF Togo 2000',
    slots: [
      ['8h30', 'Visites d’entreprises de la zone franche, rencontres avec des salariées'],
      ['15h00', 'Table ronde « Les métiers de l’industrie au féminin »'],
      ['16h30', 'Témoignages filmés et échanges'],
    ],
  },
  {
    n: 20, name: 'Vendredi', theme: 'Journée phare', phare: true,
    goal: 'Forum, tables rondes et rencontres d’affaires, pour la Journée de l’industrialisation de l’Afrique.',
    where: 'CETEF Togo 2000',
    slots: [
      ['8h30', 'Accueil des invités'],
      ['9h30', 'Ouverture : discours du Ministre, message de l’ONUDI'],
      ['10h00', 'Table ronde : la transformation locale, levier de souveraineté économique'],
      ['11h20', 'Table ronde : industrie et emploi des jeunes'],
      ['12h30', 'Déjeuner-réseau'],
      ['14h00', 'Rencontres d’affaires sur rendez-vous'],
      ['17h15', 'Clôture'],
    ],
  },
  {
    n: 21, name: 'Samedi', theme: 'Grand public',
    goal: 'Une exposition des produits fabriqués au Togo, ouverte aux familles.',
    where: 'CETEF Togo 2000',
    slots: [
      ['10h00', 'Ouverture de l’exposition, une vingtaine de stands'],
      ['14h00', 'Atelier de fabrication pour les enfants et démonstrations'],
      ['18h00', 'Fermeture'],
    ],
  },
  {
    n: 22, name: 'Dimanche', theme: 'Bilan',
    goal: 'Publication du bilan de la semaine, en chiffres et en images.',
    where: 'En ligne',
    slots: [],
  },
]

export const SPEAKERS = [
  ['Faïka Bako', 'WAFO, huiles et corps gras'],
  ['Yolande Soukou', 'SOPROEM, textiles et kits médicaux'],
  ['Amina Azia Ouro-Agoro', 'MINAGRO Group, farines de manioc et de plantain'],
  ['Aimée Abra Tenu Lawani', 'Kari Kari, savonnerie'],
  ['Akouvi Agbon', 'L’Aigle Blanc d’Akouvi, transformation du palmiste'],
]

export const PLACES = [
  ['Zone portuaire de Lomé', 'Plastique, pharmacie, agro-alimentaire, métal, bois, habillement et cosmétique, sur plus de 900 hectares.'],
  ['Zone franche', '141 entreprises agréées depuis 1994 et environ 19 000 emplois directs.'],
  ['Plateforme d’Adétikopé', 'Textile, soja, engrais, bois, brasserie et assemblage électrique ; plus de 3 000 emplois.'],
  ['Matières premières', 'Phosphates, calcaire et clinker.'],
  ['Agro-industrie', 'Près de la moitié de la valeur ajoutée de l’industrie manufacturière.'],
  ['Régions', 'Agbélouvé et Kara, avec leurs projets de parcs industriels.'],
]

export const PARTNERS = [
  'Ministère de l’Éducation nationale',
  'Universités et grandes écoles',
  'Chambre de commerce et organisations patronales',
  'Port autonome de Lomé',
  'Coopération allemande (GIZ)',
  'Bureau national de l’ONUDI',
]
