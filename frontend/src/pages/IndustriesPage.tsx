import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, Navigation } from 'lucide-react'
import { listIndustries, type IndustryCard } from '../api/labels'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'

/* Image commune tant qu'une industrie n'a pas sa propre photo. */
const DEFAULT_IMAGE = '/images/industrie-defaut.jpg'

/* Photo de l'industrie, sinon l'image commune. */
function imageOf(item: IndustryCard) {
  return item.photo_url || item.gallery_urls?.[0] || DEFAULT_IMAGE
}

/* Itinéraire vers l'industrie dans l'application GPS (Google Maps), ou rien sans position. */
function directionsUrl(item: IndustryCard) {
  const lat = Number(item.lat)
  const lng = Number(item.lng)
  if (item.lat == null || item.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

/* Fenêtre d'une industrie : image, nom et description. */
function IndustryDialog({ item, onClose }: { item: IndustryCard; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const gps = directionsUrl(item)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      aria-labelledby="industrie-titre"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-sm bg-white p-0 shadow-xl backdrop:bg-black/50"
    >
      <img src={imageOf(item)} alt="" className="aspect-[3/2] w-full bg-white object-cover" />
      <div className="p-5 sm:p-6">
        <h2 id="industrie-titre" className="font-display text-2xl font-bold text-forest">
          {item.name}
        </h2>
        {item.description && <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{item.description}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {gps && (
            <a
              href={gps}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-forest bg-forest px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-ink"
            >
              <Navigation className="h-4 w-4" aria-hidden="true" />
              Localisation
            </a>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </dialog>
  )
}

/* Annuaire public des industries : cartes, et au clic l'image, le nom et la description. */
export default function IndustriesPage() {
  const [items, setItems] = useState<IndustryCard[]>([])
  const [error, setError] = useState<string | null>(null)
  /* Tant que la liste n'est pas arrivée (et au pré-rendu), pas de message « aucune industrie ». */
  const [loaded, setLoaded] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    listIndustries()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : 'Chargement impossible'))
      .finally(() => setLoaded(true))
  }, [])

  /* L'industrie ouverte vit dans l'adresse (?o=slug) : les anciens liens et QR /o/slug y mènent. */
  const openSlug = searchParams.get('o')
  const open = openSlug ? items.find((item) => item.slug === openSlug) ?? null : null

  /* Ouvre ou ferme la fenêtre d'une industrie. */
  function show(slug: string | null) {
    const next = new URLSearchParams(searchParams)
    if (slug) next.set('o', slug)
    else next.delete('o')
    setSearchParams(next, { replace: true })
  }

  return (
    <main className="py-8 sm:py-12">
      <Seo {...publicSeo('/industrie')} />
      <div className={WRAP}>
        <h1 className="display h2 animate-rise text-center">Industries qui ouvrent leurs portes</h1>

        {error && (
          <p role="alert" className="mt-8 font-medium text-flag">
            {error}
          </p>
        )}
        {loaded && !error && items.length === 0 && (
          <p className="mt-10 text-ink/70">Aucune industrie publiée pour le moment.</p>
        )}

        {items.length > 0 && (
          <ul className="mt-8 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => show(item.slug)}
                  className="group block h-full w-full overflow-hidden rounded-sm border border-energy bg-white text-left transition-colors hover:border-forest focus-visible:outline-offset-4"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-white">
                    <img
                      src={imageOf(item)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                    <span
                      title="Labellisée « Usine ouverte »"
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border-2 border-sun bg-energy text-white shadow-sm"
                    >
                      <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Labellisée « Usine ouverte »</span>
                    </span>
                  </div>
                  <div className="px-4 pb-4 pt-3">
                    <h2 className="font-display text-lg font-bold text-forest group-hover:text-ink">{item.name}</h2>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-[14px] leading-relaxed text-ink/70">{item.description}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && <IndustryDialog key={open.id} item={open} onClose={() => show(null)} />}
    </main>
  )
}
