import { StrictMode } from 'react'
import { prerender } from 'react-dom/static'
import { StaticRouter } from 'react-router-dom'
import { AppRoutes } from './App'

export { routeUrl, structuredData } from './lib/structuredData'
export { composeTitle } from './lib/seo'

/*
 * Rendu HTML d'une route publique au build (scripts/prerender.mjs), pour les moteurs et l'affichage immédiat.
 * prerender attend les composants chargés à la demande (lazy) : le HTML est complet.
 */
export async function render(url: string) {
  const { prelude } = await prerender(
    <StrictMode>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </StrictMode>,
  )
  return new Response(prelude).text()
}
