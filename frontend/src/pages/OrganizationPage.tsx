import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrganizationBySlug, type Organization } from '../api/labels'
import { Mark, WRAP } from '../components/layout/Mark'

/* Page publique fiche entreprise / école (ouverte via QR). */
export default function OrganizationPage() {
  const { slug = '' } = useParams()
  const [org, setOrg] = useState<Organization | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    /* Charge la fiche depuis l'API. */
    async function load() {
      try {
        const data = await getOrganizationBySlug(slug)
        if (!cancelled) setOrg(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fiche introuvable')
      }
    }
    if (slug) load()
    return () => { cancelled = true }
  }, [slug])

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur">
        <div className={`${WRAP} flex h-16 items-center justify-between`}>
          <Link to="/" className="flex items-center gap-2.5 text-forest">
            <Mark className="h-6 w-auto text-leaf" />
            <span className="text-[15px] font-semibold [font-stretch:112%]">Semaine de l’industrie 2026</span>
          </Link>
          <Link to="/label" className="text-[15px] text-ink/70 hover:text-forest">Demander le label</Link>
        </div>
      </header>

      <main className="py-16 sm:py-24">
        <div className={WRAP}>
          {error && <p className="text-lg text-forest">{error}</p>}
          {!error && !org && <p className="text-lg text-ink/60">Chargement…</p>}
          {org && (
            <div className="grid gap-12 md:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="text-[15px] font-semibold text-leaf">
                  {org.label_code ? `Label ${org.label_code}` : 'Structure labellisée'}
                </p>
                <h1 className="display mt-3 text-4xl sm:text-5xl">{org.name}</h1>
                <p className="mt-4 text-lg text-ink/65">
                  {[org.type === 'ecole' ? 'École' : 'Entreprise', org.sector, org.city, org.region]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {org.description && (
                  <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink/80">{org.description}</p>
                )}
                {org.products?.length > 0 && (
                  <ul className="mt-8 flex flex-wrap gap-2">
                    {org.products.map((p) => (
                      <li key={p} className="border border-forest/20 px-3 py-1.5 text-[15px] text-forest">{p}</li>
                    ))}
                  </ul>
                )}
              </div>
              <aside className="border-t border-forest/15 pt-6 md:border-t-0 md:border-l md:pl-10 md:pt-0">
                <h2 className="text-lg font-semibold text-forest">Visites</h2>
                {org.max_visitors && (
                  <p className="mt-3 text-ink/70">Jusqu’à {org.max_visitors} visiteurs par créneau</p>
                )}
                {org.visit_slots?.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-[15px] text-ink/80">
                    {org.visit_slots.map((s) => (
                      <li key={`${s.day}-${s.start}`}>
                        <span className="font-semibold text-forest">{s.day}</span> {s.start} – {s.end}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-ink/55">Créneaux à confirmer avec le référent.</p>
                )}
                {org.safety_rules && (
                  <>
                    <h2 className="mt-10 text-lg font-semibold text-forest">Sécurité</h2>
                    <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/75">{org.safety_rules}</p>
                  </>
                )}
                {org.contact_name && (
                  <p className="mt-10 text-[15px] text-ink/60">Référent : {org.contact_name}</p>
                )}
              </aside>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
