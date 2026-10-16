import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { listBookableSites, type BookableSite } from '../api/bookings'
import { createPassportBatch, scanPassport } from '../api/passports'
import { getStoredUser } from '../api/auth'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Backoffice passeports : lot + scan. */
export default function OrgaPassportsPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [sites, setSites] = useState<BookableSite[]>([])
  const [batch, setBatch] = useState<Array<{ code: string; url: string; qr_data_url: string }>>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'orga') {
      navigate('/login')
      return
    }
    listBookableSites().then(setSites).catch(() => undefined)
  }, [navigate, user])

  async function onBatch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      const data = await createPassportBatch({
        count: Number(fd.get('count') || 10),
        school_name: String(fd.get('school_name') || '') || undefined,
        class_label: String(fd.get('class_label') || '') || undefined,
      })
      setBatch(data.items)
      setMsg(`${data.count} passeports générés`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function onScan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setMsg(null)
    const fd = new FormData(e.currentTarget)
    try {
      await scanPassport({
        code: String(fd.get('code') || ''),
        organization_id: String(fd.get('organization_id') || ''),
        scanned_by: user ? `${user.first_name} ${user.last_name}` : undefined,
      })
      setMsg('Visite tamponnée')
      e.currentTarget.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan impossible')
    }
  }

  return (
    <OrgaShell
      title="Passeports"
      actions={
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-xl bg-forest px-4 py-2.5 text-[13px] font-semibold text-white print:hidden"
        >
          Imprimer lot
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700 print:hidden">{error}</p>}
      {msg && <p className="mb-4 text-[14px] text-forest print:hidden">{msg}</p>}

      <div className="grid gap-4 xl:grid-cols-2 print:hidden">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold text-forest">Générer un lot</h2>
          <form onSubmit={onBatch} className="mt-4 grid gap-3">
            <input name="count" type="number" min={1} max={200} defaultValue={12} className="rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px]" placeholder="Nombre" />
            <input name="school_name" className="rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px]" placeholder="École (optionnel)" />
            <input name="class_label" className="rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px]" placeholder="Classe (optionnel)" />
            <button type="submit" className="rounded-xl bg-forest px-4 py-2.5 text-[13px] font-semibold text-white">Générer</button>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold text-forest">Scanner / tamponner</h2>
          <form onSubmit={onScan} className="mt-4 grid gap-3">
            <input required name="code" className="rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px] uppercase" placeholder="Code passeport" />
            <select required name="organization_id" className="rounded-xl bg-[#f3f4f6] px-3 py-2.5 text-[13px]">
              <option value="">Site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-forest px-4 py-2.5 text-[13px] font-semibold text-white">Tamponner</button>
          </form>
        </section>
      </div>

      {batch.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white p-5 shadow-sm print:shadow-none">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
            {batch.map((item) => (
              <article key={item.code} className="break-inside-avoid rounded-2xl bg-[#f7f8f9] p-4 text-center print:border print:bg-white">
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
