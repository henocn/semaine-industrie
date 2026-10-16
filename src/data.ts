import {
  Rocket, GraduationCap, Tractor, PersonStanding, Star, Users, BarChart3,
  Anchor, Truck, Factory, Mountain, Wheat, Map,
  BookOpen, Store, Leaf, Globe, type LucideIcon,
} from 'lucide-react'

export type Day = {
  n: number; short: string; name: string; theme: string; icon: LucideIcon
  goal: string; where: string; slots: [string, string][]; highlight?: boolean
}

export const DAYS: Day[] = [
  {
    n: 16, short: 'Lun.', name: 'Lundi', theme: 'Lancement', icon: Rocket,
    goal: 'Annoncer la semaine et donner le ton.',
    where: 'Institutions, presse, industriels · CETEF Togo 2000, puis une première usine',
    slots: [
      ['9h00', 'Accueil des invités et de la presse'],
      ['9h30', 'Cérémonie d’ouverture : discours du Ministre, présentation du symbole et du label'],
      ['10h15', 'Remise symbolique des labels aux premières entreprises et écoles'],
      ['10h30', 'Conférence de presse : programme, chiffres clés de l’industrie, mode d’emploi'],
      ['15h00', 'Départ pour la visite d’une première usine, avec le Ministre et la presse'],
      ['15h30', 'Visite guidée, échanges avec des salariés, interviews'],
      ['16h30', 'Publication des premières images'],
    ],
  },
  {
    n: 17, short: 'Mar.', name: 'Mardi', theme: 'Jeunesse et métiers', icon: GraduationCap,
    goal: 'Faire découvrir les métiers de l’industrie aux lycéens et aux étudiants.',
    where: 'Lycéens, étudiants, enseignants · Usines le matin, CETEF l’après-midi',
    slots: [
      ['8h30', 'Usines ouvertes, créneau 1 : groupes de 20 à 30 élèves, 90 minutes'],
      ['10h30', 'Usines ouvertes, créneau 2'],
      ['14h00', 'Ouverture du forum des métiers'],
      ['14h15', 'Stands de métiers : rencontres avec des professionnels'],
      ['16h00', 'Conseils d’orientation et témoignages de jeunes professionnels'],
      ['16h45', 'Clôture et questionnaire de satisfaction'],
    ],
  },
  {
    n: 18, short: 'Mer.', name: 'Mercredi', theme: 'Transformation locale', icon: Tractor,
    goal: 'Montrer comment le Togo transforme ses propres matières premières.',
    where: 'PME, coopératives, étudiants · Sites de transformation, puis CETEF',
    slots: [
      ['8h30', 'Visites : agro-industrie, matières premières, matériaux de construction'],
      ['14h30', 'Accueil des PME transformatrices'],
      ['14h45', 'Trois exposés : accès aux marchés, normes et qualité, financement'],
      ['15h45', 'Échanges en petits groupes avec des industriels installés'],
      ['16h45', 'Pistes concrètes : contacts et suites à donner'],
    ],
  },
  {
    n: 19, short: 'Jeu.', name: 'Jeudi', theme: 'Femmes · Zone franche', icon: PersonStanding,
    goal: 'Montrer la place des femmes dans l’industrie, à partir de la zone franche.',
    where: 'Jeunes femmes, grand public · Zone franche, puis CETEF',
    slots: [
      ['8h30', 'Visites d’entreprises de la zone franche : textile, agro-alimentaire, pharmacie'],
      ['15h00', 'Table ronde « Les métiers de l’industrie au féminin »'],
      ['16h30', 'Témoignages filmés et échanges avec les jeunes femmes présentes'],
    ],
  },
  {
    n: 20, short: 'Ven.', name: 'Vendredi', theme: 'Journée phare', icon: Star, highlight: true,
    goal: 'Réunir décideurs, industriels, PME et investisseurs.',
    where: 'Journée de l’industrialisation de l’Afrique · CETEF Togo 2000',
    slots: [
      ['8h30', 'Accueil des invités'],
      ['9h30', 'Ouverture : discours du Ministre, message de l’ONUDI'],
      ['10h00', 'Table ronde 1 : la transformation locale, levier de souveraineté économique'],
      ['11h20', 'Table ronde 2 : industrie et emploi des jeunes'],
      ['12h30', 'Déjeuner-réseau'],
      ['14h00', 'Rencontres d’affaires par rotations de 20 minutes'],
      ['17h15', 'Clôture ; annonce des contacts noués'],
    ],
  },
  {
    n: 21, short: 'Sam.', name: 'Samedi', theme: 'Grand public', icon: Users,
    goal: 'Faire venir les familles voir ce que le Togo fabrique.',
    where: 'Familles, jeunes · CETEF Togo 2000',
    slots: [
      ['10h00', 'Ouverture de l’exposition : 20 à 25 stands de produits locaux'],
      ['14h00', 'Espace enfants : atelier de fabrication et démonstrations'],
      ['18h00', 'Fermeture'],
    ],
  },
  {
    n: 22, short: 'Dim.', name: 'Dimanche', theme: 'Bilan', icon: BarChart3,
    goal: 'Clore la semaine et publier ses résultats.',
    where: 'En ligne',
    slots: [['Journée', 'Bilan en chiffres et en images ; remerciements aux entreprises et aux écoles']],
  },
]

export const SPEAKERS = [
  { i: 'FB', name: 'Faïka Bako', org: 'WAFO · Huiles et corps gras', tags: 'Investissement · capacités · compétitivité' },
  { i: 'YS', name: 'Yolande Soukou', org: 'SOPROEM · Textiles et kits médicaux', tags: 'Qualité · ISO 9001 · souveraineté sanitaire' },
  { i: 'AO', name: 'Amina Azia Ouro-Agoro', org: 'MINAGRO Group · Farines de manioc et plantain', tags: 'Ressources locales · export · 130 femmes' },
  { i: 'AL', name: 'Aimée Abra Tenu Lawani', org: 'Kari Kari · Savonnerie', tags: 'Fabrication locale · AWEP-Togo' },
  { i: 'AA', name: 'Akouvi Agbon', org: 'L’Aigle Blanc d’Akouvi · Palmiste', tags: 'Financement · 150 productrices' },
]

export const POLES: { icon: LucideIcon; title: string; text: string; when: string }[] = [
  { icon: Anchor, title: 'Zone portuaire de Lomé', text: 'Plus de 900 hectares, deux zones industrielles : plastique, pharmacie, agro-alimentaire, métal, bois, habillement, cosmétique.', when: 'Usines ouvertes du lundi au jeudi' },
  { icon: Truck, title: 'Zone franche', text: '141 entreprises agréées depuis 1994, environ 19 000 emplois directs, 741 M$ d’investissements cumulés.', when: 'Jeudi 19 novembre' },
  { icon: Factory, title: 'Plateforme d’Adétikopé', text: 'Textile, soja, engrais NPK, bois, brasserie, assemblage électrique. Plus de 3 000 emplois créés.', when: 'Visites phares « Made in Togo »' },
  { icon: Mountain, title: 'Matières premières', text: 'Phosphates, calcaire, clinker : +50,9 % pour les industries extractives au 3e trimestre 2025.', when: 'Mercredi 18 novembre' },
  { icon: Wheat, title: 'Agro-industrie', text: '46 % de la valeur ajoutée manufacturière ; transformation alimentaire en hausse de 11,6 %.', when: 'Cœur de la journée du 18' },
  { icon: Map, title: 'Régions', text: 'Agbélouvé : parc éco-industriel en étude. Kara : pôle industriel en gestation.', when: 'Antenne Kara ou Dapaong' },
]

export const PARTNERS: { icon: LucideIcon; name: string }[] = [
  { icon: BookOpen, name: 'Ministère de l’Éducation nationale' },
  { icon: GraduationCap, name: 'Universités et grandes écoles' },
  { icon: Store, name: 'Chambre de commerce' },
  { icon: Anchor, name: 'Port autonome de Lomé' },
  { icon: Leaf, name: 'Coopération allemande (GIZ)' },
  { icon: Globe, name: 'Bureau national de l’ONUDI' },
]

export const KPIS = [
  { v: 30, suffix: '', label: 'Entreprises labellisées' },
  { v: 2000, suffix: '', label: 'Jeunes accueillis en usine' },
  { v: 300, suffix: '', label: 'Participants à la journée phare' },
  { v: 40, suffix: '', label: 'Rendez-vous d’affaires tenus' },
]
