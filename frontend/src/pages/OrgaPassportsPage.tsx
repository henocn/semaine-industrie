import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { listBookableSites, type BookableSite } from '../api/bookings'
import { createGroupPassport, createPassportBatch, scanPassport, type Passport } from '../api/passports'
import { getStoredUser } from '../api/auth'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Backoffice passeports : groupe (parcours commun) + tampon + lot individuel optionnel. */
export default function OrgaPassportsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [sites, setSites] = useState<BookableSite[]>([])
  const [schools, setSchools] = useState<BookableSite[]>([])
  const [groupCard, setGroupCard] = useState<(Passport & { url?: string; qr_data_url?: string }) | null>(null)
  const [batch, setBatch] = useState<Array<{ code: string; url: string; qr_data_url: string }>>([])
  const [showIndividual, setShowIndividual] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'orga') {
      navigate('/login')
      return
    }
    Promise.all([listBookableSites('entreprise'), listBookableSites('ecole')])
      .then(([s, e]) => {
        setSites(s)
        setSchools(e)
      })
      .catch(() => undefined)
  }, [navigate, user?.id, user?.role])

  /* Crée ou retrouve le passeport de groupe de l'école. */
  async function onGroup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBatch([])
    const fd = new FormData(e.currentTarget)
    const schoolId = String(fd.get('school_organization_id') || '')
    const headcountRaw = fd.get('headcount')
    try {
      const data = await createGroupPassport({
        school_organization_id: schoolId || undefined,
        class_label: String(fd.get('class_label') || '') || undefined,
        headcount: headcountRaw ? Number(headcountRaw) : undefined,
      })
      setGroupCard(data)
      setMsg(`Passeport de groupe ${data.code} — un seul tampon par site pour toute la classe`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  /* Tamponne un site sur le passeport (groupe ou individuel). */
  async function onScan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMsg(null)
    const form = e.currentTarget
    const fd = new FormData(form)
    try {
      await scanPassport({
        code: String(fd.get('code') || ''),
        organization_id: String(fd.get('organization_id') || ''),
        scanned_by: user ? `${user.first_name} ${user.last_name}` : undefined,
      })
      setMsg('Site tamponné (valable pour tout le groupe)')
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan impossible')
    }
  }

  /* Lot individuel — hors parcours scolaire groupé. */
  async function onBatch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setGroupCard(null)
    const fd = new FormData(e.currentTarget)
    try {
      const data = await createPassportBatch({
        count: Number(fd.get('count') || 10),
        school_name: String(fd.get('school_name') || '') || undefined,
        class_label: String(fd.get('class_label') || '') || undefined,
      })
      setBatch(data.items)
      setMsg(`${data.count} passeports individuels générés`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <OrgaShell
      title="Passeports"
      actions={
        <button
          type="button"
          onClick={() => window.print()}
          className="orga-btn print:hidden"
          disabled={!groupCard && batch.length === 0}
        >
          Imprimer
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700 print:hidden">{error}</p>}
      {msg && <p className="mb-4 text-[14px] text-forest print:hidden">{msg}</p>}

      <p className="mb-4 max-w-2xl text-[14px] text-ink/60 print:hidden">
        Pour les visites groupées : un seul code QR par école (ou classe). Un tampon par site
        compte pour tout le parcours — pas besoin d’un passeport par élève.
      </p>

      <div className="grid gap-4 xl:grid-cols-2 print:hidden">
        <section className="orga-panel">
          <h2 className="text-[15px] font-semibold text-forest">Passeport de groupe</h2>
          <form onSubmit={onGroup} className="mt-4 grid gap-3">
            <select required name="school_organization_id" className="orga-input">
              <option value="">Établissement…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input name="class_label" className="orga-input" placeholder="Classe (optionnel, ex. 3e A)" />
            <input name="headcount" type="number" min={1} max={5000} className="orga-input" placeholder="Effectif (optionnel)" />
            <button type="submit" className="orga-btn">Créer / retrouver le QR</button>
          </form>
        </section>

        <section className="orga-panel">
          <h2 className="text-[15px] font-semibold text-forest">Tamponner un site</h2>
          <p className="mt-1 text-[13px] text-ink/50">
            Un scan = tout le groupe a fait ce site. À l’arrangement d’une visite, le tampon est aussi posé automatiquement.
          </p>
          <form key={groupCard?.code || 'scan'} onSubmit={onScan} className="mt-4 grid gap-3">
            <input required name="code" className="orga-input uppercase" placeholder="Code passeport" defaultValue={groupCard?.code || ''} />
            <select required name="organization_id" className="orga-input">
              <option value="">Site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button type="submit" className="orga-btn">Tamponner</button>
          </form>
        </section>
      </div>

      {groupCard?.qr_data_url && (
        <section className="mt-4 orga-panel print:shadow-none">
          <article className="mx-auto max-w-sm break-inside-avoid border border-black bg-white p-6 text-center print:border print:bg-white">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-forest">Passeport de groupe</p>
            <img src={groupCard.qr_data_url} alt={groupCard.code} className="mx-auto mt-3 h-40 w-40" />
            <p className="mt-3 text-xl font-semibold text-forest">{groupCard.code}</p>
            <p className="mt-1 text-[14px] text-ink/70">{groupCard.school_name}</p>
            {(groupCard.class_label || groupCard.headcount) && (
              <p className="mt-1 text-[13px] text-ink/50">
                {[groupCard.class_label, groupCard.headcount ? `${groupCard.headcount} élèves` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            <p className="mt-2 break-all text-[10px] text-ink/40">{groupCard.url}</p>
          </article>
        </section>
      )}

      <div className="mt-6 print:hidden">
        <button
          type="button"
          className="text-[13px] text-ink/45 underline"
          onClick={() => setShowIndividual((v) => !v)}
        >
          {showIndividual ? 'Masquer' : 'Afficher'} les passeports individuels (hors visite groupée)
        </button>
        {showIndividual && (
          <section className="orga-panel mt-3">
            <h2 className="text-[15px] font-semibold text-forest">Lot individuel</h2>
            <form onSubmit={onBatch} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input name="count" type="number" min={1} max={200} defaultValue={12} className="orga-input" placeholder="Nombre" />
              <input name="school_name" className="orga-input" placeholder="École (optionnel)" />
              <input name="class_label" className="orga-input" placeholder="Classe (optionnel)" />
              <button type="submit" className="orga-btn sm:col-span-2">Générer le lot</button>
            </form>
          </section>
        )}
      </div>

      {batch.length > 0 && (
        <section className="mt-4 orga-panel print:shadow-none">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
            {batch.map((item) => (
              <article key={item.code} className="break-inside-avoid border border-black bg-white p-4 text-center print:border print:bg-white">
                <img src={item.qr_data_url} alt={item.code} className="mx-auto h-32 w-32" />
                <p className="mt-3 font-semibold text-forest">{item.code}</p>
                <p className="mt-1 break-all text-[10px] text-ink/40">{item.url}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </OrgaShell>
  )
}
