import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { DAYS, SPEAKERS, PLACES, PARTNERS } from '../data'

const WRAP = 'mx-auto w-full max-w-6xl px-5 sm:px-8'

/* Symbole de la charte : trois feuilles qui montent */
function Mark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden="true" fill="currentColor">
      <path d="M4 28h10a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H8a6 6 0 0 1-6-6v-9a2 2 0 0 1 2-2z" />
      <path d="M27 16h9a3 3 0 0 1 3 3v4c0 10-8 18-18 18h-1a2 2 0 0 1-2-2v-6c0-9 3-17 9-17z" />
      <path d="M51 3h9a2 2 0 0 1 2 2v3c0 9-7 16-16 16h-2a2 2 0 0 1-2-2V17C42 9 45 3 51 3z" />
    </svg>
  )
}

/* Photo : déposez le fichier dans public/images. Sans fichier, un aplat discret. */
function Photo({ name, alt, className = '', position = 'center', eager = false }: { name: string; alt: string; className?: string; position?: string; eager?: boolean }) {
  const [missing, setMissing] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-sage ${className}`}>
      {missing
        ? <span className="absolute bottom-3 left-4 text-xs text-forest/40">images/{name}.jpg</span>
        : <img src={`/images/${name}.jpg`} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setMissing(true)} style={{ objectPosition: position }} className="absolute inset-0 h-full w-full object-cover" />}
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur">
      <div className={`${WRAP} flex h-16 items-center justify-between`}>
        <a href="#top" className="flex items-center gap-2.5 text-forest">
          <Mark className="h-6 w-auto text-leaf" />
          <span className="text-[15px] font-semibold [font-stretch:112%]">Semaine de l’industrie 2026</span>
        </a>
        <nav className="hidden gap-1 text-[15px] text-ink/70 md:flex">
          <a href="#programme" className="rounded-full px-4 py-2 transition-colors hover:bg-forest hover:text-white">Programme</a>
          <a href="#vendredi" className="rounded-full px-4 py-2 transition-colors hover:bg-forest hover:text-white">Vendredi 20</a>
          <Link to="/carte" className="rounded-full px-4 py-2 transition-colors hover:bg-forest hover:text-white">Carte</Link>
          <Link to="/label" className="rounded-full px-4 py-2 transition-colors hover:bg-forest hover:text-white">Label</Link>
          <Link to="/bilan" className="rounded-full px-4 py-2 transition-colors hover:bg-forest hover:text-white">Bilan</Link>
          <a href="#contact" className="rounded-full px-4 py-2 transition-colors hover:bg-forest hover:text-white">Contact</a>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-[520px] items-end overflow-hidden rounded-br-[4rem] bg-forest text-white sm:h-[72svh] sm:max-h-[760px] sm:rounded-br-[8rem]">
      <img
        src="/images/hall.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
      />
      {/* Voile noir léger pour la lisibilité du texte */}
      <div className="absolute inset-0 -z-10 bg-black/65" />
      <div className={`${WRAP} pb-14 pt-24 sm:pb-20`}>
        <h1 className="display max-w-4xl text-[clamp(2.75rem,7.5vw,6rem)] !text-white">L’industrie togolaise en mouvement</h1>
        <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <p className="max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
            Pendant une semaine, les usines ouvrent leurs portes aux élèves, aux étudiants et au public, à Lomé et dans les régions.
          </p>
          <p className="text-lg font-semibold [font-stretch:112%] sm:text-right">
            <span className="text-sun">Du 16 au 22 novembre 2026</span><br /><span className="font-normal text-white/70">Lomé et les régions</span>
          </p>
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="py-24 sm:py-32">
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div>
          <h2 className="display text-4xl sm:text-5xl">Voir ce que le Togo fabrique, où, et par qui.</h2>
          <Photo name="eleves" alt="Lycéennes et lycéens dans la cour d’un établissement togolais" className="leaf-alt mt-12 aspect-[4/3]" />
        </div>
        <div className="space-y-6 text-lg leading-relaxed text-ink/80">
          <p>
            La Semaine de l’industrie fait découvrir les usines et leurs métiers aux jeunes et au grand public. Elle réunit aussi investisseurs, industriels et PME locales, et raconte l’industrie togolaise par des images et des portraits.
          </p>
          <p>
            Elle s’appuie sur une date repère : le <strong className="font-semibold text-forest">20 novembre, Journée de l’industrialisation de l’Afrique</strong>, célébrée par les Nations Unies, l’Union africaine et l’ONUDI.
          </p>
          <p>Fil rouge de l’édition : la souveraineté économique par la transformation locale, avec une attention particulière à la place des femmes dans l’industrie.</p>
        </div>
      </div>
    </section>
  )
}

function Programme() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="programme" className="bg-sage py-16 sm:py-20">
      <div className={WRAP}>
        <div className="grid gap-4 md:grid-cols-[1fr_1.15fr] md:items-end">
          <h2 className="display text-4xl sm:text-5xl">Le programme</h2>
          <p className="text-lg text-ink/70">Un thème par jour. Hors visites d’usines, les activités ont lieu au CETEF Togo 2000, à Lomé.</p>
        </div>
        <ul className="mt-8 border-t border-forest/15">
          {DAYS.map((d) => {
            const isOpen = open === d.n
            const canOpen = d.slots.length > 0
            const red = d.phare
            const c = (onRed: string, onSage: string) => (red ? onRed : onSage)
            return (
              <li key={d.n} className={red ? '-mx-4 bg-flag px-4 text-white sm:-mx-6 sm:px-6' : 'border-b border-forest/15'}>
                <button
                  type="button"
                  disabled={!canOpen}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : d.n)}
                  className="grid w-full grid-cols-[3rem_1fr_auto] items-baseline gap-x-4 gap-y-0.5 py-4 text-left sm:grid-cols-[5rem_13rem_1fr_auto] sm:gap-x-8"
                >
                  <span className={'display text-2xl sm:text-3xl ' + c('!text-white', '')}>{d.n}</span>
                  <span className={'font-semibold ' + c('text-white', 'text-forest')}>
                    {d.name}
                    <span className={'block text-[15px] font-normal ' + c('text-white/80', 'text-ink/60')}>{d.theme}</span>
                  </span>
                  <span className={'col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto ' + c('text-white/90', 'text-ink/75')}>{d.goal}</span>
                  {canOpen && (
                    <span className={'row-start-1 col-start-3 text-2xl font-light transition-transform duration-300 sm:col-start-4 ' + c('text-white', 'text-forest') + (isOpen ? ' rotate-45' : '')} aria-hidden="true">+</span>
                  )}
                </button>
                <div className="fold" data-open={isOpen}>
                  <div>
                    <div className="pb-6 lg:ml-[23rem]">
                      <p className={'mb-3 text-[15px] ' + c('text-white/75', 'text-ink/55')}>{d.where}</p>
                      <table className="w-full text-[15px]">
                        <tbody>
                          {d.slots.map(([h, t]) => (
                            <tr key={h + t} className={'border-t ' + c('border-white/20', 'border-forest/10')}>
                              <td className={'w-20 py-2 align-top font-semibold ' + c('text-white', 'text-forest')}>{h}</td>
                              <td className={'py-2 ' + c('text-white/90', 'text-ink/80')}>{t}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Friday() {
  return (
    <section id="vendredi" className="bg-forest py-24 text-white sm:py-32">
      <div className={`${WRAP} grid gap-14 md:grid-cols-2 md:items-start`}>
        <div>
          <p className="text-lg font-semibold text-sun">Vendredi 20 novembre</p>
          <h2 className="display mt-4 text-4xl !text-white sm:text-5xl">La journée phare</h2>
          <p className="mt-8 text-lg leading-relaxed text-white/80">
            Décideurs, industriels, PME et investisseurs se retrouvent au CETEF Togo 2000 pour la Journée de l’industrialisation de l’Afrique.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-white/80">
            Le matin, deux tables rondes. L’après-midi, des rencontres d’affaires de 20 minutes, préparées à l’avance.
          </p>
        </div>
        <table className="w-full self-start text-[15px]">
          <tbody>
            {DAYS.find((d) => d.phare)!.slots.map(([h, t]) => (
              <tr key={h} className="border-t border-white/15">
                <td className="w-20 py-3.5 align-top font-semibold text-sun">{h}</td>
                <td className="py-3.5 text-white/85">{t}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Women() {
  return (
    <section className="py-24 sm:py-32">
      <div className={`${WRAP} grid gap-14 md:grid-cols-[1fr_1.15fr]`}>
        <div>
          <h2 className="display text-4xl sm:text-5xl">Les métiers de l’industrie au féminin</h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">Table ronde du jeudi 19 novembre, à 15 heures. Cinq industrielles sont pressenties.</p>
          <Photo name="atelier" alt="Ouvrières dans un atelier textile de la zone franche" className="leaf mt-10 aspect-[4/3]" />
        </div>
        <ul className="self-start border-t border-forest/15">
          {SPEAKERS.map(([name, org]) => (
            <li key={name} className="border-b border-forest/15 py-6">
              <p className="text-xl font-semibold text-forest [font-stretch:110%]">{name}</p>
              <p className="mt-1 text-ink/65">{org}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Places() {
  return (
    <section id="lieux" className="bg-sage py-24 sm:py-32">
      <div className={WRAP}>
        <h2 className="display max-w-3xl text-4xl sm:text-5xl">Les sites ouverts, du port aux régions</h2>
        <Photo name="port" alt="Porte-conteneurs à quai au Lomé Container Terminal" position="center 45%" className="leaf-alt mt-14 aspect-[4/3] sm:aspect-[2/1]" />
        <dl className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {PLACES.map(([t, d]) => (
            <div key={t} className="border-t border-forest/20 pt-5">
              <dt className="text-lg font-semibold text-forest">{t}</dt>
              <dd className="mt-2 max-w-[34ch] leading-relaxed text-ink/70">{d}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-24 grid gap-10 md:grid-cols-[1fr_1.15fr]">
          <h3 className="text-2xl font-semibold text-forest [font-stretch:112%]">Avec</h3>
          <p className="text-lg leading-relaxed text-ink/75">{PARTNERS.join(', ')}.</p>
        </div>
      </div>
    </section>
  )
}

function Contact() {
  const [sent, setSent] = useState(false)
  const submit = (e: FormEvent) => { e.preventDefault(); setSent(true) }
  const field = 'mt-2 w-full border-0 border-b border-forest/25 bg-transparent px-0 py-3 text-lg text-ink placeholder:text-ink/35 focus:border-forest focus:outline-none focus:ring-0'
  return (
    <section id="contact" className="py-24 sm:py-32">
      <div className={`${WRAP} grid gap-14 md:grid-cols-[1fr_1.15fr]`}>
        <div>
          <h2 className="display text-4xl sm:text-5xl">Une question ?</h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">Presse, entreprise, établissement scolaire ou partenaire : écrivez à l’équipe d’organisation.</p>
        </div>
        {sent ? (
          <p className="self-center text-xl text-forest">Merci, votre message a bien été pris en compte.</p>
        ) : (
          <form onSubmit={submit} className="grid gap-8 sm:grid-cols-2">
            <label className="block text-[15px] font-medium text-forest">Nom<input required name="nom" className={field} /></label>
            <label className="block text-[15px] font-medium text-forest">Organisation<input name="organisation" className={field} /></label>
            <label className="block text-[15px] font-medium text-forest sm:col-span-2">Adresse e-mail<input required type="email" name="email" className={field} /></label>
            <label className="block text-[15px] font-medium text-forest sm:col-span-2">Message<textarea required name="message" rows={4} className={`${field} resize-none`} /></label>
            <div className="sm:col-span-2">
              <button type="submit" className="bg-forest px-8 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-ink">Envoyer</button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

/* Comptes officiels, relevés sur investissement.gouv.tg */
const SOCIALS: [string, string, string][] = [
  ['X', 'https://x.com/promo_investtg', 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'],
  ['Facebook', 'https://www.facebook.com/PromoInvestTogo/', 'M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.931-1.956 1.886v2.265h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z'],
  ['LinkedIn', 'https://www.linkedin.com/company/minist%C3%A8re-de-la-promotion-de-l-investissement/', 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'],
]

function Footer() {
  return (
    <footer className="border-t border-forest/15 bg-white">
      <div className={`${WRAP} grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]`}>
        <div>
          <img
            src="/images/armoiries.png"
            alt="République togolaise, Ministère délégué chargé de la Promotion des investissements, de l’Industrie et de la Souveraineté économique"
            className="h-28 w-auto"
          />
        </div>
        <div>
          <p className="font-semibold text-forest">La semaine</p>
          <ul className="mt-4 space-y-2.5 text-ink/70">
            <li><a href="#programme" className="hover:text-forest">Programme</a></li>
            <li><a href="#vendredi" className="hover:text-forest">Journée phare du 20 novembre</a></li>
            <li><a href="#lieux" className="hover:text-forest">Sites ouverts</a></li>
            <li><a href="#contact" className="hover:text-forest">Contact</a></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold text-forest">Suivre le Ministère</p>
          <ul className="mt-4 flex gap-3">
            {SOCIALS.map(([label, href, path]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="grid h-11 w-11 place-items-center rounded-full border border-forest/20 text-forest transition-colors hover:border-forest hover:bg-forest hover:text-white">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
                </a>
              </li>
            ))}
          </ul>
          <a href="https://investissement.gouv.tg/" target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-ink/70 underline decoration-forest/30 underline-offset-4 hover:text-forest">
            investissement.gouv.tg
          </a>
        </div>
      </div>
      <div className="border-t border-forest/10">
        <div className={`${WRAP} flex flex-col gap-3 py-6 text-sm text-ink/55 sm:flex-row sm:items-center sm:justify-between`}>
          <p>© 2026 Semaine de l’industrie · République togolaise</p>
          <p className="flex items-center gap-2 font-semibold text-forest">
            <Mark className="h-5 w-auto text-leaf" />#SemaineIndustrie2026
          </p>
        </div>
      </div>
    </footer>
  )
}

/* Page d'accueil du site public. */
export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <About />
        <Programme />
        <Friday />
        <Women />
        <Places />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
