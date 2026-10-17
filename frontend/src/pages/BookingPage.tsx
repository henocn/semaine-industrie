import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createBooking, listBookableSites, type BookableSite } from '../api/bookings'
import { WRAP } from '../components/layout/Mark'

const field =
  'mt-2 w-full border-0 border-b border-forest/25 bg-transparent px-0 py-3 text-lg text-ink focus:border-forest focus:outline-none'

/* Page publique / enseignant : réserver une visite d'usine. */
export default function BookingPage() {
  const [sites, setSites] = useState<BookableSite[]>([])
  const [siteId, setSiteId] = useState('')
  const [slotKey, setSlotKey] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    /* Charge les sites labellisés. */
    listBookableSites()
      .then((data) => {
        setSites(data)
        if (data[0]) setSiteId(data[0].id)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
  }, [])

  const selected = useMemo(() => sites.find((s) => s.id === siteId) || null, [sites, siteId])
  const slots = selected?.visit_slots || []

  useEffect(() => {
    if (slots[0]) setSlotKey(`${slots[0].day}|${slots[0].start}|${slots[0].end}`)
    else setSlotKey('')
  }, [siteId, slots])

  /* Envoie la réservation. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected || !slotKey) return
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const [visit_day, visit_start, visit_end] = slotKey.split('|')
    try {
      await createBooking({
        organization_id: selected.id,
        school_name: String(fd.get('school_name') || ''),
        teacher_name: String(fd.get('teacher_name') || ''),
        teacher_email: String(fd.get('teacher_email') || ''),
        teacher_phone: String(fd.get('teacher_phone') || '') || undefined,
        visit_day,
        visit_start,
        visit_end,
        headcount: Number(fd.get('headcount') || 0),
        notes: String(fd.get('notes') || '') || undefined,
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réservation impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="py-16 sm:py-24">
        <div className={`${WRAP} grid gap-14 md:grid-cols-[1fr_1.15fr]`}>
          <div>
            <h1 className="display text-4xl sm:text-5xl">Réserver une visite</h1>
            <p className="mt-6 max-w-md text-lg text-ink/70">
              Enseignants référents : choisissez un site labellisé et un créneau encore disponible.
            </p>
          </div>

          {sent ? (
            <p className="self-center text-xl text-forest">
              Réservation confirmée. Un rappel pourra être envoyé via n8n plus tard.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-8 sm:grid-cols-2">
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Site
                <select
                  required
                  value={siteId}
                  onChange={(e) => setSiteId(e.target.value)}
                  className={field}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.city ? ` — ${s.city}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Créneau
                <select
                  required
                  value={slotKey}
                  onChange={(e) => setSlotKey(e.target.value)}
                  className={field}
                  disabled={slots.length === 0}
                >
                  {slots.length === 0 && <option value="">Aucun créneau déclaré — contactez l’orga</option>}
                  {slots.map((s) => (
                    <option key={`${s.day}-${s.start}`} value={`${s.day}|${s.start}|${s.end}`}>
                      {s.day} {s.start} – {s.end}
                    </option>
                  ))}
                </select>
              </label>

              {selected?.max_visitors && (
                <p className="text-[15px] text-ink/55 sm:col-span-2">
                  Capacité max. du site : {selected.max_visitors} visiteurs / créneau
                </p>
              )}

              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Établissement
                <input required name="school_name" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Enseignant
                <input required name="teacher_name" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                E-mail
                <input required type="email" name="teacher_email" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Téléphone (optionnel)
                <input name="teacher_phone" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Effectif
                <input required type="number" min={1} name="headcount" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Notes
                <textarea name="notes" rows={3} className={`${field} resize-none`} />
              </label>

              {error && <p className="text-[15px] text-red-700 sm:col-span-2">{error}</p>}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading || !siteId || !slotKey}
                  className="bg-forest px-8 py-4 text-[15px] font-semibold text-white hover:bg-ink disabled:opacity-60"
                >
                  {loading ? 'Réservation…' : 'Confirmer la visite'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
  )
}
