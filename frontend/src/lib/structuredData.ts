import { DAYS, FAQ } from '../data'
import { PUBLIC_SEO, SITE_URL } from './seo'

/*
 * Données structurées schema.org posées au build dans le HTML de chaque route publique
 * (scripts/prerender.mjs). Le graphe WebSite + organisateur est commun à toutes les pages,
 * l'événement est sur l'accueil et le programme, FAQPage sur /faq, un fil d'Ariane ailleurs.
 */

type JsonLd = Record<string, unknown>

const ORGANIZER_ID = `${SITE_URL}/#organisateur`
const WEBSITE_ID = `${SITE_URL}/#site`
const EVENT_ID = `${SITE_URL}/#evenement`

/* Adresse publique d'une route (dossier pré-rendu : barre oblique finale). */
export function routeUrl(path: string) {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path.replace(/\/+$/, '')}/`
}

const ORGANIZER: JsonLd = {
  '@type': 'GovernmentOrganization',
  '@id': ORGANIZER_ID,
  name: 'Ministère délégué, chargé de la Promotion des investissements, de l’Industrie et de la Souveraineté économique',
  alternateName: 'MDPISE',
  url: 'https://investissement.gouv.tg/',
  logo: `${SITE_URL}/brand/bloc-ministere-mdpise.png`,
  address: { '@type': 'PostalAddress', addressLocality: 'Lomé', addressCountry: 'TG' },
  sameAs: [
    'https://x.com/promo_investtg',
    'https://www.facebook.com/PromoInvestTogo/',
    'https://www.linkedin.com/company/minist%C3%A8re-de-la-promotion-de-l-investissement/',
  ],
}

const WEBSITE: JsonLd = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_URL}/`,
  name: 'Semaine de l’industrie 2026 au Togo',
  alternateName: ['Semaine de l’industrie Togo', 'semaineindustrie.tg'],
  inLanguage: 'fr-TG',
  publisher: { '@id': ORGANIZER_ID },
}

const PALAIS: JsonLd = {
  '@type': 'Place',
  name: 'Palais des Congrès de Lomé',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Lomé',
    addressRegion: 'Maritime',
    addressCountry: 'TG',
  },
}

/* Heure de début d'une journée du programme (premier créneau horaire chiffré), heure de Lomé (UTC+0). */
function dayStart(n: number, slots: [string, string][]) {
  const timed = slots.find(([time]) => /^\d{1,2}h\d{2}/.test(time))
  const date = `2026-11-${String(n).padStart(2, '0')}`
  if (!timed) return date
  const [h, m] = timed[0].match(/^(\d{1,2})h(\d{2})/)!.slice(1)
  return `${date}T${h.padStart(2, '0')}:${m}:00+00:00`
}

const EVENT: JsonLd = {
  '@type': 'Event',
  '@id': EVENT_ID,
  name: 'Semaine de l’industrie 2026 au Togo',
  alternateName: ['Semaine de l’industrie Togo 2026', 'SemaineIndustrieTogo2026'],
  description:
    'Du 16 au 22 novembre 2026 au Togo : rendez-vous au Palais des Congrès de Lomé, usines ouvertes aux écoles et au public, forum d’orientation des métiers et exposition « Fabriqué au Togo ».',
  startDate: '2026-11-16T08:30:00+00:00',
  endDate: '2026-11-22',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  eventStatus: 'https://schema.org/EventScheduled',
  inLanguage: 'fr',
  url: `${SITE_URL}/`,
  image: [`${SITE_URL}/og.jpg`],
  location: PALAIS,
  organizer: { '@id': ORGANIZER_ID },
  audience: { '@type': 'Audience', audienceType: 'Élèves, étudiants, écoles, chercheurs d’emploi, industriels et grand public' },
  subEvent: DAYS.map((day) => ({
    '@type': 'Event',
    name: `${day.theme} · Semaine de l’industrie 2026 au Togo`,
    description: day.goal,
    startDate: dayStart(day.n, day.slots),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: PALAIS,
    organizer: { '@id': ORGANIZER_ID },
    url: routeUrl('/programme'),
  })),
}

/* Fil d'Ariane accueil → page. */
function breadcrumb(path: string): JsonLd {
  const name = PUBLIC_SEO[path]?.title || path
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: routeUrl('/') },
      { '@type': 'ListItem', position: 2, name, item: routeUrl(path) },
    ],
  }
}

const FAQ_PAGE: JsonLd = {
  '@type': 'FAQPage',
  mainEntity: FAQ.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

/* Graphe JSON-LD complet d'une route publique. */
export function structuredData(path: string): JsonLd {
  const graph: JsonLd[] = [WEBSITE, ORGANIZER]
  if (path === '/' || path === '/programme') graph.push(EVENT)
  if (path === '/faq') graph.push(FAQ_PAGE)
  if (path !== '/') graph.push(breadcrumb(path))
  return { '@context': 'https://schema.org', '@graph': graph }
}
