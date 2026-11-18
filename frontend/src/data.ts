export type Day = {
  n: number; name: string; theme: string; goal: string; where: string
  slots: [string, string][]; phare?: boolean
}

/* Dernier programme reçu (PDF de novembre 2026) : trois rendez-vous au Palais des Congrès. */
export const DAYS: Day[] = [
  {
    n: 16, name: 'Lundi', theme: 'Ouverture', phare: true,
    goal: 'Le lancement de la semaine, puis le Ministre et les autorités chez les industriels.',
    where: 'Palais des Congrès de Lomé (grande salle)',
    slots: [
      ['8h30', 'Accueil et installation des invités et des autorités'],
      ['9h00', 'Mot de bienvenue du Président du comité d’organisation'],
      ['9h10', 'Allocutions : la Représentante résidente de l’ONUDI (discours diffusé en vidéo), la Coordonnatrice résidente du système des Nations Unies au Togo, le Président de la Chambre de Commerce et d’Industrie du Togo (CCI-Togo)'],
      ['9h45-9h55', 'Discours de Dr Arthur TRIMUA, Ministre délégué, chargé de la Promotion des Investissements, de l’Industrie et de la Souveraineté Économique'],
      ['10h00', 'Remise symbolique des labels aux entreprises et aux écoles partenaires ; photo de famille'],
      ['10h15-11h30', 'Panel sur le thème « Accélérer l’industrialisation togolaise : transformation productive, innovation et compétitivité »'],
      ['11h30', 'Le Ministre lance l’exposition « Fabriqué au Togo » et visite les stands'],
      ['12h00', 'Cocktail'],
      ['15h00-16h30', 'Visite d’industries par le Ministre et les autorités, avec la presse'],
    ],
  },
  {
    n: 17, name: 'Mardi', theme: 'Jeunes et métiers',
    goal: 'Les usines ouvrent leurs portes, puis les jeunes découvrent les métiers de l’industrie.',
    where: 'Usines le matin ; Palais des Congrès de Lomé (grande salle) l’après-midi',
    slots: [
      ['Matin', 'Visites d’usines par les écoles'],
      ['12h00', 'Collation'],
      ['14h00-16h00', 'Forum d’orientation des métiers : écoles et entreprises présentent les métiers de l’industrie et les formations qui y mènent'],
      ['16h00-16h45', '« Ils ont commencé petit » : témoignages d’industriels'],
      ['17h00', 'Cocktail'],
    ],
  },
  {
    n: 18, name: 'Mercredi', theme: 'Femmes dans l’industrie',
    goal: 'Montrer que l’industrie togolaise est aussi faite par des femmes, puis aller les voir au travail.',
    where: 'Palais des Congrès de Lomé (salle polyvalente) le matin ; usines l’après-midi',
    slots: [
      ['9h00-10h45', 'Panel « Les métiers de l’industrie au féminin »'],
      ['10h45-11h45', 'Échange avec les Nana Benz'],
      ['12h30', 'Collation'],
      ['Après-midi', 'Visites d’usines par des délégations de jeunes femmes'],
    ],
  },
]

/* Jours de visite d'usines (colonnes du tableau des points de départ). */
export const VISIT_DAYS: { n: number; label: string }[] = [
  { n: 16, label: 'Lun. 16' },
  { n: 17, label: 'Mar. 17' },
  { n: 18, label: 'Mer. 18' },
  { n: 19, label: 'Jeu. 19' },
  { n: 20, label: 'Ven. 20' },
]

/*
 * Points de départ des visites (page /points-de-depart) : heure de départ par jour.
 * Un jour absent = pas de départ ce jour-là. Exemple :
 * { point: 'Lycée technique de Lomé', place: 'Tokoin, Lomé', times: { 16: '7h30', 17: '7h30', 19: '13h00' } },
 */
export type DeparturePoint = { point: string; place?: string; times: Partial<Record<number, string>> }

export const DEPARTURE_POINTS: DeparturePoint[] = []

/* Formulaire des particuliers aux visites : ouvert. Pour le fermer : false ici et PARTICULIER_OPEN=false côté serveur. */
export const PARTICULIER_VISITS_OPEN = true


/* Journées du Palais des Congrès ouvertes à l'inscription des particuliers (mêmes numéros côté serveur). */
export type PalaisDay = { n: number; label: string; title: string; place: string; hours: string; text: string }

export const PALAIS_DAYS: PalaisDay[] = [
  {
    n: 16, label: 'Lundi 16 novembre', title: 'L’ouverture', place: 'Grande salle', hours: 'à partir de 8h30',
    text: 'Cérémonie d’ouverture avec les allocutions et le discours du Ministre, remise des labels aux entreprises et aux écoles partenaires, puis panel sur le thème de l’édition. À 11h30, lancement de l’exposition « Fabriqué au Togo ».',
  },
  {
    n: 17, label: 'Mardi 17 novembre', title: 'Le forum des métiers', place: 'Grande salle', hours: 'de 14h à 16h45',
    text: 'Écoles et entreprises présentent les métiers de l’industrie et les formations qui y mènent, avec des questions de la salle. Puis « Ils ont commencé petit » : des industriels racontent leurs débuts.',
  },
  {
    n: 18, label: 'Mercredi 18 novembre', title: 'Les femmes dans l’industrie', place: 'Salle polyvalente', hours: 'de 9h à 11h45',
    text: 'Le panel « Les métiers de l’industrie au féminin », puis un échange avec les Nana Benz.',
  },
]

/* Profils de l'accréditation médias (mêmes valeurs côté serveur). */
export const MEDIA_PROFILES: { value: string; label: string }[] = [
  { value: 'journaliste', label: 'Journaliste' },
  { value: 'photographe', label: 'Photographe' },
  { value: 'videaste', label: 'Vidéaste' },
  { value: 'createur', label: 'Créateur de contenu' },
  { value: 'autre', label: 'Autre' },
]

/* Libellé d'un profil média. */
export function mediaProfileLabel(value?: string | null) {
  return MEDIA_PROFILES.find((p) => p.value === value)?.label || 'Autre'
}

/* Ce qui se déroule sur plusieurs jours : titre, période et lieu, description. */
export const ALL_WEEK: [string, string, string][] = [
  ['Les usines ouvrent leurs portes', 'Du lundi 16 au vendredi 20 novembre', 'Écoles et particuliers visitent les industries labellisées « Usine ouverte », par petits groupes et sur plusieurs créneaux, sur inscription.'],
  ['Exposition « Fabriqué au Togo »', 'Du lundi au mercredi, au 1er étage du Palais des Congrès', '19 stands d’industries togolaises, lancés par le Ministre le lundi 16 à l’issue de l’ouverture.'],
  ['Le parcours des métiers', 'Du lundi au mercredi, dans le hall du Palais des Congrès', 'Des silhouettes grandeur nature, chacune avec sa fiche métier : missions, formations, débouchés.'],
  ['« Ça se fabrique au Togo »', 'Toute la semaine, sur les réseaux du Ministère', 'Chaque jour, une usine ouverte présentée en vidéo dans la rubrique « L’usine du jour ».'],
  ['Concours vidéo', 'Sur les réseaux, pour les élèves et les étudiants', 'Racontez la semaine en vidéo et publiez-la avec #SemaineIndustrieTogo2026 : la meilleure vidéo gagne 200 000 FCFA.'],
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
  ['Zone franche', 'Entreprises industrielles agréées au régime de zone franche.'],
  ['Plateforme d’Adétikopé (PIA)', 'Textile, soja, engrais, bois, brasserie, assemblage.'],
  // Retirés de l'accueil : chiffres sans source et projets non décidés.
  // ['Zone franche', '141 entreprises agréées depuis 1994 et environ 19 000 emplois directs.'],
  // ['Plateforme d’Adétikopé (PIA)', 'Textile, soja, engrais, bois, brasserie, assemblage ; plus de 3 000 emplois.'],
  // ['Matières premières', 'Phosphates, calcaire et clinker.'],
  // ['Agro-industrie', 'Environ 46 % de la valeur ajoutée manufacturière.'],
  // ['Régions', 'Agbélouvé (parc éco-industriel à l’étude) et Kara (pôle en gestation).'],
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

/* Questions fréquentes (page /faq) ; aussi lues au build pour le balisage FAQPage (lib/structuredData.ts). */
export const FAQ = [
  {
    q: 'Qu’est-ce que la Semaine de l’industrie ?',
    a: 'La Semaine de l’industrie est un événement qui vous permet de découvrir les entreprises, les métiers, les produits et les innovations de l’industrie togolaise. Elle réunit pendant une semaine les professionnels du secteur et le grand public autour de différentes activités.',
  },
  {
    q: 'Quand et où se déroule la Semaine de l’industrie 2026 ?',
    a: 'La Semaine de l’industrie se déroule du 16 au 22 novembre 2026. Les rendez-vous au Palais des Congrès de Lomé ont lieu du lundi 16 au mercredi 18 novembre, et les visites d’usines du lundi 16 au vendredi 20 novembre, directement dans les entreprises.',
  },
  {
    q: 'Qui peut participer à la Semaine de l’industrie ?',
    a: 'La Semaine de l’industrie est ouverte à tous. Que vous soyez élève, étudiant, enseignant, salarié, entrepreneur, industriel, investisseur ou simplement curieux de découvrir l’industrie togolaise, cette semaine s’adresse à vous.',
  },
  {
    q: 'Quelles activités sont prévues pendant la Semaine de l’industrie ?',
    a: 'Au programme : une cérémonie d’ouverture avec un panel sur le thème, un forum d’orientation des métiers, un panel sur les femmes dans l’industrie, l’exposition « Fabriqué au Togo », le parcours des métiers, des visites d’usines toute la semaine et un concours vidéo pour les élèves et les étudiants.',
  },
  {
    q: 'Les visites d’usines sont-elles ouvertes au public ?',
    a: 'Oui ! Les industries labellisées « Usine ouverte » accueillent les écoles et les particuliers du lundi 16 au vendredi 20 novembre 2026, par petits groupes et sur plusieurs créneaux.\nLes inscriptions sont closes. Les personnes déjà inscrites retrouvent leur dossier et leur QR dans « Mon espace ».',
  },
  {
    q: 'Qu’est-ce que le Forum d’orientation des métiers de l’industrie ?',
    a: 'Le Forum d’orientation des métiers est un espace de rencontre entre les jeunes, les établissements de formation et les professionnels qui travaillent dans l’industrie. Il vous permet de découvrir les métiers du secteur, les formations pour y accéder et les opportunités professionnelles.\nIl se tient le mardi 17 novembre 2026, de 14 h à 16 h, au Palais des Congrès de Lomé.',
  },
  {
    q: 'Quand se tient l’exposition « Fabriqué au Togo » et est-elle ouverte au public ?',
    a: 'L’exposition « Fabriqué au Togo » se tient du lundi 16 au mercredi 18 novembre 2026, au 1er étage du Palais des Congrès de Lomé.\nOui, elle est ouverte au public ! 19 industries togolaises y présentent leurs produits et leur savoir-faire.\nElle est lancée par le Ministre le lundi 16 novembre, à l’issue de la cérémonie d’ouverture.',
  },
  {
    q: 'Comment participer au concours vidéo ?',
    a: 'Le concours est réservé aux élèves et aux étudiants. Vivez la Semaine de l’industrie du 16 au 22 novembre, réalisez votre vidéo et publiez-la sur les réseaux sociaux avec le hashtag #SemaineIndustrieTogo2026, en taguant le Ministère : @ministre_mdpise sur Instagram et Facebook, @ministere.invest sur TikTok, @Promo_InvestTg sur X.\nLe nombre de likes compte. Un jury désigne la vidéo gagnante : 200 000 FCFA et une mise à l’honneur sur les réseaux sociaux officiels du Ministère.',
  },
  {
    q: 'Comment s’inscrire à la Semaine de l’industrie ?',
    a: 'Les inscriptions sont closes.\nSi vous êtes déjà inscrit, retrouvez votre dossier et votre QR dans « Mon espace » avec votre code de suivi, ou envoyez « QR » au bot WhatsApp de la Semaine de l’industrie.',
  },
  {
    q: 'Comment participer aux rendez-vous au Palais des Congrès ?',
    a: 'Les inscriptions aux rendez-vous du Palais des Congrès sont closes.\nLes personnes inscrites ont un seul QR, valable pour les journées choisies, à présenter à l’accueil du Palais des Congrès de Lomé. Il se retrouve dans « Mon espace » avec le code de suivi, ou en envoyant « QR » au bot WhatsApp.',
  },
  {
    q: 'Comment obtenir une accréditation média ?',
    a: 'Les demandes d’accréditation médias sont closes.\nLes médias déjà accrédités retrouvent leur QR dans « Mon espace » avec leur code de suivi. Il est valable les trois jours du Palais des Congrès, du 16 au 18 novembre.',
  },
  {
    q: 'Comment demander un label et suivre l’évolution de sa demande ?',
    a: 'Les demandes de label sont closes.\nSi vous avez déjà envoyé une demande, votre code de suivi vous permet de suivre votre dossier depuis la rubrique « Mon espace » du site ou sur WhatsApp, en sélectionnant « Suivi de participation ».',
  },
  {
    q: 'Où consulter le programme complet et obtenir des informations complémentaires ?',
    a: 'Le programme détaillé de la Semaine de l’industrie est disponible dans la rubrique « Programme » du site.\nPour toute autre question ou information complémentaire, vous pouvez utiliser la rubrique « Contact » ou écrire à infos@semaineindustrie.tg.',
  },
]
