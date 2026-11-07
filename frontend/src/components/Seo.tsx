import { useEffect } from 'react'
import { applySeo, type SeoInput } from '../lib/seo'

/* Applique les balises SEO pour la page montée. */
export function Seo(props: SeoInput) {
  useEffect(() => {
    applySeo(props)
  }, [props.title, props.fullTitle, props.description, props.path, props.image, props.noIndex])

  return null
}
