/* Nombre de demandes encore à traiter ; rien tant qu'il n'y en a aucune. */
export function PendingBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      className="min-w-5 bg-sun px-1.5 py-0.5 text-center text-[11px] font-bold text-ink"
      title={`${count} en attente`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
