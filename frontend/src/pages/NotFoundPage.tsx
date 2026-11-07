import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { BrandLogoWhite } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'

/* Adresse inconnue : page autonome et centrée, fixe à la taille de l'écran, sans défilement. */
export default function NotFoundPage() {
  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-forest px-4 text-center text-white">
      <Seo title="Page introuvable" path="/404" noIndex />
      <div
        className="section-soft-bg section-soft-bg--on-dark"
        style={{ backgroundImage: 'url(/images/bg-industrie.png)' }}
        aria-hidden="true"
      />
      <div className="relative flex flex-col items-center">
        <Link to="/" aria-label="Semaine de l’industrie 2026, accueil">
          <BrandLogoWhite className="h-[clamp(2.25rem,7vh,3rem)] w-auto" />
        </Link>
        <p className="display mt-[clamp(0.75rem,3vh,2rem)] text-[clamp(4.5rem,min(24vw,26vh),13rem)] font-extrabold leading-none text-sun">404</p>
        <h1 className="display mt-[clamp(0.25rem,1.5vh,1rem)] text-[clamp(1.5rem,5vh,2.5rem)] font-extrabold leading-tight text-white">
          Page introuvable
        </h1>
        <p className="mt-2 text-base leading-relaxed text-white/80">
          Cette page n’existe pas ou a été déplacée.
        </p>
        <div className="mt-[clamp(0.75rem,3.5vh,2rem)] flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Button to="/" variant="accent">Retour à l’accueil</Button>
          <Link to="/programme/" className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
            Voir le programme
          </Link>
        </div>
      </div>
    </main>
  )
}
