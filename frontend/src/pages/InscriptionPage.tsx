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

/* Profil choisi ; une université est enregistrée comme établissement (kind « ecole »). */
type Profile = 'ecole' | 'universite' | 'particulier'

const NAME_LABEL: Record<Profile, string> = {
  ecole: "Nom de l'établissement",
  universite: "Nom de l'université",
  particulier: 'Nom et prénom',
}

const DESCRIPTION_LABEL: Record<Profile, string> = {
  ecole: 'Spécialités / séries',
  universite: 'Spécialités / filières',
  particulier: 'Note',
}

/* Inscription publique : école / centre de formation, université ou particulier. */
export default function InscriptionPage() {
  const [profile, setProfile] = useState<Profile>('ecole')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const kind: ParticipationKind = profile === 'particulier' ? 'particulier' : 'ecole'
  const isSchool = kind === 'ecole'

  /* Envoie l'inscription (téléphone obligatoire). */
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
            lead="Écoles, centres de formation, universités ou particuliers : indiquez qui vous êtes. Après validation, le QR du jour J suit."
          />
        </div>

        {sent ? (
          <div className="self-center rounded-sm border-2 border-sun bg-sage p-6">
            <p className="text-xl text-forest">Merci. Votre inscription est enregistrée.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid gap-6 sm:grid-cols-2">
            <Field label="Vous êtes" className="sm:col-span-2">
              <select
                name="kind"
                className={field}
                value={profile}
                onChange={(e) => setProfile(e.target.value as Profile)}
              >
                <option value="ecole">École / centre de formation</option>
                <option value="universite">Université</option>
                <option value="particulier">Particulier</option>
              </select>
            </Field>
            <Field label={NAME_LABEL[profile]} className="sm:col-span-2">
              <input required name="name" minLength={2} className={field} />
            </Field>
            <Field label="E-mail">
              <input type="email" name="email" className={field} />
            </Field>
            <Field label="Téléphone" hint="De préférence un numéro WhatsApp.">
              <input required name="phone" type="tel" minLength={6} autoComplete="tel" className={field} />
            </Field>
            {isSchool && (
              <Field
                label="Effectif souhaité"
                hint="Le nombre de participants sera confirmé par l'organisation, sous réserve des places disponibles."
                className="sm:col-span-2"
              >
                <input name="headcount" type="number" min={1} className={field} />
              </Field>
            )}
            <Field label={DESCRIPTION_LABEL[profile]} className="sm:col-span-2">
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
