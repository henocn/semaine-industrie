import type { ReactNode } from 'react'

/* Bouton action icône seule (tableaux du backoffice). */
export function IconButton({
  label,
  children,
  onClick,
  disabled,
  variant,
}: {
  label: string
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'ok' | 'danger'
}) {
  const extra = variant === 'ok' ? 'orga-icon-btn--ok' : variant === 'danger' ? 'orga-icon-btn--danger' : ''
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`orga-icon-btn ${extra}`}
    >
      {children}
    </button>
  )
}

/* Icône crayon. */
export function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  )
}

/* Icône validation. */
export function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/* Icône fermer / refuser. */
export function IconX() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

/* Icône corbeille. */
export function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  )
}
