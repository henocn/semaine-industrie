import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getOrganizationBySlug, type Organization } from '../api/labels'
import { Seo } from '../components/Seo'
import { SITE_URL } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

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

  const ogImage = images[0]
    ? (images[0].startsWith('http') ? images[0] : `${SITE_URL}${images[0]}`)
    : undefined

  return (
    <main className="pb-20">
      {org && (
        <Seo
          title={org.name}
          description={
            org.description
            || [org.sector, org.city, org.region].filter(Boolean).join(' · ')
            || `Fiche ${org.type === 'ecole' ? 'établissement' : 'industrie'} labellisée.`
          }
          path={`/o/${org.slug}`}
          image={ogImage}
        />
      )}
      {error && (
        <div className={`${WRAP} py-16`}>
          <p className="text-lg text-forest">{error}</p>
          <div className="mt-6">
            <Button to="/industrie" variant="link">
              Retour aux industries
            </Button>
          </div>
        </div>
      )}
      {!error && !org && (
        <div className={`${WRAP} py-16`}>
          <p className="text-lg text-ink/70">Chargement…</p>
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
              <div className="hero-overlay" />
              <div className={`absolute inset-x-0 bottom-0 ${WRAP} animate-rise pb-10 pt-24`}>
                <p className="hero-copy ui-eyebrow !text-sun">Industrie labellisée</p>
                <h1 className="hero-copy display mt-4 max-w-3xl text-4xl text-white sm:text-5xl md:text-6xl">
                  {org.name}
                </h1>
                <p className="hero-copy mt-3 text-lg text-white">
                  {[org.sector, org.city, org.region].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          ) : (
            <div className={`${WRAP} animate-rise pt-16 sm:pt-24`}>
              <SectionHeader
                level={1}
                eyebrow="Structure labellisée"
                title={org.name}
                lead={[org.type === 'ecole' ? 'École' : 'Entreprise', org.sector, org.city, org.region]
                  .filter(Boolean)
                  .join(' · ')}
              />
            </div>
          )}

          <div className="relative z-10 bg-white">
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
                <p className="max-w-2xl text-lg leading-relaxed text-ink/85">{org.description}</p>
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
                <div className="mt-10">
                  <Button to="/industrie" variant="link">
                    Toutes les industries
                  </Button>
                </div>
              )}
            </div>

            <aside className="border-t border-forest/15 pt-6 md:border-t-0 md:border-l md:border-forest/15 md:pl-10 md:pt-0">
              <h2 className="text-lg font-semibold text-forest">Visites</h2>
              {org.max_visitors && (
                <p className="mt-3 text-ink/75">Jusqu’à {org.max_visitors} visiteurs par créneau</p>
              )}
              {org.visit_slots?.length > 0 ? (
                <ul className="mt-4 space-y-2 text-[15px] text-ink/80">
                  {org.visit_slots.map((s) => (
                    <li key={`${s.day}-${s.start}`}>
                      <span className="font-semibold text-forest">{s.day}</span> {s.start} à {s.end}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-ink/70">Créneaux arrangés par l’organisation.</p>
              )}
              {org.safety_rules && (
                <>
                  <h2 className="mt-10 text-lg font-semibold text-forest">Sécurité</h2>
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-ink/75">{org.safety_rules}</p>
                </>
              )}
            </aside>
          </div>
          </div>
        </>
      )}
    </main>
  )
}
