import { useState, type FormEvent } from 'react'
import { registerParticipation, type ParticipationKind } from '../api/participations'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'

const field =
  'w-full rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-energy/30'

/* Inscription publique : école ou personne particulière. */
export default function InscriptionPage() {
  const [kind, setKind] = useState<ParticipationKind>('ecole')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isSchool = kind === 'ecole'

  /* Envoie l'inscription. Le téléphone reste facultatif. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = e.currentTarget
    const fd = new FormData(form)
    const headcountRaw = String(fd.get('headcount') || '').trim()
    try {
      await registerParticipation({
        kind,
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim() || null,
        phone: String(fd.get('phone') || '').trim() || null,
        description: String(fd.get('description') || '').trim() || null,
        headcount: isSchool && headcountRaw ? Number(headcountRaw) : null,
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="py-14 sm:py-20">
      <Seo {...publicSeo('/inscription')} />
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="animate-rise md:sticky md:top-24 md:self-start">
          <SectionHeader
            level={1}
            eyebrow="Semaine 2026"
            title="S'inscrire"
            lead="Écoles et personnes particulières : indiquez qui vous êtes. Après validation, le QR du jour J suit."
          />
        </div>

        {sent ? (
          <div className="self-center rounded-sm border-2 border-sun bg-sage p-6">
            <p className="text-xl text-forest">Merci. Votre inscription est enregistrée.</p>
            <div className="mt-6">
              <Button to="/programme" variant="link">
                Voir le programme
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-6 sm:grid-cols-2">
            <Field label="Vous êtes" className="sm:col-span-2">
              <select
                name="kind"
                className={field}
                value={kind}
                onChange={(e) => setKind(e.target.value as ParticipationKind)}
              >
                <option value="ecole">École</option>
                <option value="particulier">Personne particulière</option>
              </select>
            </Field>
            <Field label={isSchool ? "Nom de l'établissement" : 'Nom et prénom'} className="sm:col-span-2">
              <input required name="name" minLength={2} className={field} />
            </Field>
            <Field label="E-mail">
              <input type="email" name="email" className={field} />
            </Field>
            <Field label="Téléphone" optional hint="De préférence un numéro WhatsApp.">
              <input name="phone" type="tel" autoComplete="tel" className={field} />
            </Field>
            {isSchool && (
              <Field label="Effectif de participation" className="sm:col-span-2">
                <input name="headcount" type="number" min={1} className={field} />
              </Field>
            )}
            <Field label={isSchool ? 'Filière/Série' : 'Note'} className="sm:col-span-2">
              <textarea name="description" rows={3} className={`${field} resize-none`} />
            </Field>
            {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Envoi…' : "S'inscrire"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
