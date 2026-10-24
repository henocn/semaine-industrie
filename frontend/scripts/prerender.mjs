#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const siteUrl = 'https://semaineindustrie.tg'
const siteName = 'Semaine de l’industrie 2026'

const routes = JSON.parse(readFileSync(join(root, 'src/lib/publicSeo.json'), 'utf8'))

/* Échappe le texte destiné aux attributs / nœuds HTML. */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/* Construit le titre complet (même règle que applySeo). */
function fullTitle(title) {
  return title ? `${title} · ${siteName}` : `${siteName} · Togo`
}

/* Remplace ou pose une balise meta name/property. */
function setMeta(html, attr, key, content) {
  const re = new RegExp(`<meta\\s+${attr}="${key}"\\s+content="[^"]*"\\s*/?>`, 'i')
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}" />`
  if (re.test(html)) return html.replace(re, tag)
  return html.replace('</head>', `    ${tag}\n  </head>`)
}

/* Pose le lien canonique. */
function setCanonical(html, href) {
  const re = /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i
  const tag = `<link rel="canonical" href="${escapeHtml(href)}" />`
  if (re.test(html)) return html.replace(re, tag)
  return html.replace('</head>', `    ${tag}\n  </head>`)
}

/* Injecte title + metas d'une route dans le HTML de build. */
function applyRoute(html, route) {
  const title = fullTitle(route.title)
  const path = route.path.startsWith('/') ? route.path : `/${route.path}`
  const url = `${siteUrl}${path === '/' ? '/' : path}`
  const description = route.description

  let out = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
  out = setMeta(out, 'name', 'description', description)
  out = setMeta(out, 'name', 'robots', 'index, follow')
  out = setMeta(out, 'property', 'og:title', title)
  out = setMeta(out, 'property', 'og:description', description)
  out = setMeta(out, 'property', 'og:url', url)
  out = setMeta(out, 'name', 'twitter:title', title)
  out = setMeta(out, 'name', 'twitter:description', description)
  out = setCanonical(out, url)
  return out
}

/* Écrit le HTML statique d'une route publique. */
function writeRoute(template, route) {
  const html = applyRoute(template, route)
  const dir = route.path === '/' ? dist : join(dist, route.path.replace(/^\//, ''))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  console.log(`  prerender ${route.path === '/' ? '/' : route.path}`)
}

const template = readFileSync(join(dist, 'index.html'), 'utf8')
if (!template.includes('<div id="root">')) {
  console.error('dist/index.html invalide — lancer vite build d’abord.')
  process.exit(1)
}

console.log('==> Prerender des routes publiques')
for (const route of routes) writeRoute(template, route)
