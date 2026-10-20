import type { ReactNode } from 'react'

type SectionHeaderProps = {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  className?: string
  /* Niveau de titre : 1 pour le hero d'une page, 2 par défaut. */
  level?: 1 | 2
  /* Ton clair ou sombre (section fond forest). */
  tone?: 'light' | 'dark'
}

/* En-tête de section : surtitre optionnel, titre et chapeau. */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  className = '',
  level = 2,
  tone = 'light',
}: SectionHeaderProps) {
  const Heading = level === 1 ? 'h1' : 'h2'
  const titleClass = tone === 'dark' ? '!text-white' : ''
  const leadClass = tone === 'dark' ? 'text-white/80' : 'text-ink/70'
  const eyebrowClass = tone === 'dark' ? 'text-sun' : ''

  return (
    <header className={className}>
      {eyebrow && <p className={`ui-eyebrow ${eyebrowClass}`.trim()}>{eyebrow}</p>}
      <Heading className={`display ${level === 1 ? 'h1' : 'h2'} ${eyebrow ? 'mt-2' : ''} ${titleClass}`.trim()}>
        {title}
      </Heading>
      {lead && <p className={`mt-3 max-w-xl text-[15px] leading-relaxed sm:text-base ${leadClass}`}>{lead}</p>}
    </header>
  )
}
