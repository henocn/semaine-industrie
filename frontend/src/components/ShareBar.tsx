import { useState } from 'react'
import { SITE_URL } from '../lib/seo'

const SHARE_TEXT = "Semaine de l'industrie 2026, du 16 au 22 novembre au Togo."

/* Ouvre un lien de partage dans un nouvel onglet. */
function shareHref(kind: 'facebook' | 'whatsapp' | 'x') {
  const url = encodeURIComponent(SITE_URL)
  const text = encodeURIComponent(SHARE_TEXT)
  if (kind === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${url}`
  if (kind === 'whatsapp') return `https://wa.me/?text=${text}%20${url}`
  return `https://twitter.com/intent/tweet?text=${text}&url=${url}`
}

/* Petite rangée de partage : Facebook, WhatsApp, X, copier le lien. */
export function ShareBar({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [copied, setCopied] = useState(false)
  const link =
    tone === 'dark'
      ? 'text-white/80 underline decoration-white/30 underline-offset-4 transition-opacity hover:opacity-70'
      : 'text-forest underline decoration-forest/30 underline-offset-4 transition-opacity hover:opacity-70'
  const label = tone === 'dark' ? 'text-white' : 'text-forest'

  /* Copie l'adresse du site. */
  async function copyLink() {
    let ok = false
    try {
      await navigator.clipboard.writeText(SITE_URL)
      ok = true
    } catch {
      const input = document.createElement('textarea')
      input.value = SITE_URL
      document.body.appendChild(input)
      input.select()
      ok = document.execCommand('copy')
      input.remove()
    }
    if (!ok) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]">
      <p className={`font-semibold ${label}`}>Partager</p>
      <a className={link} href={shareHref('facebook')} target="_blank" rel="noopener noreferrer">
        Facebook
      </a>
      <a className={link} href={shareHref('whatsapp')} target="_blank" rel="noopener noreferrer">
        WhatsApp
      </a>
      <a className={link} href={shareHref('x')} target="_blank" rel="noopener noreferrer">
        X
      </a>
      <button type="button" className={link} onClick={() => void copyLink()}>
        {copied ? 'Lien copié' : 'Copier le lien'}
      </button>
    </div>
  )
}
