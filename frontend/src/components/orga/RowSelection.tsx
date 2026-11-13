import { useEffect, useRef, useState } from 'react'
import type { RowSelection as Selection } from '../../lib/useRowSelection'
import { exportToExcel, type ExcelColumn } from '../../lib/excel'

/* En-tête de la colonne à cocher : tout cocher (état intermédiaire si partiel). */
export function SelectAllHeader({ selection }: { selection: Selection }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = selection.someChecked
  }, [selection.someChecked])
  return (
    <th className="w-10 !px-0 text-center">
      <input
        ref={ref}
        type="checkbox"
        aria-label="Tout sélectionner"
        checked={selection.allChecked}
        onChange={selection.toggleAll}
        className="h-4 w-4 cursor-pointer accent-forest align-middle"
      />
    </th>
  )
}

/* Case d'une ligne ; le clic ne déclenche pas l'ouverture du détail. */
export function SelectCell({ selection, id }: { selection: Selection; id: string | number }) {
  return (
    <td className="w-10 !px-0 text-center" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        aria-label="Sélectionner la ligne"
        checked={selection.isChecked(id)}
        onChange={() => selection.toggle(id)}
        className="h-4 w-4 cursor-pointer accent-forest align-middle"
      />
    </td>
  )
}

type ReviewStatus = 'approved' | 'rejected'

/* Acceptation / refus groupés : lignes concernées, action unitaire (avec ses notifications), rechargement. */
export type BulkReview<T> = {
  /* Ligne encore à traiter (en attente). */
  eligible: (row: T) => boolean
  /* Même appel que le bouton de la ligne : la personne est prévenue comme d'habitude. */
  run: (row: T, status: ReviewStatus) => Promise<unknown>
  /* Nom affiché en cas d'échec. */
  name: (row: T) => string
  /* Recharge le tableau une fois le lot terminé. */
  onDone: () => void | Promise<void>
}

type Progress = { status: ReviewStatus; done: number; total: number }
type Outcome = { status: ReviewStatus; ok: number; total: number; failed: { name: string; message: string }[] }

const VERB: Record<ReviewStatus, { button: string; noun: string }> = {
  approved: { button: 'Accepter', noun: 'Acceptation' },
  rejected: { button: 'Refuser', noun: 'Refus' },
}

/* Barre affichée dès qu'une ligne est cochée : compte, export Excel, acceptation / refus groupés, désélection. */
export function ExportBar<T extends { id: string | number }>({
  selection,
  filename,
  sheet,
  columns,
  review,
}: {
  selection: { selected: T[]; clear: () => void }
  filename: string
  sheet: string
  columns: ExcelColumn<T>[]
  review?: BulkReview<T>
}) {
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState<ReviewStatus | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const count = selection.selected.length
  const pending = review ? selection.selected.filter(review.eligible) : []
  const skipped = count - pending.length

  /* Pendant un lot, prévient avant de quitter la page (les envois restants seraient interrompus). */
  useEffect(() => {
    if (!progress) return undefined
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [progress])

  if (!count && !progress && !outcome) return null

  /* Génère le fichier pour les lignes cochées. */
  async function onExport() {
    setBusy(true)
    try {
      await exportToExcel({ filename, sheet, columns, rows: selection.selected })
    } finally {
      setBusy(false)
    }
  }

  /* Traite les lignes une à une (les notifications partent comme pour une action unitaire). */
  async function runBatch(status: ReviewStatus) {
    if (!review || !pending.length) return
    const rows = [...pending]
    const failed: Outcome['failed'] = []
    setAsking(null)
    setOutcome(null)
    setProgress({ status, done: 0, total: rows.length })
    for (let i = 0; i < rows.length; i += 1) {
      try {
        await review.run(rows[i], status)
      } catch (err) {
        failed.push({ name: review.name(rows[i]), message: err instanceof Error ? err.message : 'Action impossible' })
      }
      setProgress({ status, done: i + 1, total: rows.length })
    }
    selection.clear()
    try {
      await review.onDone()
    } finally {
      setProgress(null)
      setOutcome({ status, ok: rows.length - failed.length, total: rows.length, failed })
    }
  }

  return (
    <div className="mb-3 border border-black bg-sage px-3 py-2 text-[13px]">
      {progress ? (
        <div role="status" className="space-y-1.5 py-0.5">
          <p className="font-semibold text-forest">
            {VERB[progress.status].noun} en cours : <span className="tabular-nums">{progress.done}/{progress.total}</span>
            <span className="font-normal text-ink/60"> · notifications en cours d’envoi, ne fermez pas la page.</span>
          </p>
          <div className="h-1.5 w-full max-w-md bg-white">
            <div
              className="h-full bg-forest transition-[width] duration-300"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      ) : asking ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-forest">
            <span className="font-semibold">
              {VERB[asking].button} {pending.length} ligne{pending.length > 1 ? 's' : ''} en attente ?
            </span>{' '}
            Chaque personne est prévenue par e-mail et sur WhatsApp.
            {skipped > 0 && ` ${skipped} ligne${skipped > 1 ? 's' : ''} déjà traitée${skipped > 1 ? 's' : ''} ignorée${skipped > 1 ? 's' : ''}.`}
          </span>
          <button
            type="button"
            className={asking === 'rejected' ? 'orga-btn !border-red-700 !bg-red-700 hover:!bg-red-800' : 'orga-btn'}
            onClick={() => void runBatch(asking)}
          >
            Confirmer
          </button>
          <button type="button" className="text-forest underline underline-offset-2" onClick={() => setAsking(null)}>
            Annuler
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {count > 0 && (
            <>
              <span className="font-semibold text-forest">
                {count} ligne{count > 1 ? 's' : ''} sélectionnée{count > 1 ? 's' : ''}
              </span>
              <button type="button" className="orga-btn" disabled={busy} onClick={() => void onExport()}>
                {busy ? 'Export…' : 'Exporter en Excel'}
              </button>
              {pending.length > 0 && (
                <>
                  <button type="button" className="orga-btn-ghost" onClick={() => setAsking('approved')}>
                    Accepter ({pending.length})
                  </button>
                  <button
                    type="button"
                    className="orga-btn-ghost !text-red-700"
                    onClick={() => setAsking('rejected')}
                  >
                    Refuser ({pending.length})
                  </button>
                </>
              )}
              <button type="button" className="text-forest underline underline-offset-2" onClick={selection.clear}>
                Désélectionner
              </button>
            </>
          )}
          {outcome && (
            <span className={`flex flex-wrap items-center gap-2 ${count > 0 ? 'w-full border-t border-black/10 pt-2' : ''}`}>
              <span className={outcome.failed.length ? 'font-semibold text-red-700' : 'font-semibold text-forest'}>
                {VERB[outcome.status].noun} terminé : <span className="tabular-nums">{outcome.ok}/{outcome.total}</span>
                {outcome.failed.length > 0 && ` · ${outcome.failed.length} échec${outcome.failed.length > 1 ? 's' : ''}`}
              </span>
              <button type="button" className="text-ink/50 hover:text-forest" onClick={() => setOutcome(null)}>
                Fermer
              </button>
            </span>
          )}
        </div>
      )}
      {!progress && outcome && outcome.failed.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12px] text-red-800">
          {outcome.failed.map((f, i) => (
            <li key={i}>
              {f.name} : {f.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
