import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOrganizationBySlug, type Organization } from '../api/labels'
import { WRAP } from '../components/layout/Mark'

/* Galerie utile (photo_url + gallery_urls). */
function galleryOf(org: Organization) {
  const fromGallery = Array.isArray(org.gallery_urls) ? org.gallery_urls.filter(Boolean) : []
  if (fromGallery.length) return fromGallery
  return org.photo_url ? [org.photo_url] : []
}

/* Page publique fiche entreprise / école (ouverte via QR ou Industrie). */
export default function OrganizationPage() {
  const { slug = '' } = useParams()
  const [org, setOrg] = useState<Organization | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeImg, setActiveImg] = useState(0)

  useEffect(() => {
    let cancelled = false
    /* Charge la fiche depuis l'API. */
    async function load() {
      try {
        const data = await getOrganizationBySlug(slug)
        if (!cancelled) {
          setOrg(data)
          setActiveImg(0)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Fiche introuvable')
      }
    }
    if (slug) load()
    return () => { cancelled = true }
  }, [slug])

  const images = org ? galleryOf(org) : []
  const isIndustry = org?.type === 'entreprise'

  return (
    <main className="pb-20">
      {error && (
        <div className={`${WRAP} py-16`}>
          <p className="text-lg text-forest">{error}</p>
          <Link to="/industrie" className="mt-6 inline-block text-forest underline underline-offset-4">
            Retour aux industries
          </Link>
        </div>
      )}
      {!error && !org && (
        <div className={`${WRAP} py-16`}>
          <p className="text-lg text-ink/60">Chargement…</p>
        </div>
      )}

      {org && (
        <>
          {isIndustry && images.length > 0 ? (
            <div className="relative h-[min(70vh,640px)] w-full overflow-hidden bg-forest">
              <img
                src={images[activeImg] || images[0]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-forest/35 to-transparent" />
              <div className={`absolute inset-x-0 bottom-0 ${WRAP} pb-10 pt-24`}>
                <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-sun">
                  {org.label_code ? `Label ${org.label_code}` : 'Industrie labellisée'}
                </p>
                <h1 className="display mt-3 max-w-3xl text-4xl text-white sm:text-5xl md:text-6xl">
                  {org.name}
                </h1>
                <p className="mt-3 text-lg text-white/75">
                  {[org.sector, org.city, org.region].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ) : (
            <div className={`${WRAP} pt-16 sm:pt-24`}>
              <p className="text-[15px] font-semibold text-leaf">
                {org.label_code ? `Label ${org.label_code}` : 'Structure labellisée'}
              </p>
              <h1 className="display mt-3 text-4xl sm:text-5xl">{org.name}</h1>
              <p className="mt-4 text-lg text-ink/65">
                {[org.type === 'ecole' ? 'École' : 'Entreprise', org.sector, org.city, org.region]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
          )}

          <div className={`${WRAP} mt-12 grid gap-12 md:grid-cols-[1.2fr_1fr]`}>
            <div>
              {isIndustry && images.length > 1 && (
                <div className="mb-10 grid grid-cols-3 gap-2">
                  {images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActiveImg(i)}
                      className={`aspect-[4/3] overflow-hidden ${i === activeImg ? 'outline outline-2 outline-offset-2 outline-forest' : ''}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {org.description && (
                <p className="max-w-2xl text-lg leading-relaxed text-ink/80">{org.description}</p>
              )}
              {org.products?.length > 0 && (
                <ul className="mt-8 flex flex-wrap gap-x-4 gap-y-2">
                  {org.products.map((p) => (
                    <li key={p} className="text-[15px] text-forest before:mr-2 before:text-leaf before:content-['·'] first:before:content-none">
                      {p}
                    </li>
                  ))}
                </ul>
              )}

              {isIndustry && (
                <Link
                  to="/industrie"
                  className="mt-10 inline-block text-[15px] font-medium text-forest underline decoration-forest/30 underline-offset-4"
                >
                  Toutes les industries
                </Link>
              )}
            </div>

            <aside className="border-t border-forest/15 pt-6 md:border-t-0 md:border-l md:border-forest/15 md:pl-10 md:pt-0">
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
                <p className="mt-3 text-ink/55">Créneaux arrangés par l’organisation.</p>
              )}
              {org.safety_rules && (
                <>
                  <h2 className="mt-10 text-lg font-semibold text-forest">Sécurité</h2>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/75">{org.safety_rules}</p>
                </>
              )}
            </aside>
          </div>
        </>
      )}
    </main>
  )
}
