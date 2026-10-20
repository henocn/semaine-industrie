import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listIndustries, type IndustryCard } from '../api/labels'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Extrait deux initiales d'un nom d'entreprise pour l'aplat de repli. */
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.trim().slice(0, 2)
  return letters.toUpperCase()
}

/* Image de couverture d'une fiche : photo si disponible, sinon aplat sage avec initiales. */
function IndustryCover({ item }: { item: IndustryCard }) {
  const src = item.photo_url || item.gallery_urls?.[0] || null
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
    )
  }
  return (
    <div className="grid h-full w-full place-items-center bg-sage">
      <span className="display text-5xl">{initials(item.name)}</span>
    </div>
  )
}

/* Annuaire public des industries : grille visuelle, fiche détaillée au clic. */
export default function IndustriesPage() {
  const [items, setItems] = useState<IndustryCard[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listIndustries()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [])

  return (
    <main className="py-14 sm:py-20">
      <Seo
        title="Industrie"
        description="Entreprises labellisées de la Semaine de l’industrie 2026. Parcourez les fiches et découvrez les sites ouverts."
        path="/industrie"
      />
      <div className={WRAP}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            eyebrow="Annuaire"
            title="Industrie"
            lead="Les entreprises labellisées de la Semaine. Ouvrez une fiche pour découvrir le site et les produits."
          />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button to="/carte" variant="link">
              Voir sur la carte
            </Button>
            <Button to="/label" variant="link">
              Demander le label
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-8 font-medium text-flag">
            {error}
          </p>
        )}
        {!error && items.length === 0 && (
          <p className="mt-10 text-ink/70">Aucune industrie publiée pour le moment.</p>
        )}

        {items.length > 0 && (
          <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const place = [item.city, item.region].filter(Boolean).join(', ')
              return (
                <li key={item.id}>
                  <Link
                    to={`/o/${item.slug}`}
                    className="group block focus-visible:outline-offset-4"
                    aria-label={`Ouvrir la fiche ${item.name}`}
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-sm bg-sage">
                      <IndustryCover item={item} />
                    </div>
                    <div className="mt-4 border-t-2 border-sun pt-3">
                      <h2 className="font-display text-xl font-bold text-forest group-hover:text-ink">
                        {item.name}
                      </h2>
                      <p className="mt-1 text-[15px] text-ink/75">
                        {[item.sector, place].filter(Boolean).join(' · ') || 'Fiche à compléter'}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest underline decoration-forest/30 underline-offset-4 group-hover:text-ink">
                        Voir la fiche
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </main>
  )
}
