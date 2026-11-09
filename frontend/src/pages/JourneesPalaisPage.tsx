import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { PALAIS_DAYS } from '../data'

const field =
  'w-full rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-energy/30'

/* Journées demandées dans l'adresse (?jour=16 ou ?jour=16,18), limitées aux journées connues. */
function daysFromQuery(raw: string | null) {
  const asked = String(raw || '').split(',').map((v) => Number(v.trim()))
  return PALAIS_DAYS.map((d) => d.n).filter((n) => asked.includes(n))
}

/* Inscription des particuliers aux journées du Palais des Congrès : un code, un QR, les journées cochées. */
export default function JourneesPalaisPage() {
  const [searchParams] = useSearchParams()
  const [days, setDays] = useState<number[]>([])
  const [sent, setSent] = useState(false)
  const [trackingCode, setTrackingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /* Coche la journée venue du programme, après l'affichage (le pré-rendu ne connaît pas l'adresse). */
  const jour = searchParams.get('jour')
  useEffect(() => {
    const asked = daysFromQuery(jour)
    if (asked.length) setDays(asked)
  }, [jour])

  /* Coche ou décoche une journée. */
  function toggle(n: number) {
    setError(null)
    setDays((current) => (current.includes(n) ? current.filter((d) => d !== n) : [...current, n].sort((a, b) => a - b)))
  }

  /* Envoie l'inscription (téléphone et au moins une journée obligatoires). */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!days.length) {
      setError('Choisissez au moins une journée.')
      return
    }
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const created = await registerParticipation({
        kind: 'palais',
        name: String(fd.get('name') || '').trim(),
        email: String(fd.get('email') || '').trim() || null,
        phone: String(fd.get('phone') || '').trim() || null,
        description: String(fd.get('description') || '').trim() || null,
        palais_days: days,
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

  const chosen = PALAIS_DAYS.filter((d) => days.includes(d.n))

  return (
    <main className="py-14 sm:py-20">
      <Seo {...publicSeo('/journees-au-palais')} />
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="animate-rise md:sticky md:top-24 md:self-start">
          <SectionHeader
            level={1}
            title="Assister aux conférences et panels du Palais des Congrès"
            lead="Du lundi 16 au mercredi 18 novembre, la Semaine de l’industrie tient ses rendez-vous au Palais des Congrès de Lomé. Cochez une ou plusieurs journées : vous recevez un seul code et un seul QR, valable pour les journées choisies."
          />
          <ul className="mt-6 space-y-2 border-t border-forest/15 pt-5 text-[15px] leading-relaxed text-ink/75">
            <li className="text-red-700">Le code de cette inscription est différent de celui que vous avez reçu si vous êtes aussi inscrit aux visites d’industries.</li>
            <li>Les places sont limitées.</li>
          </ul>
        </div>

        {sent ? (
          <div className="self-center rounded-sm border-2 border-sun bg-sage p-6">
            <p className="text-xl text-forest">Merci. Votre inscription est enregistrée.</p>
            {chosen.length > 0 && (
              <ul className="mt-3 space-y-1 text-[15px] text-ink/80">
                {chosen.map((d) => (
                  <li key={d.n}>
                    <span className="font-semibold text-forest">{d.label}</span> : {d.title}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[15px] leading-relaxed text-ink/80">
              Elle est en cours de validation. Vous recevrez votre QR par e-mail et sur WhatsApp.
            </p>
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
            <Field label="Ce qui vous amène" optional className="sm:col-span-2">
              <textarea name="description" rows={2} maxLength={2000} className={`${field} resize-none`} />
            </Field>

            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-semibold text-forest">Choisissez vos journées</legend>
              <div className="mt-3 grid gap-3">
                {PALAIS_DAYS.map((d) => {
                  const checked = days.includes(d.n)
                  return (
                    <label
                      key={d.n}
                      className={`flex cursor-pointer gap-3 rounded-sm border bg-white p-4 transition-colors ${
                        checked ? 'border-forest' : 'border-forest/25 hover:border-forest/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="palais_days"
                        value={d.n}
                        checked={checked}
                        onChange={() => toggle(d.n)}
                        className="mt-1 h-5 w-5 shrink-0 accent-forest"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-forest">
                          {d.label}, {d.title.charAt(0).toLowerCase()}{d.title.slice(1)}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-ink/60">
                          {d.place}, {d.hours}
                        </span>
                        <span className="mt-2 block text-[14px] leading-relaxed text-ink/75">{d.text}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            {error && <p role="alert" className="sm:col-span-2 text-sm text-red-700">{error}</p>}
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
