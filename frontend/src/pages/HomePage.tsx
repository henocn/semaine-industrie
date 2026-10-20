import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { sendContactMessage } from '../api/contact'
import { DAYS, SPEAKERS, PLACES, PARTNERS, YOUTH_PILLAR } from '../data'
import { Seo } from '../components/Seo'
import { CAMPAIGN_TAGLINE, WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'
import { useRevealInView } from '../hooks/useReveal'

/* Étapes du parcours numérique : texte court et lien vers une page existante. */
const TOOL_STEPS: Record<(typeof YOUTH_PILLAR.steps)[number], { text: string; to: string; cta: string }> = {
  Rêver: {
    text: 'Découvrez les usines, les produits et les métiers du Togo, près de chez vous.',
    to: '/industrie',
    cta: 'Découvrir l’industrie',
  },
  Comprendre: {
    text: 'Des ressources labellisées pour saisir comment on fabrique, et pourquoi ici.',
    to: '/ressources',
    cta: 'Voir les ressources',
  },
  Commencer: {
    text: 'Entreprise ou établissement : demandez le label et rejoignez la semaine.',
    to: '/label',
    cta: 'Demander le label',
  },
}

/* Chiffres repères de l'édition, sans indicateur inventé. */
const KEY_FIGURES: [string, string][] = [
  ['7 jours', 'Un thème par jour'],
  ['16 au 22 nov.', 'Journée phare le 20'],
  ['Lomé + régions', 'Du port aux sites'],
]

/* Classe commune des champs du formulaire de contact. */
const CONTACT_INPUT =
  'w-full border-0 border-b border-forest/25 bg-transparent px-0 py-2 text-base text-ink placeholder:text-ink/35 focus:border-forest focus:outline-none focus:ring-0'

/* Photo : déposez le fichier dans public/images. Sans fichier, un aplat discret. */
function Photo({
  name,
  alt,
  caption,
  className = '',
  position = 'center',
  eager = false,
}: {
  name: string
  alt: string
  caption?: string
  className?: string
  position?: string
  eager?: boolean
}) {
  const [missing, setMissing] = useState(false)
  return (
    <figure>
      <div className={`relative overflow-hidden bg-sage ${className}`}>
        {missing ? (
          <span className="absolute bottom-3 left-4 text-xs text-forest/50">images/{name}.jpg</span>
        ) : (
          <img
            src={`/images/${name}.jpg`}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            onError={() => setMissing(true)}
            style={{ objectPosition: position }}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      {caption && <figcaption className="mt-2 text-[13px] text-muted">{caption}</figcaption>}
    </figure>
  )
}

/* Hero coupé : aplat forest + photo pleine, cartouche des chiffres en bas. */
function Hero() {
  return (
    <section id="top" className="relative bg-forest text-white">
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className={`${WRAP} flex flex-col justify-end py-14 sm:py-20 lg:max-w-none lg:pr-10 lg:pl-[max(1.25rem,calc((100vw-72rem)/2+2rem))]`}>
          <p className="ui-eyebrow text-sun">Semaine de l’industrie 2026</p>
          <h1 className="display h1 mt-4 max-w-xl !text-white text-balance">
            {CAMPAIGN_TAGLINE.replace(/\.$/, '')}
            <span className="text-leaf">.</span>
          </h1>
          <p className="lead mt-5 max-w-md text-white/85">
            Pendant une semaine, les usines ouvrent leurs portes aux élèves, aux étudiants et au public.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/programme" variant="onDark">
              Voir le programme
            </Button>
            <Button to="/carte" variant="accent">
              Explorer la carte
            </Button>
          </div>
        </div>
        <div className="relative min-h-[240px] overflow-hidden sm:min-h-[320px] lg:min-h-[520px]">
          <img
            src="/images/hall.jpg"
            alt=""
            aria-hidden="true"
            className="hero-photo absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-forest to-transparent lg:block" />
        </div>
      </div>

      <div className={`${WRAP} relative z-10 -mt-6 pb-10 sm:-mt-8 sm:pb-12`}>
        <dl className="cartouche reveal grid gap-6 sm:grid-cols-3 sm:gap-0">
          {KEY_FIGURES.map(([value, label], i) => (
            <div
              key={value}
              className={`sm:px-6 ${i > 0 ? 'sm:border-l sm:border-forest/15' : ''} ${i === 0 ? 'sm:pl-0' : ''}`}
            >
              <dt className="display text-2xl text-forest sm:text-[1.75rem]">{value}</dt>
              <dd className="mt-1 text-[14px] text-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* Section outils : parcours Rêver, Comprendre, Commencer. */
function Tools() {
  return (
    <section className="py-16 sm:py-24">
      <div className={WRAP}>
        <SectionHeader
          className="reveal"
          number="01"
          eyebrow="Parcours numérique"
          title={YOUTH_PILLAR.title}
          lead="Trois étapes pour passer de la curiosité à l’action."
        />
        <ol className="mt-12 grid gap-0 md:grid-cols-3">
          {YOUTH_PILLAR.steps.map((step, i) => {
            const item = TOOL_STEPS[step]
            return (
              <li
                key={step}
                className="reveal flex flex-col border-t border-forest/15 py-8 md:border-t-0 md:border-l md:border-forest/15 md:px-8 md:first:border-l-0 md:first:pl-0"
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <span className="text-sm font-semibold tabular-nums text-energy">0{i + 1}</span>
                <h3 className="display h3 mt-3">{step}</h3>
                <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted">{item.text}</p>
                <div className="mt-5">
                  <Button to={item.to} variant="link">
                    {item.cta}
                  </Button>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* Présentation de la semaine. */
function About() {
  return (
    <section className="py-16 sm:py-24">
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.1fr] md:items-start`}>
        <div className="reveal">
          <SectionHeader number="02" eyebrow="La semaine" title="Voir ce que le Togo fabrique, où, et par qui." />
          <Photo
            name="eleves"
            alt="Lycéennes et lycéens dans la cour d’un établissement togolais"
            caption="Établissement scolaire, Lomé"
            className="leaf-alt mt-10 aspect-[4/3]"
          />
        </div>
        <div className="reveal space-y-5 text-[15px] leading-relaxed text-ink/80 sm:text-base" style={{ transitionDelay: '80ms' }}>
          <p>
            La Semaine de l’industrie fait découvrir les usines et leurs métiers aux jeunes et au grand public. Elle réunit aussi investisseurs, industriels et PME locales.
          </p>
          <blockquote className="border-l-4 border-sun bg-sage px-5 py-4">
            <p className="font-semibold text-forest">
              20 novembre, Journée de l’industrialisation de l’Afrique
            </p>
            <p className="mt-1 text-[15px] text-ink/75">
              Célébrée par les Nations Unies, l’Union africaine et l’ONUDI.
            </p>
          </blockquote>
          <p>
            Fil rouge de l’édition : la souveraineté économique par la transformation locale, avec une attention particulière à la place des femmes dans l’industrie.
          </p>
        </div>
      </div>
    </section>
  )
}

/* Bande des 7 jours du programme. */
function ProgrammeStrip() {
  return (
    <section className="bg-sage py-16 sm:py-20">
      <div className={WRAP}>
        <div className="reveal flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            number="03"
            eyebrow="Du 16 au 22 novembre"
            title="Le programme"
            lead="Sept jours, un thème par jour. Journée phare le vendredi 20."
          />
          <Button to="/programme" variant="primary" className="shrink-0">
            Voir le détail
          </Button>
        </div>
        <ul className="reveal mt-10 flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-7 md:gap-0 md:overflow-visible md:pb-0">
          {DAYS.map((d) => (
            <li key={d.n} className="min-w-[7.5rem] shrink-0 md:min-w-0">
              <Link
                to={d.phare ? '/programme#vendredi' : '/programme'}
                className={
                  'flex h-full flex-col border border-forest/15 bg-white px-3 py-4 transition-colors hover:border-forest md:border-y-0 md:border-l md:border-r-0 md:first:border-l md:last:border-r '
                  + (d.phare ? 'border-sun bg-sun/30 md:border-sun' : '')
                }
              >
                <span className="font-semibold tabular-nums text-forest">{d.n}</span>
                <span className="mt-1 text-[13px] font-semibold text-forest">{d.name}</span>
                <span className="mt-2 text-[12px] leading-snug text-ink/70">{d.theme}</span>
                {d.phare && (
                  <span className="mt-3 text-[10px] font-bold uppercase tracking-[0.12em] text-forest">
                    Journée phare
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* Table ronde des femmes, section fond forest. */
function Women() {
  return (
    <section className="bg-forest py-16 text-white sm:py-24">
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.1fr]`}>
        <div className="reveal">
          <SectionHeader
            number="04"
            eyebrow="Jeudi 19 novembre"
            title="Les métiers de l’industrie au féminin"
            lead="Table ronde à 15 heures. Cinq industrielles sont pressenties."
            tone="dark"
          />
          <Photo
            name="atelier"
            alt="Ouvrières dans un atelier textile de la zone franche"
            caption="Zone franche, atelier textile"
            className="leaf mt-10 aspect-[4/3]"
          />
        </div>
        <ul className="reveal self-start border-t border-white/20" style={{ transitionDelay: '80ms' }}>
          {SPEAKERS.map(([name, org]) => {
            const initials = name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()
            return (
              <li key={name} className="flex gap-4 border-b border-white/20 py-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center bg-white/10 text-[13px] font-semibold text-sun">
                  {initials}
                </span>
                <div>
                  <p className="text-lg font-semibold text-white">{name}</p>
                  <p className="mt-1 text-[14px] text-white/70">{org}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* Sites ouverts et partenaires en grille. */
function Places() {
  return (
    <section id="lieux" className="py-16 sm:py-24">
      <div className={WRAP}>
        <SectionHeader
          className="reveal"
          number="05"
          eyebrow="Sur le terrain"
          title="Les sites ouverts, du port aux régions"
        />
        <Photo
          name="port"
          alt="Porte-conteneurs à quai au Lomé Container Terminal"
          caption="Port autonome de Lomé"
          position="center 45%"
          className="leaf-alt reveal mt-10 aspect-[4/3] sm:aspect-[2/1]"
        />
        <dl className="reveal mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {PLACES.map(([t, d]) => (
            <div key={t} className="border-t border-forest/20 pt-4">
              <dt className="text-[15px] font-semibold text-forest">{t}</dt>
              <dd className="mt-2 max-w-[34ch] text-[14px] leading-relaxed text-ink/75">{d}</dd>
            </div>
          ))}
        </dl>
        <div className="reveal mt-16">
          <p className="ui-eyebrow">Avec</p>
          <ul className="mt-4 grid gap-0 border border-forest/15 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNERS.map((p) => (
              <li
                key={p}
                className="border-b border-forest/15 px-4 py-4 text-[14px] text-ink/80 sm:border-r sm:odd:border-l-0 lg:[&:nth-child(4n)]:border-r-0"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* Formulaire de contact. */
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
        organization: String(fd.get('organisation') || '') || undefined,
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
    <section id="contact" className="border-t border-forest/10 bg-sage py-16 sm:py-24">
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="reveal">
          <SectionHeader number="06" eyebrow="Contact" title="Une question ?" />
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink/75">
            Presse, entreprise, établissement scolaire ou partenaire : écrivez-nous.
          </p>
          <a
            href="mailto:infos@semaineindustrie.tg"
            className="mt-6 inline-flex items-center gap-2 font-semibold text-forest hover:text-energy"
          >
            <Mail className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            infos@semaineindustrie.tg
          </a>
        </div>
        {sent ? (
          <p className="self-center text-lg text-forest">Merci, votre message a bien été pris en compte.</p>
        ) : (
          <form onSubmit={submit} className="reveal grid gap-8 sm:grid-cols-2" style={{ transitionDelay: '80ms' }}>
            <Field label="Nom">
              <input required name="nom" className={CONTACT_INPUT} />
            </Field>
            <Field label="Organisation" optional>
              <input name="organisation" className={CONTACT_INPUT} />
            </Field>
            <Field label="Adresse e-mail" className="sm:col-span-2">
              <input required type="email" name="email" className={CONTACT_INPUT} />
            </Field>
            <Field label="Message" className="sm:col-span-2">
              <textarea required name="message" rows={4} className={`${CONTACT_INPUT} resize-none`} />
            </Field>
            {error && (
              <p role="alert" className="text-[15px] text-flag sm:col-span-2">
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" variant="primary" disabled={loading} withArrow={!loading}>
                {loading ? 'Envoi…' : 'Envoyer'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

/* Page d'accueil du site public. */
export default function HomePage() {
  const mainRef = useRevealInView<HTMLElement>()
  return (
    <>
      <Seo path="/" />
      <main ref={mainRef}>
        <Hero />
        <Tools />
        <About />
        <ProgrammeStrip />
        <Women />
        <Places />
        <Contact />
      </main>
    </>
  )
}
