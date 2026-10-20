export const SITE_URL = 'https://semaineindustrie.tg'
export const BACKOFFICE_URL = 'https://backoffice.semaineindustrie.tg'
export const SITE_NAME = 'Semaine de l’industrie 2026'

/* Indique si on est sur le sous-domaine backoffice. */
export function isBackofficeHost() {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'backoffice.semaineindustrie.tg'
}
export const DEFAULT_DESCRIPTION =
  'Du 16 au 22 novembre 2026 au Togo : usines ouvertes, métiers, journée phare du 20 novembre et rencontres d’affaires.'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.jpg`

export type SeoInput = {
  title?: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
}

/* Met à jour ou crée une balise meta / link dans le head. */
function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/* Met à jour le lien canonique. */
function setCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/* Applique le SEO de la page courante (title, description, Open Graph, Twitter). */
export function applySeo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
}: SeoInput) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Togo`
  const url = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`

  document.title = fullTitle

  setMeta('name', 'description', description)
  setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')
  setMeta('name', 'theme-color', '#024D3E')

  setMeta('property', 'og:type', 'website')
  setMeta('property', 'og:site_name', SITE_NAME)
  setMeta('property', 'og:locale', 'fr_TG')
  setMeta('property', 'og:title', fullTitle)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:url', url)
  setMeta('property', 'og:image', image)
  setMeta('property', 'og:image:width', '1200')
  setMeta('property', 'og:image:height', '675')
  setMeta('property', 'og:image:alt', SITE_NAME)

  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', fullTitle)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', image)

  setCanonical(url)
}
