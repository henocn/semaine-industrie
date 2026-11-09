import { useState, type FormEvent } from 'react'
import { registerParticipation } from '../api/participations'
import { TrackingCodeNotice } from '../components/TrackingCodeNotice'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'
import { PhoneField } from '../components/ui/PhoneField'
import { scrollToTopNow } from '../lib/scroll'
import { MEDIA_PROFILES } from '../data'

/* Nombre minimal de mots pour la couverture (même règle côté serveur ; non affiché, seul « texte trop court » l'est). */
const COVERAGE_MIN_WORDS = 10

/* Compte les mots d'un texte libre. */
function wordCount(value: string) {
  return value.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

const field =
  'w-full rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-energy/30'

/* Demande d'accréditation des médias et créateurs de contenu : une accréditation, valable toute la semaine. */
export default function AccreditationMediasPage() {
  const [sent, setSent] = useState(false)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [coverageError, setCoverageError] = useState<string | null>(null)

  /* Envoie la demande (e-mail, téléphone, média, profil et couverture obligatoires). */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    if (wordCount(String(fd.get('description') || '')) < COVERAGE_MIN_WORDS) {
      setCoverageError('Texte trop court : décrivez un peu plus ce que vous prévoyez de couvrir.')
      return
    }
    setCoverageError(null)
    setLoading(true)
    try {
      const created = await registerParticipation({
        kind: 'media',
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim(),
        phone: String(fd.get('phone') || '').trim() || null,
        description: String(fd.get('description') || '').trim(),
        media_outlet: String(fd.get('media_outlet') || '').trim(),
        media_profile: String(fd.get('media_profile') || ''),
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
      <Seo {...publicSeo('/accreditation-medias')} />
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="animate-rise md:sticky md:top-24 md:self-start">
          <SectionHeader
            level={1}
            title="Accréditation médias et créateurs de contenu"
            lead="Journalistes, photographes, vidéastes et créateurs de contenu : demandez votre accréditation pour couvrir la Semaine de l’industrie, du lundi 16 au dimanche 22 novembre."
          />
          <ul className="mt-6 space-y-2 border-t border-forest/15 pt-5 text-[15px] leading-relaxed text-ink/75">
            <li>Votre QR d’accréditation arrive par e-mail et sur WhatsApp après validation.</li>
          </ul>
        </div>

        {sent ? (
          <div className="self-center rounded-sm border-2 border-sun bg-sage p-6">
            <p className="text-xl text-forest">Merci. Votre demande d’accréditation est enregistrée.</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink/80">
              Elle est en cours de validation. Vous recevrez votre QR par e-mail et sur WhatsApp.
            </p>
            <TrackingCodeNotice code={trackingCode} />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid content-start gap-6 sm:grid-cols-2">
            <Field label="Nom et prénom" className="sm:col-span-2">
              <input required name="name" minLength={2} autoComplete="name" className={field} />
            </Field>
            <Field label="Média, chaîne ou compte" hint="Exemple : Radio Lomé, TVT, ou le nom de votre chaîne." className="sm:col-span-2">
              <input required name="media_outlet" minLength={2} maxLength={160} className={field} />
            </Field>
            <Field label="Profil" className="sm:col-span-2">
              <select required name="media_profile" defaultValue="" className={field}>
                <option value="" disabled>Choisissez votre profil</option>
                {MEDIA_PROFILES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="E-mail">
              <input required type="email" name="email" autoComplete="email" className={field} />
            </Field>
            <Field label="Téléphone" hint="De préférence un numéro WhatsApp.">
              <PhoneField required name="phone" className={field} />
            </Field>
            <Field label="Ce que vous prévoyez de couvrir" error={coverageError || undefined} className="sm:col-span-2">
              <textarea
                required
                name="description"
                rows={3}
                maxLength={2000}
                onChange={() => coverageError && setCoverageError(null)}
                className={`${field} resize-none`}
              />
            </Field>
            {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Envoi…' : 'Demander l’accréditation'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
