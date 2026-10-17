import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listIndustries, type IndustryCard } from '../api/labels'
import { WRAP } from '../components/layout/Mark'

/* Couverture d'une industrie (1ère image galerie). */
function coverOf(item: IndustryCard) {
  return item.gallery_urls?.[0] || item.photo_url || null
}

/* Annuaire public des industries labellisées. */
export default function IndustriesPage() {
  const [items, setItems] = useState<IndustryCard[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listIndustries()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [])

  return (
    <main className="pb-20 pt-12 sm:pb-28 sm:pt-16">
      <div className={WRAP}>
        <h1 className="display text-4xl sm:text-5xl">Industrie</h1>
        <p className="mt-4 max-w-xl text-lg text-ink/65">
          Les entreprises labellisées de la Semaine — usines, produits et savoir-faire à découvrir.
        </p>

        {error && <p className="mt-8 text-red-700">{error}</p>}
        {!error && items.length === 0 && (
          <p className="mt-12 text-ink/50">Aucune industrie publiée pour le moment.</p>
        )}

        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const cover = coverOf(item)
            return (
              <li key={item.id}>
                <Link to={`/o/${item.slug}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden bg-forest/10">
                    {cover ? (
                      <img
                        src={cover}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-forest to-leaf/80" />
                    )}
                  </div>
                  <p className="mt-4 text-[13px] font-semibold uppercase tracking-wide text-leaf">
                    {item.sector || 'Industrie'}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-forest group-hover:underline group-hover:underline-offset-4">
                    {item.name}
                  </h2>
                  <p className="mt-1 text-[15px] text-ink/55">
                    {[item.city, item.region].filter(Boolean).join(' · ') || 'Togo'}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
