import type { ReactNode } from 'react'

type SectionHeaderProps = {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  className?: string
  /* Niveau de titre : 1 pour le hero d'une page, 2 par défaut. */
  level?: 1 | 2
}

/* En-tête de section : surtitre optionnel, titre display et chapeau. */
export function SectionHeader({ eyebrow, title, lead, className = '', level = 2 }: SectionHeaderProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  return (
    <header className={className}>
      {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
      <Heading className={`display text-4xl sm:text-5xl ${eyebrow ? 'mt-4' : ''}`.trim()}>{title}</Heading>
      {lead && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{lead}</p>}
    </header>
  )
}
