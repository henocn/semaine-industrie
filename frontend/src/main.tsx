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
const prerendered = container.dataset.prerendered
if (prerendered && normalize(prerendered) === normalize(window.location.pathname) && window.location.hostname !== 'backoffice.semaineindustrie.tg') {
  hydrateRoot(container, app)
} else {
  container.textContent = ''
  delete container.dataset.prerendered
  createRoot(container).render(app)
}
