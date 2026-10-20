/* Symbole officiel MDPISE — quatre blocs feuille ascendants. */
export function Mark({ className = '' }: { className?: string }) {
  return (
    <img
      src="/brand/symbole-couleur-transparent.png"
      alt=""
      aria-hidden="true"
      className={`object-contain ${className}`}
    />
  )
}

/* Logo complet couleur (fonds clairs). */
export function BrandLogo({ className = 'h-9 w-auto' }: { className?: string }) {
  return (
    <img
      src="/brand/logo-couleur-transparent.png"
      alt="Semaine de l’Industrie 2026"
      className={`object-contain ${className}`}
    />
  )
}

/* Logo blanc (fonds foncés / photographiques). */
export function BrandLogoWhite({ className = 'h-9 w-auto' }: { className?: string }) {
  return (
    <img
      src="/brand/logo-blanc-transparent.png"
      alt="Semaine de l’Industrie 2026"
      className={`object-contain ${className}`}
    />
  )
}

export const WRAP = 'mx-auto w-full max-w-6xl px-5 sm:px-8'

/* Signature de campagne (dossier validation MDPISE). */
export const CAMPAIGN_TAGLINE = 'L’industrie à portée de main.'
export const CAMPAIGN_SUB = 'Construire aujourd’hui l’industrie de demain.'
