import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getParticulierCapacity, registerParticipation } from '../api/participations'
import { TrackingCodeNotice } from '../components/TrackingCodeNotice'
import { VisitDaysNote } from '../components/VisitDaysNote'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'
import { scrollToTopNow } from '../lib/scroll'
import { PhoneField } from '../components/ui/PhoneField'

const field =
  'w-full rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-energy/30'

/* Inscription individuelle : une personne, un QR personnel pour le jour J. */
export default function InscriptionParticulierPage() {
  const [sent, setSent] = useState(false)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [full, setFull] = useState(false)
  const [waitlisted, setWaitlisted] = useState(false)

  /* Prévient avant l'envoi si les places sont toutes prises ; le formulaire reste ouvert. */
  useEffect(() => {
    getParticulierCapacity()
      .then((capacity) => setFull(capacity.full))
      .catch(() => setFull(false))
  }, [])

  /* Envoie l'inscription (téléphone obligatoire). */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const created = await registerParticipation({
        kind: 'particulier',
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim() || null,
        phone: String(fd.get('phone') || '').trim() || null,
        address: String(fd.get('address') || '').trim(),
        description: String(fd.get('description') || '').trim() || null,
        headcount: null,
      })
      setTrackingCode(created.tracking_code ?? null)
      setWaitlisted(Boolean(created.waitlisted))
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
      <Seo {...publicSeo('/inscription-particulier')} />
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="animate-rise md:sticky md:top-24 md:self-start">
          <SectionHeader
            level={1}
            title="Visiter les industries en tant que particulier"
            lead="Étudiant, parent, jeune diplômé ou curieux de l'industrie : inscrivez-vous pour visiter les usines labellisées « Usine ouverte ». Votre QR de visite arrive par e-mail et sur WhatsApp après validation."
          />
          <VisitDaysNote audience="public" />
          <p className="mt-3 text-[15px] leading-relaxed text-red-700">
            Le code de cette inscription est différent de celui que vous avez reçu si vous êtes aussi inscrit aux conférences du Palais des Congrès.
          </p>
          <picture className="contents">
            <source srcSet="/images/inscription-particulier.webp" type="image/webp" />
            <img
              src="/images/inscription-particulier.jpg"
              alt="Silhouette d’une technicienne en bleu de travail et casque, clé en main, dans une exposition sur les métiers de l’industrie"
              loading="lazy"
              width={880}
              height={1168}
              className="mt-8 aspect-[4/3] w-full rounded-sm object-cover object-top md:aspect-[3/4] md:max-w-sm"
            />
          </picture>
        </div>

        {sent ? (
          <div className="self-center rounded-sm border-2 border-sun bg-sage p-6">
            <p className="text-xl text-forest">
              {waitlisted ? 'Merci. Votre inscription aux visites est enregistrée en liste d’attente.' : 'Merci. Votre inscription aux visites d’industries est enregistrée.'}
            </p>
            {waitlisted && (
              <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
                Toutes les places prévues pour les particuliers sont déjà attribuées. Nous vous préviendrons par e-mail et sur WhatsApp dès qu’une place se libère.
              </p>
            )}
            {waitlisted && (
              <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
                En attendant, vous pouvez participer aux{' '}
                <Link to="/journees-au-palais/" className="font-semibold text-forest underline underline-offset-4">
                  rendez-vous au Palais des Congrès
                </Link>
                , du 16 au 18 novembre.
              </p>
            )}
            <TrackingCodeNotice code={trackingCode} />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid content-start gap-6 sm:grid-cols-2">
            <Field label="Nom et prénom" className="sm:col-span-2">
              <input required name="name" minLength={2} autoComplete="name" className={field} />
            </Field>
            <Field label="E-mail">
              <input required type="email" name="email" autoComplete="email" className={field} />
            </Field>
            <Field label="Téléphone" hint="De préférence un numéro WhatsApp.">
              <PhoneField required name="phone" className={field} />
            </Field>
            <Field
              label="Ville Quartier"
              hint="Merci d’indiquer une localisation précise : elle nous permettra de vous affecter une école de départ pour les visites."
              className="sm:col-span-2"
            >
              <input required name="address" minLength={2} maxLength={500} autoComplete="street-address" className={field} />
            </Field>
            <Field label="Ce qui vous intéresse" className="sm:col-span-2">
              <textarea name="description" rows={3} className={`${field} resize-none`} />
            </Field>
            {full && (
              <p className="sm:col-span-2 text-[15px] leading-relaxed text-red-700">
                Les places prévues pour les particuliers sont toutes attribuées. Vous pouvez quand même vous inscrire : votre demande sera placée en liste d’attente et nous vous préviendrons dès qu’une place se libère.
                Vous pouvez aussi participer aux{' '}
                <Link to="/journees-au-palais/" className="font-semibold underline underline-offset-4">
                  rendez-vous au Palais des Congrès
                </Link>
                .
              </p>
            )}
            {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Envoi…' : "M'inscrire"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
