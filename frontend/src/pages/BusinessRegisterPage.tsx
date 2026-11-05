import { useState, type FormEvent } from 'react'
import { registerParticipant } from '../api/business'
import { TrackingCodeNotice } from '../components/TrackingCodeNotice'
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

const MIN_NOTE_WORDS = 30

/* Compte les mots d'un texte. */
function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/* Inscription publique aux rencontres d'affaires. */
export default function BusinessRegisterPage() {
  const [profile, setProfile] = useState('entreprise')
  const [noteWords, setNoteWords] = useState(0)
  const [sent, setSent] = useState(false)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /* Envoie le profil B2B. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    if (fd.get('contact_opt_in') !== 'on') {
      setError('Vous devez accepter d\'être contacté pour continuer.')
      setLoading(false)
      return
    }
    if (countWords(String(fd.get('notes') || '')) < MIN_NOTE_WORDS) {
      setError(`Décrivez votre demande en ${MIN_NOTE_WORDS} mots au moins.`)
      setLoading(false)
      return
    }
    try {
      const created = await registerParticipant({
        kind: profile,
        organization_name: profile === 'entreprise' ? String(fd.get('organization_name') || '').trim() : undefined,
        contact_name: String(fd.get('contact_name') || '').trim(),
        email: String(fd.get('email') || ''),
        phone: String(fd.get('phone') || '') || undefined,
        sector: String(fd.get('sector') || '') || undefined,
        notes: String(fd.get('notes') || '') || undefined,
        contact_opt_in: true,
      })
      setTrackingCode(created.tracking_code ?? null)
      setSent(true)
      scrollToTopNow()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="py-14 sm:py-20">
      <Seo {...publicSeo('/affaires')} />
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="animate-rise md:sticky md:top-24 md:self-start">
          <SectionHeader
            level={1}
            title="Rencontres d’affaires"
            lead="Particuliers ou entreprises : déposez un profil court. L’équipe prépare les rendez-vous d'affaire."
          />
        </div>

        {sent ? (
          <div className="self-center rounded-sm border-2 border-sun bg-sage p-6">
            <p className="text-xl text-forest">
              Merci. Votre profil est enregistré. Vous recevrez le planning après validation.
            </p>
            <TrackingCodeNotice code={trackingCode} />
            <div className="mt-6">
              <Button to="/programme" variant="link">
                Voir le programme
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid content-start gap-6 sm:grid-cols-2">
            <Field label="Profil">
              <select name="kind" className={field} value={profile} onChange={(e) => setProfile(e.target.value)}>
                <option value="entreprise">Entreprise</option>
                <option value="particulier">Particulier</option>
              </select>
            </Field>
            {profile === 'entreprise' && (
              <Field label="Nom de l’entreprise">
                <input required name="organization_name" minLength={2} maxLength={200} autoComplete="organization" className={field} />
              </Field>
            )}
            <Field label="Votre nom et prénom">
              <input required name="contact_name" minLength={2} autoComplete="name" className={field} />
            </Field>
            <Field label="E-mail">
              <input required type="email" name="email" className={field} />
            </Field>
            <Field
              label="Téléphone"
              hint="De préférence un numéro WhatsApp."
              className={profile === 'entreprise' ? 'sm:col-span-2' : ''}
            >
              <PhoneField required name="phone" className={field} />
            </Field>
            <Field label="Secteur d’activité" className="sm:col-span-2">
              <input name="sector" className={field} />
            </Field>
            <Field
              label="Motif de demande"
              hint={`${noteWords} mot${noteWords > 1 ? 's' : ''} sur ${MIN_NOTE_WORDS} minimum`}
              className="sm:col-span-2"
            >
              <textarea
                required
                name="notes"
                rows={4}
                onChange={(e) => setNoteWords(countWords(e.target.value))}
                className={`${field} resize-none`}
              />
            </Field>
            <label className="flex items-start gap-3 text-[14px] text-ink/80 sm:col-span-2">
              <input required type="checkbox" name="contact_opt_in" className="mt-1 accent-forest" />
              <span>
                J&apos;accepte d&apos;être contacté pour la suite par e-mail et/ou WhatsApp
                (validation, rendez-vous).
              </span>
            </label>
            {error && (
              <p role="alert" className="text-[15px] font-medium text-flag sm:col-span-2">
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Envoi…' : 'Déposer mon profil'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
