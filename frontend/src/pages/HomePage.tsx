import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { sendContactMessage } from '../api/contact'
import { DAYS, SPEAKERS, PLACES, PARTNERS, YOUTH_PILLAR } from '../data'
import { Seo } from '../components/Seo'
import { CAMPAIGN_TAGLINE, WRAP } from '../components/layout/Mark'
import { publicSeo } from '../lib/seo'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useRevealInView } from '../hooks/useReveal'

/* Étapes du parcours : texte court et lien. */
const TOOL_STEPS: Record<(typeof YOUTH_PILLAR.steps)[number], { text: string; to: string; cta: string }> = {
  Rêver: {
    text: 'Découvrez les usines, les produits et les métiers du Togo, près de chez vous.',
    to: '/industrie',
    cta: 'L’industrie',
  },
  Comprendre: {
    text: 'Des ressources labellisées pour saisir comment on fabrique, et pourquoi ici.',
    to: '/ressources',
    cta: 'Ressources',
  },
  Commencer: {
    text: 'Industries : demandez le label et rejoignez la semaine.',
    to: '/label',
    cta: 'Demander le label',
  },
}

/* Chiffres repères, sans KPI inventé. */
const KEY_FIGURES: [string, string][] = [
  ['7 jours', 'Un thème par jour'],
  ['16 au 22 nov.', 'Journée phare le 20'],
  ['Lomé + régions', 'Du port aux sites'],
]

const CONTACT_INPUT =
  'w-full border-0 border-b border-forest/25 bg-transparent px-0 py-2 text-base text-ink placeholder:text-ink/35 focus:border-forest focus:outline-none focus:ring-0'

/* Photo locale rectangulaire, aplat sage si fichier manquant. */
function Photo({
  name,
  alt,
  className = '',
  position = 'center',
}: {
  name: string
  alt: string
  className?: string
  position?: string
}) {
  const [missing, setMissing] = useState(false)
  return (
    <div className={`photo-frame relative overflow-hidden bg-sage ${className}`}>
      {missing ? (
        <span className="absolute bottom-3 left-4 text-xs text-forest/50">images/{name}.jpg</span>
      ) : (
        <img
          src={`/images/${name}.jpg`}
          alt={alt}
          loading="lazy"
          onError={() => setMissing(true)}
          style={{ objectPosition: position }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  )
}

/* Hero : photo en fond, texte dans le flux (jamais recouvert), contraste AA. */
function Hero() {
  return (
    <section id="top" className="relative z-0 isolate bg-forest text-white">
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <img
            src="/images/hall.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="hero-overlay" />
        </div>
        <div className={`${WRAP} relative z-10 flex min-h-[28rem] flex-col justify-end py-16 sm:min-h-[34rem] sm:py-20`}>
          <h1 className="hero-copy display max-w-2xl !text-white text-balance text-[clamp(2.5rem,1.6rem+3.5vw,4.75rem)] font-extrabold leading-[1.05]">
            {CAMPAIGN_TAGLINE.replace(/\.$/, '')}
            <span className="text-leaf">.</span>
          </h1>
          <p className="hero-copy mt-4 max-w-md text-base leading-relaxed text-white">
            Pendant une semaine, les usines ouvrent leurs portes aux élèves, aux étudiants et au public.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <Button to="/programme" variant="onDark">
              Programme
            </Button>
            <Button to="/label" variant="accent">
              Demander un label
            </Button>
          </div>
          <p className="hero-copy mt-8 text-sm text-white">16 au 22 novembre 2026 · Lomé et les régions</p>
        </div>
      </div>
      <div className={`relative z-10 ${WRAP} border-t border-white/15 py-6`}>
        <dl className="grid gap-5 sm:grid-cols-3 sm:gap-8">
          {KEY_FIGURES.map(([value, label]) => (
            <div key={value}>
              <dt className="text-[15px] font-semibold text-white">{value}</dt>
              <dd className="mt-0.5 text-sm text-white/90">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* Parcours Rêver / Comprendre / Commencer. */
function Tools() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div className="section-soft-bg" style={{ backgroundImage: 'url(/images/bg-robots.png)' }} aria-hidden="true" />
      <div className={`${WRAP} reveal`}>
        <SectionHeader
          title={YOUTH_PILLAR.title}
          lead="Trois étapes pour passer de la curiosité à l’action."
        />
        <ol className="mt-8 grid gap-8 border-t border-forest/15 pt-8 md:grid-cols-3 md:gap-10">
          {YOUTH_PILLAR.steps.map((step, i) => {
            const item = TOOL_STEPS[step]
            return (
              <li key={step}>
                <p className="text-[13px] text-ink/50">{i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold text-forest">{step}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/70">{item.text}</p>
                <Link to={item.to} className="mt-3 inline-block text-[14px] font-semibold text-forest underline decoration-forest/25 underline-offset-4 hover:decoration-forest">
                  {item.cta}
                </Link>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* Présentation courte : titre puis photo + texte côte à côte. */
function About() {
  return (
    <section className="bg-sage py-12 sm:py-16">
      <div className={`${WRAP} reveal`}>
        <SectionHeader title="Voir ce que le Togo fabrique, où, et par qui." />
        <div className="mt-8 grid gap-8 md:grid-cols-2 md:items-start md:gap-10">
          <Photo name="eleves" alt="Lycéennes et lycéens dans un établissement togolais" className="aspect-[4/3]" />
          <div className="space-y-4 text-[15px] leading-relaxed text-ink/80">
            <p>
              La Semaine de l’industrie fait découvrir les usines et leurs métiers aux jeunes et au grand public. Elle réunit aussi investisseurs, industriels et PME locales.
            </p>
            <p>
              Date repère : le <strong className="font-semibold text-forest">20 novembre</strong>, Journée de l’industrialisation de l’Afrique.
            </p>
            <p>
              Fil rouge : souveraineté économique par la transformation locale, avec une attention à la place des femmes dans l’industrie.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* Accueil : aperçu du jour J uniquement, un seul lien vers /programme. */
function ProgrammeStrip() {
  const dayJ = DAYS.find((d) => d.phare) ?? DAYS.find((d) => d.n === 20)
  if (!dayJ) return null

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div className="section-soft-bg" style={{ backgroundImage: 'url(/images/bg-usine.png)' }} aria-hidden="true" />
      <div className={`${WRAP} reveal max-w-3xl`}>
        <SectionHeader
          title="Journée phare"
          lead="Vendredi 20 novembre, Journée de l’industrialisation de l’Afrique."
        />
        <p className="mt-6 text-[15px] leading-relaxed text-ink/75">{dayJ.goal}</p>
        <p className="mt-2 text-[13px] text-ink/55">{dayJ.where}</p>
        <ul className="mt-6 space-y-2.5 border-t border-forest/15 pt-6">
          {dayJ.slots.map(([h, t]) => (
            <li key={h + t} className="grid grid-cols-[3.5rem_1fr] gap-3 text-[14px]">
              <span className="font-medium tabular-nums text-forest">{h}</span>
              <span className="text-ink/75">{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button to="/programme" variant="outline">
            Tout le programme
          </Button>
        </div>
      </div>
    </section>
  )
}

/* Intervenantes pressenties. */
function Women() {
  return (
    <section className="border-t border-forest/10 py-12 sm:py-16">
      <div className={`${WRAP} grid gap-10 md:grid-cols-[1fr_1.1fr]`}>
        <div className="reveal">
          <SectionHeader
            title="Les métiers de l’industrie au féminin"
            lead="Panel du jeudi 19 novembre, à 9h30."
          />
          <Photo name="atelier" alt="Ouvrières dans un atelier textile" className="mt-8 aspect-[4/3]" />
        </div>
        <ul className="reveal self-start border-t border-forest/15" style={{ transitionDelay: '60ms' }}>
          {SPEAKERS.map(([name, org]) => (
            <li key={name} className="border-b border-forest/15 py-4">
              <p className="font-semibold text-forest">{name}</p>
              <p className="mt-0.5 text-[14px] text-ink/65">{org}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* Sites et partenaires. */
function Places() {
  return (
    <section id="lieux" className="relative overflow-hidden bg-sage py-12 sm:py-16">
      <div className="section-soft-bg" style={{ backgroundImage: 'url(/images/bg-industrie.png)' }} aria-hidden="true" />
      <div className={`${WRAP} reveal`}>
        <SectionHeader title="Les sites ouverts, du port aux régions" />
        <Photo
          name="port"
          alt="Porte-conteneurs au Lomé Container Terminal"
          position="center 45%"
          className="mt-8 aspect-[16/9] max-h-64 w-full sm:max-h-72"
        />
        <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {PLACES.map(([t, d]) => (
            <div key={t}>
              <dt className="font-semibold text-forest">{t}</dt>
              <dd className="mt-1.5 max-w-[36ch] text-[14px] leading-relaxed text-ink/70">{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-12 text-[14px] leading-relaxed text-ink/70">
          <span className="font-semibold text-forest">Avec </span>
          {PARTNERS.join(', ')}.
        </p>
      </div>
    </section>
  )
}

/* Formulaire contact. */
function Contact() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /* Envoie le message vers infos@. */
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await sendContactMessage({
        name: String(fd.get('nom') || ''),
        email: String(fd.get('email') || ''),
        message: String(fd.get('message') || ''),
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="contact" className="py-12 sm:py-16">
      <div className={`${WRAP} grid gap-10 md:grid-cols-2`}>
        <div className="reveal">
          <SectionHeader title="Une question ?" />
          <p className="mt-3 text-[15px] leading-relaxed text-ink/70">
            Presse, entreprise, établissement ou partenaire :{' '}
            <a href="mailto:infos@semaineindustrie.tg" className="font-semibold text-forest underline underline-offset-2">
              infos@semaineindustrie.tg
            </a>
          </p>
        </div>
        {sent ? (
          <p className="self-center text-forest">Merci, votre message a bien été pris en compte.</p>
        ) : (
          <form onSubmit={submit} className="reveal grid gap-6" style={{ transitionDelay: '60ms' }}>
            <Field label="Nom">
              <input required name="nom" className={CONTACT_INPUT} />
            </Field>
            <Field label="Adresse e-mail">
              <input required type="email" name="email" className={CONTACT_INPUT} />
            </Field>
            <Field label="Message">
              <textarea required name="message" rows={4} className={`${CONTACT_INPUT} resize-none`} />
            </Field>
            {error && (
              <p role="alert" className="text-[14px] text-flag">
                {error}
              </p>
            )}
            <div>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

/* Accueil public. */
export default function HomePage() {
  const mainRef = useRevealInView<HTMLElement>()
  return (
    <>
      <Seo {...publicSeo('/')} />
      <main ref={mainRef}>
        <Hero />
        <div className="relative z-10 bg-white">
          <Tools />
          <About />
          <ProgrammeStrip />
          <Women />
          <Places />
          <Contact />
        </div>
      </main>
    </>
  )
}
