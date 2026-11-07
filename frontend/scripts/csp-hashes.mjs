#!/usr/bin/env node
/*
 * Empreintes sha256 des scripts inline de dist/ (après `npm run build`), pour la directive script-src
 * de deploy/nginx-https-hsts.conf. À relancer si index.html, scripts/prerender.mjs ou la version de React change.
 * Usage : node scripts/csp-hashes.mjs
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dist = join(import.meta.dirname, '..', 'dist')
const hashes = new Set()

/* Parcourt dist/ et relève chaque <script> inline (hors JSON-LD, non exécuté). */
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (name.endsWith('.html')) {
      for (const [, body] of readFileSync(path, 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        hashes.add(`'sha256-${createHash('sha256').update(body).digest('base64')}'`)
      }
    }
  }
}

walk(dist)
console.log([...hashes].join(' '))
