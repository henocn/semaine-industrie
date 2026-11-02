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

/* Barre affichée dès qu'une ligne est cochée : compte, export Excel, désélection. */
export function ExportBar<T extends { id: string | number }>({
  selection,
  filename,
  sheet,
  columns,
}: {
  selection: { selected: T[]; clear: () => void }
  filename: string
  sheet: string
  columns: ExcelColumn<T>[]
}) {
  const [busy, setBusy] = useState(false)
  const count = selection.selected.length
  if (!count) return null

  /* Génère le fichier pour les lignes cochées. */
  async function onExport() {
    setBusy(true)
    try {
      await exportToExcel({ filename, sheet, columns, rows: selection.selected })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 border border-black bg-sage px-3 py-2 text-[13px]">
      <span className="font-semibold text-forest">
        {count} ligne{count > 1 ? 's' : ''} sélectionnée{count > 1 ? 's' : ''}
      </span>
      <button type="button" className="orga-btn" disabled={busy} onClick={() => void onExport()}>
        {busy ? 'Export…' : 'Exporter en Excel'}
      </button>
      <button type="button" className="text-forest underline underline-offset-2" onClick={selection.clear}>
        Désélectionner
      </button>
    </div>
  )
}
