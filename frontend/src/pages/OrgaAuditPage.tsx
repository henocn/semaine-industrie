import { useEffect, useState } from 'react'
import { listAuditEvents, type AuditEvent } from '../api/audit'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Action en libellé FR. */
function actionLabel(action: string) {
  const map: Record<string, string> = {
    create: 'Création',
    update: 'Modification',
    delete: 'Suppression',
    approve: 'Acceptation',
    reject: 'Refus',
    reorder: 'Réordonnancement',
  }
  return map[action] || action
}

/* Table d'audit : qui a modifié / supprimé quoi, et quand. */
export default function OrgaAuditPage() {
  const [rows, setRows] = useState<AuditEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /* Charge les événements. */
  async function load() {
    setBusy(true)
    try {
      setError(null)
      setRows(await listAuditEvents(200))
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
          onClick={() => void load()}
        >
          Actualiser
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="orga-panel !p-0 overflow-x-auto">
        <table className="orga-table min-w-[800px]">
          <thead>
            <tr>
              <th>Date / heure</th>
              <th>Qui</th>
              <th>Action</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-ink/40">
                  Aucun événement pour l&apos;instant
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-[13px]">
                  {r.created_at
                    ? new Date(r.created_at).toLocaleString('fr-FR')
                    : '—'}
                </td>
                <td>
                  <p className="font-medium text-forest">{r.actor_name || '—'}</p>
                  <p className="text-[12px] text-ink/45">{r.actor_email || ''}</p>
                </td>
                <td>{actionLabel(r.action)}</td>
                <td>
                  <p className="text-[13px] text-ink/80">{r.summary}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink/35">
                    {r.entity_type}
                    {r.entity_id ? ` · ${r.entity_id.slice(0, 8)}` : ''}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}
