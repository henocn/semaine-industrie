import { useMemo, useState } from 'react'

/* Ordres proposés, avec un libellé explicite ; « oldest » est l'ordre de traitement (premier inscrit, premier servi). */
export const SORT_ORDERS = [
  { value: 'oldest', label: 'Plus ancien d’abord' },
  { value: 'newest', label: 'Plus récent d’abord' },
  { value: 'az', label: 'Nom de A à Z' },
  { value: 'za', label: 'Nom de Z à A' },
  { value: 'status', label: 'Statut : en attente d’abord' },
  { value: 'status-desc', label: 'Statut : refusés d’abord' },
] as const

export type SortOrder = (typeof SORT_ORDERS)[number]['value']
export const DEFAULT_ORDER: SortOrder = 'oldest'

/* Comment lire, pour une ligne, sa date d'inscription, son nom et le rang de son statut. */
export type SortAccessors<T> = {
  date: (row: T) => string | null | undefined
  name: (row: T) => string
  status: (row: T) => number
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true })

/* Horodatage d'une date d'inscription (les lignes sans date passent en dernier). */
function time(value: string | null | undefined) {
  const t = value ? new Date(value).getTime() : NaN
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER
}

/*
 * Tri d'un tableau du backoffice, jamais mémorisé : il revient au plus ancien d'abord
 * à chaque ouverture de la page et à chaque changement d'onglet (`scope`).
 */
export function useTableSort<T>(rows: T[], get: SortAccessors<T>, scope = '') {
  const [picked, setPicked] = useState<{ scope: string; order: SortOrder }>({ scope, order: DEFAULT_ORDER })
  const order = picked.scope === scope ? picked.order : DEFAULT_ORDER

  const sorted = useMemo(() => {
    const byDate = (a: T, b: T) => time(get.date(a)) - time(get.date(b))
    return [...rows].sort((a, b) => {
      switch (order) {
        case 'newest': return byDate(b, a)
        case 'az': return collator.compare(get.name(a), get.name(b)) || byDate(a, b)
        case 'za': return collator.compare(get.name(b), get.name(a)) || byDate(a, b)
        case 'status': return get.status(a) - get.status(b) || byDate(a, b)
        case 'status-desc': return get.status(b) - get.status(a) || byDate(a, b)
        default: return byDate(a, b)
      }
    })
  }, [rows, order, get])

  return {
    sorted,
    order,
    setOrder: (next: SortOrder) => setPicked({ scope, order: next }),
    reset: () => setPicked({ scope, order: DEFAULT_ORDER }),
  }
}
