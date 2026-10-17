import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listIndustries, type IndustryCard } from '../api/labels'
import { WRAP } from '../components/layout/Mark'

/* Annuaire public des industries — tableau compact, détail au clic. */
export default function IndustriesPage() {
  const [items, setItems] = useState<IndustryCard[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listIndustries()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [])

  return (
    <main className="py-12 sm:py-16">
      <div className={WRAP}>
        <h1 className="display text-4xl sm:text-5xl">Industrie</h1>
        <p className="mt-3 max-w-xl text-lg text-ink/65">
          Entreprises labellisées. Cliquez une ligne pour ouvrir la fiche.
        </p>

        {error && <p className="mt-6 text-red-700">{error}</p>}
        {!error && items.length === 0 && (
          <p className="mt-10 text-ink/50">Aucune industrie publiée pour le moment.</p>
        )}

        {items.length > 0 && (
          <div className="mt-8 overflow-x-auto border border-forest/15">
            <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
              <thead>
                <tr className="border-b border-forest/15 bg-sage/50">
                  <th className="px-4 py-3 font-semibold text-forest">#</th>
                  <th className="px-4 py-3 font-semibold text-forest">Entreprise</th>
                  <th className="px-4 py-3 font-semibold text-forest">Secteur</th>
                  <th className="px-4 py-3 font-semibold text-forest">Lieu</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className="border-b border-forest/10 last:border-0 hover:bg-sage/40">
                    <td className="px-4 py-3 text-ink/45">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/o/${item.slug}`}
                        className="font-semibold text-forest underline underline-offset-2"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink/70">{item.sector || '—'}</td>
                    <td className="px-4 py-3 text-ink/70">
                      {[item.city, item.region].filter(Boolean).join(' · ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
