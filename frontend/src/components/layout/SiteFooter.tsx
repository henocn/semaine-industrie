import { Link } from 'react-router-dom'
import { BrandLogoWhite, WRAP } from './Mark'

/* Comptes officiels, relevés sur investissement.gouv.tg */
const SOCIALS: [string, string, string][] = [
  ['X', 'https://x.com/promo_investtg', 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'],
  ['Facebook', 'https://www.facebook.com/PromoInvestTogo/', 'M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.931-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z'],
  ['LinkedIn', 'https://www.linkedin.com/company/minist%C3%A8re-de-la-promotion-de-l-investissement/', 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'],
]

const LINK = 'text-white/75 transition-colors hover:text-white'

/* Pied de page commun des pages publiques : ministère, liens utiles, réseaux, mentions. */
export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t-4 border-sun bg-forest text-white">
      <div
        className="section-soft-bg section-soft-bg--on-dark"
        style={{ backgroundImage: 'url(/images/bg-industrie.png)' }}
        aria-hidden="true"
      />
      <div className={`${WRAP} grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]`}>
        <div>
          <div className="inline-block bg-white p-3">
            <img
              src="/brand/bloc-ministere-mdpise.png"
              alt="République togolaise, Ministère de la Promotion des investissements et de l’Industrie"
              className="h-24 w-auto max-w-full"
            />
          </div>
          <BrandLogoWhite className="mt-6 h-12 w-auto" />
        </div>
        <div>
          <p className="font-semibold text-white">La semaine</p>
          <ul className="mt-4 space-y-2.5">
            <li><Link to="/programme" className={LINK}>Programme</Link></li>
            <li><Link to="/carte" className={LINK}>Carte des usines</Link></li>
            <li><Link to="/vote" className={LINK}>Vote samedi</Link></li>
            <li><Link to="/questionnaire" className={LINK}>Questionnaire</Link></li>
            <li><Link to="/#contact" className={LINK}>Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-white">Suivre le Ministère</p>
          <ul className="mt-4 flex gap-3">
            {SOCIALS.map(([label, href, path]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="grid h-10 w-10 place-items-center border border-white/25 text-white transition-colors hover:border-white hover:bg-white hover:text-forest">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
                </a>
              </li>
            ))}
          </ul>
          <a href="https://investissement.gouv.tg/" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-white/75 underline decoration-white/30 underline-offset-4 transition-colors hover:text-white">
            investissement.gouv.tg
          </a>
        </div>
      </div>
      <div className="border-t border-white/15">
        <div className={`${WRAP} flex flex-col gap-3 py-6 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between`}>
          <p>© 2026 Semaine de l’industrie, République togolaise</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to="/confidentialite" className={LINK}>Confidentialité</Link>
            <span className="text-[12px] font-normal tracking-wide text-white/50">Powered by DEKA Editions</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
