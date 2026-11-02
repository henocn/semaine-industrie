import { useState } from 'react'

/* Sélection de lignes par id ; ne garde que les ids encore affichés. */
export function useRowSelection<T extends { id: string | number }>(rows: T[]) {
  const [picked, setPicked] = useState<Set<string | number>>(() => new Set())
  const selected = rows.filter((r) => picked.has(r.id))
  const allChecked = rows.length > 0 && selected.length === rows.length

  /* Coche / décoche une ligne. */
  function toggle(id: string | number) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  /* Coche toutes les lignes affichées, ou les décoche si elles le sont déjà. */
  function toggleAll() {
    setPicked(allChecked ? new Set() : new Set(rows.map((r) => r.id)))
  }

  return {
    selected,
    allChecked,
    someChecked: selected.length > 0 && !allChecked,
    isChecked: (id: string | number) => picked.has(id),
    toggle,
    toggleAll,
    clear: () => setPicked(new Set()),
  }
}

export type RowSelection = ReturnType<typeof useRowSelection>
