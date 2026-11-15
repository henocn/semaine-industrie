import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import {
  bookVisitSlot,
  getVisitSlots,
  lookupVisitSlot,
  type VisitSlot,
  type VisitSlotAvailability,
  type VisitSlotBooking,
} from '../api/visitSlots'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
import { readQrImage, trackingCodeFrom } from '../lib/readQrImage'


const DAYS = ['Jeudi 19 novembre', 'Vendredi 20 novembre']

/* Départ choisi, en clair. */
function SlotSummary({ slot }: { slot: VisitSlot }) {
  return (
    <p className="text-xl text-forest">
      {slot.day}, {slot.period.toLowerCase()}
      <span className="mt-1 block text-[16px] font-semibold">Départ : {slot.place}</span>
    </p>
  )
}

/* Réservation du départ des visites d'usines par un particulier validé (code de suivi ou QR). */
export default function ReservationVisitePage() {
  const [params] = useSearchParams()
  const [input, setInput] = useState(() => trackingCodeFrom(params.get('code') || ''))
  const [person, setPerson] = useState<VisitSlotBooking | null>(null)
  const [slots, setSlots] = useState<VisitSlotAvailability[] | null>(null)
  const [open, setOpen] = useState(true)
  const [choice, setChoice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /* Places restantes, rafraîchies toutes les 20 secondes. */
  const loadSlots = useCallback(async () => {
    try {
      const data = await getVisitSlots()
      setSlots(data.slots)
      setOpen(data.open)
    } catch {
      /* Le prochain rafraîchissement réessaiera. */
    }
  }, [])

  useEffect(() => {
    void loadSlots()
    const timer = window.setInterval(() => void loadSlots(), 20_000)
    return () => window.clearInterval(timer)
  }, [loadSlots])

  /* Vérifie le code : inscription aux visites, validée. */
  async function check(raw: string) {
    const code = trackingCodeFrom(raw)
    if (!code) return
    setInput(code)
    setBusy(true)
    setError(null)
    setPerson(null)
    setChoice('')
    try {
      setPerson(await lookupVisitSlot(code))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code introuvable. Vérifiez-le et réessayez.')
    } finally {
      setBusy(false)
    }
  }

  /* Arrivée depuis Mon espace (?code=…) : le code est vérifié tout de suite. */
  const initialCode = params.get('code')
  useEffect(() => {
    if (initialCode) void check(initialCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode])

  function onCheck(e: FormEvent) {
    e.preventDefault()
    void check(input)
  }

  /* Photo ou capture du QR : on lit le code et on le vérifie. */
  async function onQrFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const text = await readQrImage(file)
      if (!text) {
        setError('Aucun QR lisible sur cette image. Essayez une image plus nette, ou saisissez le code.')
        setBusy(false)
        return
      }
      setBusy(false)
      await check(text)
    } catch {
      setError('Image illisible. Essayez une autre image, ou saisissez le code.')
      setBusy(false)
    }
  }

  /* Réserve le départ choisi. */
  async function onBook(e: FormEvent) {
    e.preventDefault()
    if (!person || !choice) return
    setBusy(true)
    setError(null)
    try {
      setPerson(await bookVisitSlot(person.code, choice))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réservation impossible. Réessayez.')
    } finally {
      setBusy(false)
      void loadSlots()
    }
  }

  const booked = person?.slot ?? null

  return (
    <main className="py-14 sm:py-20">
      <Seo {...publicSeo('/visites')} />
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="animate-rise md:sticky md:top-24 md:self-start">
          <SectionHeader
            level={1}
            title="Confirmez votre départ pour les visites d’usines"
            lead="Votre inscription aux visites est validée ? Choisissez votre demi-journée et votre lieu de rencontre pour le jeudi 19 ou le vendredi 20 novembre."
          />
          {/* <ul className="mt-6 space-y-2 border-t border-forest/15 pt-5 text-[15px] leading-relaxed text-ink/75">
            <li>50 places par demi-journée et par lieu de rencontre.</li>
            <li>Une seule réservation par inscription.</li>
            <li>Les heures précises, les entreprises visitées et les consignes sont annoncées dans le groupe WhatsApp.</li>
          </ul> */}
        </div>

        {booked && person ? (
          <div className="self-start rounded-sm border-2 border-sun bg-sage p-6">
            {/* <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-forest/70">
              {person.already === false ? 'Votre place est réservée' : 'Votre réservation'}
            </p> */}
            <p className="text-[15px] text-ink/80">{person.name} · {person.code}</p>
            <div className="mt-4">
              <SlotSummary slot={booked} />
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-ink/80">
              Gardez votre QR de participation : il est demandé au départ. Rejoignez le groupe WhatsApp si ce n’est pas encore fait : toutes les autres informations y seront communiquées.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {person.group && (
                <a href={person.group} target="_blank" rel="noopener noreferrer" className="ui-btn-primary">
                  Rejoindre le groupe WhatsApp
                </a>
              )}
            </div>
            {/* <p className="mt-4 text-[13px] text-ink/60">
              Un changement ou un empêchement ? Écrivez à l’organisation dans le groupe pour modifier ou libérer votre place.
            </p> */}
          </div>
        ) : (
          <div className="grid content-start gap-8">
            <section>
              <h2 className="text-sm font-semibold text-forest">1. Votre inscription</h2>
              <form onSubmit={onCheck} className="mt-3 flex flex-wrap items-end gap-3">
                <label className="min-w-[12rem] flex-1 text-[14px] font-medium text-forest">
                  Code de suivi
                  <input
                    required
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value.toUpperCase())
                      setPerson(null)
                    }}
                    placeholder="Code reçu à l’inscription"
                    autoComplete="off"
                    maxLength={30}
                    className="mt-1 w-full border border-forest/40 bg-white px-3 py-2.5 font-mono text-[15px] tracking-wide focus:border-forest focus:outline-none"
                  />
                </label>
                <button type="submit" disabled={busy} className="ui-btn-primary min-h-11!">
                  {busy && !person ? 'Vérification…' : 'Vérifier'}
                </button>
              </form>
              <div className="mt-3 text-[14px] text-ink/70">
                Ou{' '}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="font-semibold text-forest underline underline-offset-2"
                >
                  importez votre QR
                </button>{' '}
                (photo ou capture d’écran) pour lire le code.
                <input ref={fileRef} type="file" accept="image/*" onChange={onQrFile} className="hidden" />
              </div>
              {error && !person && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
              {person && (
                <p className="mt-3 text-[15px] text-forest">
                  Inscription validée : <span className="font-semibold">{person.name}</span>
                </p>
              )}
            </section>

            <form onSubmit={onBook}>
              <h2 className="text-sm font-semibold text-forest">2. Votre départ</h2>
              {!open && (
                <p className="mt-3 border-l-2 border-sun bg-sage px-3 py-2 text-[14px] text-ink/80">
                  Les réservations ne sont pas encore ouvertes. L’ouverture sera annoncée dans le groupe WhatsApp.
                </p>
              )}
              {!slots ? (
                <p className="mt-3 text-[14px] text-ink/60">Chargement des départs…</p>
              ) : (
                DAYS.map((day) => (
                  <fieldset key={day} className="mt-4">
                    <legend className="text-[15px] font-semibold text-ink">{day}</legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {slots.filter((s) => s.day === day).map((s) => {
                        const full = s.remaining <= 0
                        const disabled = !open || !person || full || busy
                        const checked = choice === s.id
                        return (
                          <label
                            key={s.id}
                            className={`flex gap-3 rounded-sm border p-3 transition-colors ${
                              full ? 'border-ink/15 bg-ink/5' : checked ? 'border-forest bg-white' : 'border-forest/25 bg-white'
                            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-forest/60'} ${disabled && !full ? 'opacity-60' : ''}`}
                          >
                            <input
                              type="radio"
                              name="slot"
                              value={s.id}
                              required
                              checked={checked}
                              disabled={disabled}
                              onChange={() => setChoice(s.id)}
                              className="mt-1 h-4 w-4 shrink-0 accent-forest"
                            />
                            <span className="min-w-0 flex-1">
                              <span className={`block font-semibold ${full ? 'text-ink/45' : 'text-forest'}`}>{s.period}</span>
                              <span className={`block text-[14px] ${full ? 'text-ink/45' : 'text-ink/75'}`}>{s.place}</span>
                              {full ? (
                                <span className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-red-700">
                                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                  Plein · {s.capacity}/{s.capacity}
                                </span>
                              ) : (
                                <span className="mt-1 block text-[13px] text-ink/55">
                                  {s.remaining} place{s.remaining > 1 ? 's' : ''} disponible{s.remaining > 1 ? 's' : ''}
                                </span>
                              )}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </fieldset>
                ))
              )}

              {error && person && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
              <div className="mt-5">
                <Button type="submit" disabled={busy || !open || !person || !choice}>
                  {busy && person ? 'Réservation…' : 'Confirmer ma place'}
                </Button>
                {!person && (
                  <p className="mt-2 text-[13px] text-ink/55">Vérifiez d’abord votre code de suivi.</p>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  )
}
