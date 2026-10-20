import { useState, type FormEvent } from 'react'
import { sendContactMessage } from '../api/contact'
import { SPEAKERS, PLACES, PARTNERS, YOUTH_PILLAR } from '../data'
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
  ['7 jours', 'Un thème par jour, du lundi au dimanche'],
  ['16 au 22 nov.', 'Journée phare le vendredi 20'],
  ['Lomé + régions', 'Du port aux sites industriels'],
]

/* Classe commune des champs du formulaire de contact. */
const CONTACT_INPUT =
  'w-full border-0 border-b border-forest/25 bg-transparent px-0 py-2 text-lg text-ink placeholder:text-ink/35 focus:border-forest focus:outline-none focus:ring-0'

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

/* Hero : slogan en display, phrase support, deux CTA, dates en secondaire. */
function Hero() {
  return (
    <section id="top" className="relative isolate flex min-h-[560px] items-end overflow-hidden rounded-br-[4rem] bg-forest text-white sm:h-[80svh] sm:max-h-[820px] sm:rounded-br-[8rem]">
      <img
        src="/images/hall.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-45"
      />
      {/* Voile forest, même traitement que le panneau login */}
      <div className="absolute inset-0 -z-10 bg-forest/55" />
      <div className={`${WRAP} pb-14 pt-24 sm:pb-20`}>
        <h1 className="display animate-rise max-w-4xl text-[clamp(2.75rem,7.5vw,6.5rem)] !text-white">
          {CAMPAIGN_TAGLINE.replace(/\.$/, '')}<span className="text-leaf">.</span>
        </h1>
        <p className="animate-rise mt-7 max-w-xl text-lg leading-relaxed text-white/85 [animation-delay:120ms] sm:text-xl">
          Pendant une semaine, les usines ouvrent leurs portes aux élèves, aux étudiants et au public.
        </p>
        <div className="animate-rise mt-9 flex flex-wrap gap-3 [animation-delay:220ms]">
          <Button to="/programme" variant="onDark">Voir le programme</Button>
          <Button to="/carte" variant="accent">Explorer la carte</Button>
        </div>
        <p className="animate-rise mt-10 text-[15px] text-white/70 [animation-delay:320ms]">
          Du 16 au 22 novembre 2026, à Lomé et dans les régions
        </p>
      </div>
    </section>
  )
}

/* Section outils : le parcours Rêver, Comprendre, Commencer en liste simple. */
function Tools() {
  return (
    <section className="py-20 sm:py-28">
      <div className={WRAP}>
        <SectionHeader
          className="reveal"
          eyebrow="Parcours numérique"
          title={YOUTH_PILLAR.title}
          lead="Trois étapes pour passer de la curiosité à l’action, sur téléphone ou ordinateur."
        />
        <ol className="mt-14 grid gap-x-10 gap-y-0 md:grid-cols-3">
          {YOUTH_PILLAR.steps.map((step, i) => {
            const item = TOOL_STEPS[step]
            return (
              <li key={step} className="reveal flex flex-col border-y border-forest/15 py-8" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="text-sm font-semibold text-energy">0{i + 1}</span>
                <h3 className="display mt-3 text-3xl sm:text-4xl">{step}</h3>
                <p className="mt-4 max-w-[34ch] leading-relaxed text-muted">{item.text}</p>
                <div className="mt-6">
                  <Button to={item.to} variant="link">{item.cta}</Button>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

/* Chiffres repères : trois valeurs en grand, sans statistiques inventées. */
function KeyFigures() {
  return (
    <section className="bg-sage py-16 sm:py-20">
      <dl className={`${WRAP} grid gap-10 md:grid-cols-3`}>
        {KEY_FIGURES.map(([value, label], i) => (
          <div key={value} className="reveal" style={{ transitionDelay: `${i * 90}ms` }}>
            <dt className="display text-[clamp(2.25rem,5vw,3.75rem)]">{value}</dt>
            <dd className="mt-3 max-w-[30ch] leading-relaxed text-muted">{label}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/* Présentation de la semaine et de son fil rouge. */
function About() {
  return (
    <section className="py-24 sm:py-32">
      <div className={`${WRAP} grid gap-12 md:grid-cols-[1fr_1.15fr]`}>
        <div className="reveal">
          <h2 className="display text-4xl sm:text-5xl">Voir ce que le Togo fabrique, où, et par qui.</h2>
          <Photo name="eleves" alt="Lycéennes et lycéens dans la cour d’un établissement togolais" className="leaf-alt mt-12 aspect-[4/3]" />
        </div>
        <div className="reveal space-y-6 text-lg leading-relaxed text-ink/80" style={{ transitionDelay: '120ms' }}>
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

/* Renvoi court vers la page programme (détail hors accueil). */
function ProgrammeTeaser() {
  return (
    <section className="bg-sage py-16 sm:py-20">
      <div className={`${WRAP} reveal grid gap-8 md:grid-cols-[1fr_auto] md:items-end`}>
        <div>
          <h2 className="display text-4xl sm:text-5xl">Le programme</h2>
          <p className="mt-4 max-w-xl text-lg text-ink/70">
            Sept jours, un thème par jour, du 16 au 22 novembre. Journée phare le vendredi 20.
          </p>
        </div>
        <Button to="/programme" variant="primary">Voir le programme</Button>
      </div>
    </section>
  )
}

/* Table ronde des femmes dans l'industrie et liste des intervenantes. */
function Women() {
  return (
    <section className="py-24 sm:py-32">
      <div className={`${WRAP} grid gap-14 md:grid-cols-[1fr_1.15fr]`}>
        <div className="reveal">
          <h2 className="display text-4xl sm:text-5xl">Les métiers de l’industrie au féminin</h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">Table ronde du jeudi 19 novembre, à 15 heures. Cinq industrielles sont pressenties.</p>
          <Photo name="atelier" alt="Ouvrières dans un atelier textile de la zone franche" className="leaf mt-10 aspect-[4/3]" />
        </div>
        <ul className="reveal self-start border-t border-forest/15" style={{ transitionDelay: '120ms' }}>
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

/* Sites ouverts et partenaires. */
function Places() {
  return (
    <section id="lieux" className="bg-sage py-24 sm:py-32">
      <div className={WRAP}>
        <h2 className="display reveal max-w-3xl text-4xl sm:text-5xl">Les sites ouverts, du port aux régions</h2>
        <Photo name="port" alt="Porte-conteneurs à quai au Lomé Container Terminal" position="center 45%" className="leaf-alt reveal mt-14 aspect-[4/3] sm:aspect-[2/1]" />
        <dl className="reveal mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {PLACES.map(([t, d]) => (
            <div key={t} className="border-t border-forest/20 pt-5">
              <dt className="text-lg font-semibold text-forest">{t}</dt>
              <dd className="mt-2 max-w-[34ch] leading-relaxed text-ink/70">{d}</dd>
            </div>
          ))}
        </dl>
        <div className="reveal mt-24 grid gap-10 md:grid-cols-[1fr_1.15fr]">
          <h3 className="text-2xl font-semibold text-forest [font-stretch:112%]">Avec</h3>
          <p className="text-lg leading-relaxed text-ink/75">{PARTNERS.join(', ')}.</p>
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
    <section id="contact" className="py-24 sm:py-32">
      <div className={`${WRAP} grid gap-14 md:grid-cols-[1fr_1.15fr]`}>
        <div className="reveal">
          <h2 className="display text-4xl sm:text-5xl">Une question ?</h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/70">
            Presse, entreprise, établissement scolaire ou partenaire : écrivez à{' '}
            <a href="mailto:infos@semaineindustrie.tg" className="font-semibold text-forest underline underline-offset-2">
              infos@semaineindustrie.tg
            </a>
            .
          </p>
        </div>
        {sent ? (
          <p className="self-center text-xl text-forest">Merci, votre message a bien été pris en compte.</p>
        ) : (
          <form onSubmit={submit} className="reveal grid gap-8 sm:grid-cols-2" style={{ transitionDelay: '120ms' }}>
            <Field label="Nom"><input required name="nom" className={CONTACT_INPUT} /></Field>
            <Field label="Organisation" optional><input name="organisation" className={CONTACT_INPUT} /></Field>
            <Field label="Adresse e-mail" className="sm:col-span-2"><input required type="email" name="email" className={CONTACT_INPUT} /></Field>
            <Field label="Message" className="sm:col-span-2"><textarea required name="message" rows={4} className={`${CONTACT_INPUT} resize-none`} /></Field>
            {error && <p role="alert" className="text-[15px] text-red-700 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
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

/* Page d'accueil du site public. */
export default function HomePage() {
  const mainRef = useRevealInView<HTMLElement>()
  return (
    <>
      <Seo path="/" />
      <main ref={mainRef}>
        <Hero />
        <Tools />
        <KeyFigures />
        <About />
        <ProgrammeTeaser />
        <Women />
        <Places />
        <Contact />
      </main>
    </>
  )
}
