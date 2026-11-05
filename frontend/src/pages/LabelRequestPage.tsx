import { useId, useState, type FormEvent } from 'react'
import { createLabelRequest, uploadLabelGallery } from '../api/labels'
import { TrackingCodeNotice } from '../components/TrackingCodeNotice'
import { VisitDaysNote } from '../components/VisitDaysNote'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { LocationField } from '../components/map/LocationField'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'
import { checkGalleryFiles } from '../lib/imageQuality'
import { scrollToTopNow } from '../lib/scroll'
import { PhoneField } from '../components/ui/PhoneField'

const field =
  'w-full rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-energy/30'

/* Page publique de demande de label. Le téléphone est un plus, jamais une condition. */
export default function LabelRequestPage() {
  const [sent, setSent] = useState(false)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const [fileNames, setFileNames] = useState<string[]>([])
  const galleryInputId = useId()

  /* Prévisualise les 3 images choisies et mémorise leurs noms. */
  function onGalleryChange(files: FileList | null) {
    setPreviews((prev) => {
      for (const url of prev) URL.revokeObjectURL(url)
      return []
    })
    if (!files?.length) {
      setFileNames([])
      return
    }
    const list = Array.from(files).slice(0, 3)
    setFileNames(list.map((f) => f.name))
    setPreviews(list.map((f) => URL.createObjectURL(f)))
  }

  /* Soumet le formulaire vers l'API. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (lat == null || lng == null) {
      setError('Placez votre adresse sur la carte.')
      return
    }
    const form = e.currentTarget
    const fd = new FormData(form)
    if (fd.get('contact_opt_in') !== 'on') {
      setError('Vous devez accepter d\'être contacté pour continuer.')
      return
    }
    setLoading(true)
    const productsRaw = String(fd.get('products') || '')
    const products = productsRaw
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)

    try {
      const input = form.elements.namedItem('gallery') as HTMLInputElement
      const files = input.files ? Array.from(input.files) : []
      checkGalleryFiles(files)
      const gallery_urls = await uploadLabelGallery(files)

      const created = await createLabelRequest({
        structure_name: String(fd.get('structure_name') || ''),
        structure_type: 'entreprise',
        sector: String(fd.get('sector') || '') || undefined,
        address: String(fd.get('address') || '') || undefined,
        contact_email: String(fd.get('contact_email') || ''),
        contact_phone: String(fd.get('contact_phone') || '').trim() || undefined,
        contact_opt_in: fd.get('contact_opt_in') === 'on',
        description: String(fd.get('description') || '') || undefined,
        products,
        max_visitors: fd.get('max_visitors') ? Number(fd.get('max_visitors')) : null,
        safety_rules: String(fd.get('safety_rules') || '') || undefined,
        lat,
        lng,
        gallery_urls,
      })
      setTrackingCode(created.tracking_code ?? null)
      setSent(true)
      scrollToTopNow()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="py-14 sm:py-20">
      <Seo {...publicSeo('/label')} />
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="animate-rise md:sticky md:top-24 md:self-start">
          <SectionHeader
            level={1}
            title="Demander le label"
            lead="Industries : déposez votre dossier en ligne. L’équipe valide, puis le kit et la fiche publique suivent."
          />
          <VisitDaysNote audience="industrie" />
        </div>

        {sent ? (
          <div className="self-center rounded-sm border-2 border-sun bg-sage p-6">
            <p className="text-xl text-forest">
              Merci. Votre demande est enregistrée. Vous recevrez la réponse par e-mail et sur WhatsApp.
            </p>
            <TrackingCodeNotice code={trackingCode} />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid content-start gap-6 sm:grid-cols-2">
            <Field label="Nom de l'industrie" className="sm:col-span-2">
              <input required name="structure_name" className={field} />
            </Field>
            <Field label="Secteur d'activité" className="sm:col-span-2">
              <input name="sector" className={field} />
            </Field>
            <div className="sm:col-span-2">
              <LocationField
                lat={lat}
                lng={lng}
                onPick={(a, b) => {
                  setLat(a)
                  setLng(b)
                }}
              />
            </div>

            <div className="sm:col-span-2">
              <p className="text-sm font-semibold text-forest">3 photos en bonne qualité de votre installation ou produits, 4 Mo maximum par photo.</p>
              <div className="mt-1.5">
                <input
                  id={galleryInputId}
                  required
                  name="gallery"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => onGalleryChange(e.target.files)}
                />
                <label
                  htmlFor={galleryInputId}
                  className="inline-flex cursor-pointer items-center border border-forest bg-forest px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-ink"
                >
                  Choisir des photos
                </label>
                <p className="mt-2 text-[13px] text-ink/70" aria-live="polite">
                  {fileNames.length === 0
                    ? 'Aucun fichier choisi'
                    : fileNames.length === 1
                      ? `1 fichier : ${fileNames[0]}`
                      : `${fileNames.length} fichiers : ${fileNames.join(', ')}`}
                </p>
              </div>
              {previews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {previews.map((src) => (
                    <div key={src} className="aspect-[4/3] overflow-hidden bg-sage">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Field label="E-mail">
              <input required type="email" name="contact_email" className={field} />
            </Field>
            <Field label="Téléphone" hint="De préférence un numéro WhatsApp.">
              <PhoneField required name="contact_phone" className={field} />
            </Field>
            <Field label="Capacité max. visiteurs par créneau" className="sm:col-span-2">
              <input type="number" min={1} name="max_visitors" className={field} />
            </Field>
            <Field label="Produits phares" hint="Séparés par des virgules" className="sm:col-span-2">
              <input name="products" placeholder="farine, huile…" className={field} />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea name="description" rows={3} className={`${field} resize-none`} />
            </Field>
            <Field label="Règles de sécurité" className="sm:col-span-2">
              <textarea name="safety_rules" rows={3} className={`${field} resize-none`} />
            </Field>

            <label className="flex items-start gap-3 text-[14px] text-ink/80 sm:col-span-2">
              <input required type="checkbox" name="contact_opt_in" className="mt-1 accent-forest" />
              <span>
                J&apos;accepte d&apos;être contacté pour la suite par e-mail et/ou WhatsApp
                (validation, kit, visites).
              </span>
            </label>

            {error && (
              <p role="alert" className="text-[15px] font-medium text-flag sm:col-span-2">
                {error}
              </p>
            )}

            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer la demande'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
