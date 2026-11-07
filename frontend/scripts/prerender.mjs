#!/usr/bin/env node
/*
 * Pré-rendu des routes publiques, après `vite build` (client) et `vite build --ssr` (dist-ssr).
 *
 * Pour chaque route de src/lib/publicSeo.json, écrit dist/<route>/index.html avec :
 *   - le contenu complet de la page (React rendu côté serveur), pour les moteurs et l'affichage immédiat ;
 *   - title, description, robots, canonique, Open Graph et Twitter propres à la route ;
 *   - le JSON-LD de la route (src/lib/structuredData.ts).
 * Écrit aussi dist/app.html (coquille vide, repli pour les routes non pré-rendues) et dist/sitemap.xml.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

const routes = JSON.parse(readFileSync(join(root, 'src/lib/publicSeo.json'), 'utf8'))
const ssr = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)

/* Échappe le texte destiné aux attributs / nœuds HTML. */
function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/* JSON sûr dans une balise <script> (pas de fermeture prématurée). */
function scriptJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

/* Remplace ou pose une balise meta name/property (valeur sur une ou plusieurs lignes). */
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

/*
 * Servie en repli pour une autre adresse (route dynamique, sous-domaine backoffice, ancienne conf Nginx),
 * la page pré-rendue est masquée avant d'être peinte ; main.tsx la remplace par le bon rendu.
 * Contenu figé : son empreinte sha256 figure dans la CSP de deploy/nginx-https-hsts.conf.
 */
const ROOT_GUARD =
  "<script>(function(){var r=document.getElementById('root'),p=location.pathname.replace(/\\/+$/,'')||'/';if(r.getAttribute('data-prerendered')!==p)r.style.visibility='hidden'})()</script>"

/* Injecte head + contenu rendu d'une route dans la coquille de build. */
async function applyRoute(template, route) {
  const title = ssr.composeTitle(route.title, route.fullTitle)
  const url = ssr.routeUrl(route.path)
  const robots = route.noIndex ? 'noindex, follow' : 'index, follow, max-image-preview:large'

  let out = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
  out = setMeta(out, 'name', 'description', route.description)
  out = setMeta(out, 'name', 'robots', robots)
  out = setMeta(out, 'property', 'og:title', title)
  out = setMeta(out, 'property', 'og:description', route.description)
  out = setMeta(out, 'property', 'og:url', url)
  out = setMeta(out, 'name', 'twitter:title', title)
  out = setMeta(out, 'name', 'twitter:description', route.description)
  out = setCanonical(out, url)

  const jsonLd = `<script type="application/ld+json">${scriptJson(ssr.structuredData(route.path))}</script>`
  out = out.replace('</head>', `    ${jsonLd}\n  </head>`)

  const body = await ssr.render(route.path)
  out = out.replace(
    '<div id="root"></div>',
    `<div id="root" data-prerendered="${escapeHtml(route.path)}">${body}</div>\n    ${ROOT_GUARD}`,
  )
  return out
}

/* Écrit le HTML statique d'une route publique. */
async function writeRoute(template, route) {
  const html = await applyRoute(template, route)
  const dir = route.path === '/' ? dist : join(dist, route.path.replace(/^\//, ''))
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  const words = html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<head[\s\S]*?<\/head>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  console.log(`  prerender ${route.path.padEnd(26)} ${String(words).padStart(5)} mots${route.noIndex ? '  (noindex)' : ''}`)
}

/* Sitemap des seules pages indexables. */
function writeSitemap() {
  const urls = routes
    .filter((route) => !route.noIndex)
    .map((route) => `  <url>\n    <loc>${ssr.routeUrl(route.path)}</loc>\n  </url>`)
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  writeFileSync(join(dist, 'sitemap.xml'), xml)
  console.log(`  sitemap   ${routes.filter((r) => !r.noIndex).length} URL`)
}

const template = readFileSync(join(dist, 'index.html'), 'utf8')
if (!template.includes('<div id="root"></div>')) {
  console.error('dist/index.html invalide — lancer vite build d’abord.')
  process.exit(1)
}

console.log('==> Prerender des routes publiques')
/* Coquille vide conservée : repli possible pour les routes dynamiques (voir deploy/nginx). */
writeFileSync(
  join(dist, 'app.html'),
  template
    .replace('<meta name="robots" content="index, follow" />', '<meta name="robots" content="noindex, follow" />')
    .replace(/\s*<link rel="canonical"[^>]*>/, ''),
)
for (const route of routes) await writeRoute(template, route)
writeSitemap()

/* Le bundle de pré-rendu ne sert qu'au build. */
rmSync(ssrDir, { recursive: true, force: true })
