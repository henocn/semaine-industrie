import publicSeoCatalog from './publicSeo.json' with { type: 'json' }

export const SITE_URL = 'https://semaineindustrie.tg'
export const SITE_NAME = 'Semaine de l’industrie 2026'
/* Suffixe des titres : « Togo » distingue l'événement de son homonyme français, aux mêmes dates. */
export const TITLE_SUFFIX = 'Semaine de l’industrie Togo 2026'

export type SeoInput = {
  title?: string
  fullTitle?: string
  description?: string
  path?: string
  image?: string
  noIndex?: boolean
}

export type PublicSeoEntry = {
  path: string
  title?: string
  fullTitle?: string
  description: string
  noIndex?: boolean
}

export const PUBLIC_SEO: Record<string, PublicSeoEntry> = Object.fromEntries(
  publicSeoCatalog.map((row) => [row.path, row]),
)

/* Retourne le SEO français d'une route publique connue. */
export function publicSeo(path: string): SeoInput {
  const row = PUBLIC_SEO[path]
  if (!row) return { path }
  return {
    path: row.path,
    title: row.title,
    fullTitle: row.fullTitle,
    description: row.description,
    noIndex: row.noIndex,
  }
}

/* Titre complet affiché dans l'onglet et les résultats (même règle que scripts/prerender.mjs). */
export function composeTitle(title?: string, fullTitle?: string) {
  if (fullTitle) return fullTitle
  return title ? `${title} · ${TITLE_SUFFIX}` : `${SITE_NAME} au Togo`
}

/* Indique si on est sur le sous-domaine backoffice. */
export function isBackofficeHost() {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'backoffice.semaineindustrie.tg'
}
export const DEFAULT_DESCRIPTION = PUBLIC_SEO['/'].description
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.jpg`

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
  fullTitle: explicitTitle,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
}: SeoInput) {
  const fullTitle = composeTitle(title, explicitTitle)
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  /* Les pages préparées au build sont des dossiers : le serveur les sert avec une barre oblique finale. */
  const url = `${SITE_URL}${cleanPath !== '/' && PUBLIC_SEO[cleanPath] ? `${cleanPath}/` : cleanPath}`

  document.title = fullTitle

  setMeta('name', 'description', description)
  setMeta('name', 'robots', noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
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
  setMeta('property', 'og:image:alt', "Affiche officielle, Semaine de l'industrie 2026")

  setMeta('name', 'twitter:card', 'summary_large_image')
  setMeta('name', 'twitter:title', fullTitle)
  setMeta('name', 'twitter:description', description)
  setMeta('name', 'twitter:image', image)

  setCanonical(url)
}
