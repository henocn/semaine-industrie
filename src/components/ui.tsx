import { useState, type ReactNode } from 'react'
import { motion } from 'motion/react'

/* ---------- Symbole : trois feuilles ascendantes (Ressource → Transformation → Progrès) ---------- */
export function Mark({ className = 'h-9 w-auto', gradient = false }: { className?: string; gradient?: boolean }) {
  const fill = gradient ? 'url(#mark-g)' : 'currentColor'
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden="true">
      {gradient && (
        <defs>
          <linearGradient id="mark-g" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#03483a" />
            <stop offset=".55" stopColor="#12a150" />
            <stop offset="1" stopColor="#8bd63a" />
          </linearGradient>
        </defs>
      )}
      <g fill={fill}>
        <path d="M4 28h10a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H8a6 6 0 0 1-6-6v-9a2 2 0 0 1 2-2z" />
        <path d="M27 16h9a3 3 0 0 1 3 3v4c0 10-8 18-18 18h-1a2 2 0 0 1-2-2v-6c0-9 3-17 9-17z" />
        <path d="M51 3h9a2 2 0 0 1 2 2v3c0 9-7 16-16 16h-2a2 2 0 0 1-2-2V17C42 9 45 3 51 3z" />
      </g>
    </svg>
  )
}

export function Logo({ light = true, className = '' }: { light?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark className={`h-8 w-auto ${light ? 'text-lime' : ''}`} gradient={!light} />
      <span className={`font-display text-[13px] font-extrabold uppercase leading-[0.95] tracking-tight ${light ? 'text-white' : 'text-forest'}`}>
        Semaine <span className="font-medium">de</span>
        <br />l’industrie <span className={light ? 'text-lime' : 'text-leaf'}>2026</span>
      </span>
    </span>
  )
}

/* ---------- Image avec rendu de secours : déposez le fichier dans /public/images ---------- */
export function Img({ name, alt, className = '', tone = 'forest' }: { name: string; alt: string; className?: string; tone?: 'forest' | 'lime' | 'sun' }) {
  const [failed, setFailed] = useState(false)
  const tones = {
    forest: 'from-forest via-moss to-leaf',
    lime: 'from-leaf via-lime to-[#c6f06b]',
    sun: 'from-[#e0a800] via-sun to-[#ffe27a]',
  }
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${tones[tone]} ${className}`}>
      {!failed ? (
        <img
          src={`/images/${name}.jpg`}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 flex items-end p-4">
          <Mark className="absolute -right-6 -top-4 h-40 w-auto text-white/10" />
          <span className="rounded-full bg-black/20 px-3 py-1 text-[10px] font-medium uppercase tracking-widest text-white/80 backdrop-blur">
            images/{name}.jpg
          </span>
        </div>
      )}
    </div>
  )
}

/* ---------- Apparition au défilement ---------- */
export function Reveal({ children, delay = 0, className = '', y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SectionHead({ num, eyebrow, title, lead, dark = false }: { num: string; eyebrow: string; title: ReactNode; lead?: string; dark?: boolean }) {
  return (
    <Reveal className="max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <span className="leaf-sm grid h-11 w-11 place-items-center bg-gradient-to-br from-forest to-lime font-display text-sm font-bold text-white">{num}</span>
        <span className={`eyebrow ${dark ? 'text-lime' : 'text-leaf'}`}>{eyebrow}</span>
      </div>
      <h2 className={`font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl ${dark ? 'text-white' : 'text-forest'}`}>{title}</h2>
      {lead && <p className={`mt-6 text-lg leading-relaxed ${dark ? 'text-white/70' : 'text-ink/70'}`}>{lead}</p>}
      <div className="rule mt-8" />
    </Reveal>
  )
}

/* ---------- Autocollant du label (forme feuille) ---------- */
export function LabelSticker({ variant }: { variant: 'usine' | 'ecole' }) {
  const usine = variant === 'usine'
  return (
    <div className={`leaf relative aspect-square w-full max-w-[220px] p-[3px] shadow-2xl shadow-forest/20 ${usine ? 'bg-gradient-to-br from-forest via-leaf to-lime' : 'bg-gradient-to-br from-forest via-leaf to-lime'}`}>
      <div className={`leaf flex h-full flex-col justify-between p-6 ${usine ? 'bg-gradient-to-br from-moss via-leaf to-lime text-white' : 'bg-white text-forest'}`}>
        <Mark className={`ml-auto h-10 w-auto ${usine ? 'text-white' : ''}`} gradient={!usine} />
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] opacity-80">Label 2026</p>
          <p className="mt-1 font-display text-2xl font-bold leading-none">{usine ? <>Usine<br />ouverte</> : <>École<br />partenaire</>}</p>
          <p className="mt-2 text-[9px] opacity-70">Semaine de l’industrie · Togo</p>
        </div>
      </div>
    </div>
  )
}
