import { RotateCcw } from 'lucide-react'
import { DEFAULT_ORDER, SORT_ORDERS, type SortOrder } from '../../lib/useTableSort'

/* Choix de l'ordre d'un tableau, et un bouton carré pour revenir au plus ancien d'abord. */
export function SortControl({ order, onChange }: { order: SortOrder; onChange: (order: SortOrder) => void }) {
  const changed = order !== DEFAULT_ORDER
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor="table-sort" className="sr-only">Ordre du tableau</label>
      <select
        id="table-sort"
        value={order}
        onChange={(e) => onChange(e.target.value as SortOrder)}
        className={`orga-input !w-auto !py-1.5 ${changed ? '!border-red-700' : ''}`}
      >
        {SORT_ORDERS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onChange(DEFAULT_ORDER)}
        disabled={!changed}
        title="Réinitialiser : plus ancien d’abord"
        aria-label="Réinitialiser : plus ancien d’abord"
        className={`orga-icon-btn ${changed ? '!border-red-700 !bg-red-700 !text-white hover:!bg-red-800' : ''}`}
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
