import type { ReactNode } from 'react'

type SectionHeaderProps = {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  className?: string
  /* Niveau de titre : 1 pour le hero d'une page, 2 par défaut. */
  level?: 1 | 2
  /* Numéro de section institutionnel, ex. « 01 ». */
  number?: string
  /* Ton clair ou sombre (section fond forest). */
  tone?: 'light' | 'dark'
}

/* En-tête de section : filet or, numéro, surtitre, titre et chapeau. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  className = '',
  level = 2,
  number,
  tone = 'light',
}: SectionHeaderProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  const titleClass = tone === 'dark' ? '!text-white' : ''
  const leadClass = tone === 'dark' ? 'text-white/80' : 'text-muted'
  const eyebrowClass = tone === 'dark' ? 'text-sun' : ''

  return (
    <header className={className}>
      <div className="rule-gold mb-4" aria-hidden="true" />
      {number && (
        <p className={`text-sm font-semibold tabular-nums tracking-wide ${tone === 'dark' ? 'text-sun' : 'text-energy'}`}>
          {number}
        </p>
      )}
      {eyebrow && <p className={`ui-eyebrow ${number ? 'mt-2' : ''} ${eyebrowClass}`.trim()}>{eyebrow}</p>}
      <Heading className={`display ${level === 1 ? 'h1' : 'h2'} ${eyebrow || number ? 'mt-3' : ''} ${titleClass}`.trim()}>
        {title}
      </Heading>
      {lead && <p className={`lead mt-4 max-w-2xl ${leadClass}`}>{lead}</p>}
    </header>
  )
}
