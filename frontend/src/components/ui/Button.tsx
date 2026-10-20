import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'accent' | 'onDark' | 'outline' | 'link'

type ButtonProps = {
  variant?: ButtonVariant
  to?: string
  className?: string
  disabled?: boolean
  /* Flèche à droite (ignorée pour la variante link). Actif par défaut. */
  withArrow?: boolean
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  children: ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'ui-btn-primary',
  accent: 'ui-btn-accent',
  onDark: 'ui-btn-ondark',
  outline: 'ui-btn-outline',
  link: 'inline-flex items-center gap-1.5 font-semibold text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:text-energy hover:decoration-energy',
}

/* Bouton ou lien stylé : rend un Link react-router si `to` est fourni, sinon un button. */
export function Button({
  variant = 'primary',
  to,
  className = '',
  disabled = false,
  withArrow = false,
  type = 'button',
  onClick,
  children,
}: ButtonProps) {
  const classes = `${VARIANT_CLASS[variant]} ${disabled ? 'pointer-events-none opacity-50' : ''} ${className}`.trim()
  const showArrow = withArrow && variant !== 'link'
  const content = (
    <>
      {children}
      {showArrow && <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />}
    </>
  )

  if (to && !disabled) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {content}
    </button>
  )
}
