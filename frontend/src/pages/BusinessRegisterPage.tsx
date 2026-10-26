import { useState, type FormEvent } from 'react'
import { registerParticipant } from '../api/business'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'

const field =
  'w-full rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-energy/30'

/* Inscription publique aux rencontres d'affaires. */
export default function BusinessRegisterPage() {
  const [sent, setSent] = useState(false)
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
    try {
      await registerParticipant({
        kind: String(fd.get('kind') || 'entreprise'),
        contact_name: String(fd.get('contact_name') || '').trim(),
        email: String(fd.get('email') || ''),
        phone: String(fd.get('phone') || '') || undefined,
        sector: String(fd.get('sector') || '') || undefined,
        notes: String(fd.get('notes') || '') || undefined,
        contact_opt_in: true,
      })
      setSent(true)
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
            <div className="mt-6">
              <Button to="/programme#vendredi" variant="link">
                Voir la journée phare
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-6 sm:grid-cols-2">
            <Field label="Profil">
              <select name="kind" className={field} defaultValue="entreprise">
                <option value="entreprise">Entreprise</option>
                <option value="particulier">Particulier</option>
              </select>
            </Field>
            <Field label="Nom et prénom">
              <input required name="contact_name" minLength={2} autoComplete="name" className={field} />
            </Field>
            <Field label="E-mail">
              <input required type="email" name="email" className={field} />
            </Field>
            <Field label="Téléphone" hint="De préférence un numéro WhatsApp.">
              <input name="phone" type="tel" autoComplete="tel" className={field} />
            </Field>
            <Field label="Secteur" className="sm:col-span-2">
              <input name="sector" className={field} />
            </Field>
            <Field label="Motif de demande" className="sm:col-span-2">
              <textarea name="notes" rows={3} className={`${field} resize-none`} />
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
