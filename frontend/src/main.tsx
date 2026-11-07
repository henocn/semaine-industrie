import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!
const app = (
  <StrictMode>
    <App />
  </StrictMode>
)

/* Normalise un chemin : sans barre finale, '/' pour l'accueil. */
function normalize(path: string) {
  return path.length > 1 ? path.replace(/\/+$/, '') : '/'
}

/*
 * Le HTML pré-rendu au build (scripts/prerender.mjs) porte data-prerendered="<route>".
 * Même route que l'URL : on hydrate. Sinon (route dynamique servie par repli sur l'accueil,
 * sous-domaine backoffice…) : on vide et on rend côté client, comme avant.
 */
/* Pages dont le premier rendu dépend du navigateur (code de suivi, jeux déjà joués) : rendu client. */
const CLIENT_ONLY = new Set(['/mon-espace', '/vue-par-vous'])

const prerendered = container.dataset.prerendered
const path = normalize(window.location.pathname)
const canHydrate =
  prerendered &&
  normalize(prerendered) === path &&
  !window.location.search &&
  !CLIENT_ONLY.has(path) &&
  window.location.hostname !== 'backoffice.semaineindustrie.tg'

if (canHydrate) {
  hydrateRoot(container, app)
} else {
  container.textContent = ''
  container.style.visibility = ''
  delete container.dataset.prerendered
  createRoot(container).render(app)
}
