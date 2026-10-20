import { useEffect, useState } from 'react'
import { getAuditOverview, type AuditOverview } from '../api/audit'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Écran audit : consultation des logs applicatifs. */
export default function OrgaAuditPage() {
  const [data, setData] = useState<AuditOverview | null>(null)
  const [day, setDay] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /* Charge les logs. */
  async function load(selectedDay?: string) {
    setBusy(true)
    try {
      setError(null)
      const overview = await getAuditOverview(selectedDay || undefined)
      setData(overview)
      setDay(overview.current.day)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <OrgaShell
      title="Audit et logs"
      actions={
        <button
          type="button"
          className="orga-btn-ghost px-3 py-2 text-[13px]"
          disabled={busy}
          onClick={() => void load(day)}
        >
          Actualiser
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="orga-panel mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-[13px] font-medium text-forest">
            Jour
            <select
              value={day}
              onChange={(e) => {
                const next = e.target.value
                setDay(next)
                void load(next)
              }}
              className="mt-1 border border-black bg-white px-3 py-2 text-[14px]"
            >
              {(data?.files || []).map((f) => (
                <option key={f.day} value={f.day}>
                  {f.day} ({Math.round(f.size / 1024)} Ko)
                </option>
              ))}
              {!data?.files?.length && day && <option value={day}>{day}</option>}
            </select>
          </label>
          <p className="pb-2 text-[13px] text-ink/50">
            {data
              ? `${data.current.returned} / ${data.current.total_lines} lignes`
              : busy
                ? 'Chargement…'
                : '—'}
          </p>
        </div>
      </section>

      <section className="orga-panel !p-0 overflow-hidden">
        <div className="max-h-[65vh] overflow-auto bg-[#0f1a17] px-4 py-3 font-mono text-[12px] leading-relaxed text-[#d7ebe3]">
          {!data?.current.lines.length && (
            <p className="text-white/40">Aucun log pour cette date.</p>
          )}
          {data?.current.lines.map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`} className="whitespace-pre-wrap break-all">
              {line}
            </div>
          ))}
        </div>
      </section>
    </OrgaShell>
  )
}
