import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

export type ButtonVariant = 'primary' | 'accent' | 'onDark' | 'link'

type ButtonProps = {
  variant?: ButtonVariant
  to?: string
  className?: string
  disabled?: boolean
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type']
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick']
  children: ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'ui-btn-primary',
  accent: 'ui-btn-accent',
  onDark: 'ui-btn-ondark',
  link: 'inline-flex items-center gap-1.5 font-semibold text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:text-energy hover:decoration-energy',
}

/* Bouton ou lien stylé : rend un Link react-router si `to` est fourni, sinon un button. */
export function Button({
  variant = 'primary',
  to,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  children,
}: ButtonProps) {
  const classes = `${VARIANT_CLASS[variant]} ${disabled ? 'pointer-events-none opacity-50' : ''} ${className}`.trim()

  if (to && !disabled) {
    return (
      <Link to={to} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
