import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  optional?: boolean
  className?: string
}

/* Champ de formulaire : libellé qui enveloppe le contrôle, avec aide, erreur et mention facultatif. */
export function Field({ label, children, hint, error, optional = false, className = '' }: FieldProps) {
  return (
    <label className={`block ${className}`.trim()}>
      <span className="flex items-baseline justify-between gap-3 text-sm font-semibold text-forest">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Facultatif</span>}
      </span>
      <span className="mt-1.5 block">{children}</span>
      {hint && !error && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs font-medium text-flag">
          {error}
        </span>
      )}
    </label>
  )
}
