import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listIndustries, type IndustryCard } from '../api/labels'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Image commune tant qu'une industrie n'a pas sa propre photo. */
const DEFAULT_IMAGE = '/images/industrie-defaut.jpg'

/* Photo de l'industrie, sinon l'image commune. */
function imageOf(item: IndustryCard) {
  return item.photo_url || item.gallery_urls?.[0] || DEFAULT_IMAGE
}

/* Fenêtre d'une industrie : image, nom et description. */
function IndustryDialog({ item, onClose }: { item: IndustryCard; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

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
        <div className="mt-6">
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
    <main className="py-14 sm:py-20">
      <Seo {...publicSeo('/industrie')} />
      <div className={WRAP}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            title="Les industries labellisées"
            lead="Les industries togolaises labellisées « Usine ouverte » pour la Semaine de l’industrie 2026, de la zone portuaire de Lomé à la Plateforme d’Adétikopé (PIA)."
          />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button to="/carte/" variant="link">
              Voir sur la carte
            </Button>
            <Button to="/label/" variant="link">
              Demander le label
            </Button>
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-8 font-medium text-flag">
            {error}
          </p>
        )}
        {loaded && !error && items.length === 0 && (
          <p className="mt-10 text-ink/70">Aucune industrie publiée pour le moment.</p>
        )}

        {items.length > 0 && (
          <ul className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => show(item.slug)}
                  className="group block w-full text-left focus-visible:outline-offset-4"
                >
                  <div className="aspect-[3/2] overflow-hidden rounded-sm border border-forest/10 bg-white">
                    <img
                      src={imageOf(item)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h2 className="mt-3 border-t-2 border-sun pt-3 font-display text-xl font-bold text-forest group-hover:text-ink">
                    {item.name}
                  </h2>
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
