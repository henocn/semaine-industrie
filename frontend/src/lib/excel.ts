/* Colonne exportée : en-tête, largeur (caractères) et valeur lue sur la ligne. */
export type ExcelColumn<T> = {
  header: string
  width?: number
  value: (row: T) => string | number | Date | null | undefined
}

const FOREST = '#024D3E'
const SAGE = '#E0ECE5'
const BORDER = '#B7C9BF'

/* Exporte les lignes en .xlsx : en-tête vert figé, bordures, lignes alternées, dates au format français. */
export async function exportToExcel<T>({
  filename,
  sheet,
  columns,
  rows,
}: {
  filename: string
  sheet: string
  columns: ExcelColumn<T>[]
  rows: T[]
}) {
  /* Chargé à la demande : la bibliothèque ne pèse rien tant qu'on n'exporte pas. */
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  const header = columns.map((c) => ({
    value: c.header,
    fontWeight: 'bold' as const,
    textColor: '#FFFFFF',
    backgroundColor: FOREST,
    borderColor: BORDER,
    borderStyle: 'thin' as const,
    alignVertical: 'center' as const,
    height: 24,
  }))

  const body = rows.map((row, i) =>
    columns.map((c) => {
      const value = c.value(row)
      const base = {
        borderColor: BORDER,
        borderStyle: 'thin' as const,
        alignVertical: 'top' as const,
        wrap: true,
        ...(i % 2 === 1 ? { backgroundColor: SAGE } : {}),
      }
      if (value instanceof Date) return { ...base, value, type: Date, format: 'dd/mm/yyyy hh:mm' }
      if (typeof value === 'number') return { ...base, value, type: Number }
      return { ...base, value: value == null || value === '' ? '' : String(value), type: String }
    }),
  )

  const stamp = new Date().toISOString().slice(0, 10)
  await writeXlsxFile([header, ...body], {
    sheet: sheet.slice(0, 31),
    columns: columns.map((c) => ({ width: c.width ?? 20 })),
    stickyRowsCount: 1,
  }).toFile(`${filename}-${stamp}.xlsx`)
}

/* Statut de validation, en clair pour l'export. */
export function statusLabel(status?: string | null) {
  if (status === 'pending') return 'En attente'
  if (status === 'approved' || status === 'confirmed') return 'Accepté'
  if (status === 'rejected') return 'Refusé'
  if (status === 'cancelled') return 'Annulé'
  return status || ''
}

/* Date ISO / Date → Date exploitable par Excel (null si vide ou invalide). */
export function excelDate(value?: string | Date | null) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}
