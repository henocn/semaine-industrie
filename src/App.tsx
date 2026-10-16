import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useInView, useScroll, useTransform } from 'motion/react'
import {
  ArrowRight, ArrowUpRight, Eye, Handshake, BookOpenText, Factory, Star, Video, MapPin,
  Mail, ListChecks, BadgeCheck, UserCheck, Bus, Timer, Camera, Store, Baby, Menu, X,
  Megaphone, Clapperboard, Sparkles,
} from 'lucide-react'
import { DAYS, SPEAKERS, POLES, PARTNERS, KPIS } from './data'
import { Img, LabelSticker, Logo, Mark, Reveal, SectionHead } from './components/ui'

const WRAP = 'mx-auto w-full max-w-7xl px-5 sm:px-8'
const START = new Date('2026-11-16T09:00:00Z').getTime()

/* ======================================================= NAV */
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const links = [['Concept', '#concept'], ['Programme', '#programme'], ['Journée phare', '#phare'], ['Sites', '#sites'], ['Participer', '#participer']]
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-pine/85 py-3 shadow-lg shadow-black/10 backdrop-blur-xl' : 'py-6'}`}>
      <nav className={`${WRAP} flex items-center justify-between`}>
        <a href="#top" aria-label="Accueil"><Logo /></a>
        <ul className="hidden items-center gap-8 text-sm text-white/75 lg:flex">
          {links.map(([l, h]) => <li key={h}><a href={h} className="transition hover:text-lime">{l}</a></li>)}
        </ul>
        <a href="#participer" className="leaf-sm hidden items-center gap-2 bg-lime px-5 py-2.5 text-sm font-semibold text-pine transition hover:bg-white lg:inline-flex">
          Demander le label <ArrowUpRight size={16} />
        </a>
        <button onClick={() => setOpen(!open)} className="text-white lg:hidden" aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.ul initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className={`${WRAP} mt-4 flex flex-col gap-1 pb-4 lg:hidden`}>
            {links.map(([l, h]) => (
              <li key={h}><a onClick={() => setOpen(false)} href={h} className="block rounded-lg bg-white/5 px-4 py-3 text-white">{l}</a></li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  )
}

/* ======================================================= HERO */
function Countdown() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const d = Math.max(0, START - now)
  const parts = [[Math.floor(d / 864e5), 'jours'], [Math.floor(d / 36e5) % 24, 'heures'], [Math.floor(d / 6e4) % 60, 'min'], [Math.floor(d / 1e3) % 60, 'sec']] as const
  return (
    <div className="flex gap-2">
      {parts.map(([v, l]) => (
        <div key={l} className="min-w-[64px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center backdrop-blur">
          <div className="font-display text-2xl font-bold tabular-nums text-white">{String(v).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/50">{l}</div>
        </div>
      ))}
    </div>
  )
}

const STAIRS = [
  { label: 'Ressource', img: null, h: 'h-[38%]' },
  { label: 'Structuration', img: 'structuration', h: 'h-[54%]' },
  { label: 'Transformation', img: 'transformation', h: 'h-[70%]' },
  { label: 'Progrès', img: 'progres', h: 'h-[88%]' },
]

function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [0, 120])
  return (
    <section id="top" ref={ref} className="noise relative isolate overflow-hidden bg-pine pb-20 pt-36 text-white lg:min-h-screen lg:pb-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_80%_20%,#0b6b4f_0%,transparent_55%),radial-gradient(ellipse_at_10%_90%,#03483a_0%,transparent_60%)]" />
      <div className="grid-bg absolute inset-0 -z-10" />
      <div className={`${WRAP} grid items-end gap-14 lg:grid-cols-[1.05fr_1fr]`}>
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="eyebrow flex items-center gap-3 text-sun">
            <span className="h-px w-8 bg-sun" /> Togo · 16 — 22 novembre 2026
          </motion.p>
          <h1 className="mt-6 font-display text-[clamp(3rem,8vw,6.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.03em]">
            {['L’industrie', 'en mouvement.'].map((w, i) => (
              <span key={w} className="block overflow-hidden">
                <motion.span className={`block ${i ? 'grad-text' : ''}`} initial={{ y: '105%' }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}>{w}</motion.span>
              </span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-8 max-w-xl text-lg leading-relaxed text-white/70">
            Une semaine pour voir l’industrie togolaise au travail : usines ouvertes, forum, rencontres d’affaires et métiers, à Lomé et dans les régions.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="mt-10 flex flex-wrap items-center gap-4">
            <a href="#programme" className="leaf-sm group inline-flex items-center gap-3 bg-lime px-7 py-4 font-semibold text-pine transition hover:bg-white">
              Voir le programme <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </a>
            <a href="#phare" className="inline-flex items-center gap-2 px-2 py-4 font-medium text-white/80 transition hover:text-sun">
              <Star size={18} className="text-sun" /> Journée phare · vendredi 20
            </a>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.85 }} className="mt-12">
            <p className="eyebrow mb-3 text-white/40">Ouverture dans</p>
            <Countdown />
          </motion.div>
        </div>

        {/* Escalier de feuilles : Ressource → Progrès */}
        <motion.div style={{ y }} className="relative hidden h-[560px] items-end gap-3 lg:flex">
          {STAIRS.map((s, i) => (
            <motion.div key={s.label} className={`group relative flex-1 ${s.h}`}
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}>
              <p className="eyebrow absolute -top-7 left-0 flex items-center gap-2 text-[10px] text-white/80">
                <span className="leaf-sm h-2.5 w-2.5 bg-lime" />{s.label}
              </p>
              {s.img
                ? <Img name={s.img} alt={s.label} className="leaf h-full w-full" />
                : <div className="leaf h-full w-full bg-gradient-to-br from-leaf to-lime" />}
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className={`${WRAP} mt-20 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-3`}>
        {[[Factory, 'Usines ouvertes', 'Toute la semaine'], [Star, 'Journée phare', 'Vendredi 20 novembre'], [Video, 'Récit et médias', 'Avant, pendant, après']].map(([I, t, s]) => {
          const Icon = I as typeof Factory
          return (
            <div key={t as string} className="flex items-center gap-4">
              <span className="leaf-sm grid h-12 w-12 place-items-center border border-white/15 text-lime"><Icon size={20} /></span>
              <div><p className="font-semibold">{t as string}</p><p className="text-sm text-white/50">{s as string}</p></div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Marquee() {
  const words = ['Ressource', 'Structuration', 'Transformation', 'Progrès', 'Made in Togo', 'Souveraineté économique', 'Emploi des jeunes', 'Usines ouvertes']
  return (
    <div className="overflow-hidden border-y border-forest/10 bg-lime py-5 text-pine">
      <div className="marquee flex w-max gap-10 font-display text-2xl font-bold uppercase tracking-tight">
        {[...words, ...words].map((w, i) => <span key={i} className="flex items-center gap-10">{w}<Mark className="h-5 w-auto text-forest" /></span>)}
      </div>
    </div>
  )
}

/* ======================================================= AMBITION */
function Ambition() {
  const cards = [
    { icon: Eye, t: 'Faire découvrir', d: 'Les usines et les métiers aux jeunes et au grand public, sur le modèle des semaines de l’industrie française et américaine.' },
    { icon: Handshake, t: 'Connecter', d: 'Investisseurs, PME locales et industriels, avec des rencontres d’affaires dont les résultats se mesurent.' },
    { icon: BookOpenText, t: 'Raconter', d: 'L’industrie togolaise et la souveraineté économique, par des images et des récits que médias et réseaux reprennent.' },
  ]
  return (
    <section id="concept" className="py-28 lg:py-36">
      <div className={WRAP}>
        <SectionHead num="01" eyebrow="Enjeu et ambition" title={<>Montrer l’industrie togolaise <span className="text-leaf">telle qu’elle existe déjà.</span></>}
          lead="Un rendez-vous visible, sur tout le territoire, avec un fil rouge : la souveraineté économique par la transformation locale." />
        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.t} delay={i * 0.08}>
              <article className="leaf group h-full bg-mist p-8 transition duration-500 hover:-translate-y-1 hover:bg-forest hover:text-white">
                <span className="leaf-sm grid h-14 w-14 place-items-center bg-white text-leaf transition group-hover:bg-lime group-hover:text-pine"><c.icon size={24} /></span>
                <h3 className="mt-8 font-display text-2xl font-bold">{c.t}</h3>
                <p className="mt-3 leading-relaxed text-ink/65 transition group-hover:text-white/70">{c.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-5">
          <div className="leaf-r relative grid overflow-hidden bg-forest text-white md:grid-cols-[300px_1fr]">
            <div className="flex flex-col items-center justify-center border-white/10 p-10 md:border-r">
              <span className="font-display text-8xl font-extrabold leading-none text-sun">20</span>
              <span className="eyebrow mt-2 text-white/70">Novembre</span>
            </div>
            <p className="p-10 text-lg leading-relaxed text-white/80">
              La semaine s’appuie sur une date repère : la <strong className="text-white">Journée de l’industrialisation de l’Afrique</strong> (Nations Unies, Union africaine, ONUDI). Des formats légers, décentralisés et déjà éprouvés ailleurs.
            </p>
          </div>
        </Reveal>
        <Reveal className="mt-5"><Img name="eleves" alt="Élèves en visite d’usine, casques de sécurité" className="leaf aspect-[16/7] w-full" /></Reveal>
      </div>
    </section>
  )
}

/* ======================================================= PILIERS */
function Pillars() {
  const p = [
    { icon: Factory, t: 'Usines ouvertes', w: 'Toute la semaine', d: 'Des entreprises de secteurs et de régions variés accueillent des groupes de jeunes et du public, dans un cadre labellisé par le Ministère.', img: 'mecanicien' },
    { icon: Star, t: 'Journée phare', w: 'Vendredi 20 novembre', d: 'Un forum avec le discours du Ministre, deux tables rondes et des rencontres d’affaires, le jour de l’industrialisation de l’Afrique.', img: 'entrepot', dark: true },
    { icon: Video, t: 'Récit et médias', w: 'Avant, pendant, après', d: 'Une série de portraits d’industrie, un symbole visuel unique, une diffusion sur les canaux du Ministère et des médias partenaires.', img: 'usine' },
  ]
  return (
    <section className="bg-mist py-28 lg:py-36">
      <div className={WRAP}>
        <SectionHead num="02" eyebrow="Concept et trois piliers" title="Un nom, un label, un fil rouge."
          lead="Montrer ce que le Togo fabrique, où, par qui, et ce que cela change pour l’emploi. Un axe transversal : la place des femmes dans l’industrie." />
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {p.map((x, i) => (
            <Reveal key={x.t} delay={i * 0.1}>
              <article className={`group flex h-full flex-col overflow-hidden ${i === 1 ? 'leaf-r' : 'leaf'} ${x.dark ? 'bg-forest text-white' : 'bg-white'}`}>
                <Img name={x.img} alt={x.t} className="aspect-[4/3] w-full" />
                <div className="flex flex-1 flex-col p-8">
                  <div className="flex items-center gap-3">
                    <x.icon size={20} className={x.dark ? 'text-sun' : 'text-leaf'} />
                    <span className={`eyebrow ${x.dark ? 'text-sun' : 'text-leaf'}`}>{x.w}</span>
                  </div>
                  <h3 className="mt-4 font-display text-3xl font-bold">{x.t}</h3>
                  <p className={`mt-3 leading-relaxed ${x.dark ? 'text-white/70' : 'text-ink/65'}`}>{x.d}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ======================================================= PROGRAMME */
function Programme() {
  const [active, setActive] = useState(0)
  const day = DAYS[active]
  return (
    <section id="programme" className="py-28 lg:py-36">
      <div className={WRAP}>
        <SectionHead num="03" eyebrow="Programme jour par jour" title={<>Un thème par jour, <span className="text-leaf">un message par jour.</span></>}
          lead="Hors visites d’usines, toutes les activités se tiennent au CETEF Togo 2000 à Lomé (à confirmer)." />
        <div className="mt-14 grid grid-cols-4 gap-2 sm:grid-cols-7" role="tablist">
          {DAYS.map((d, i) => {
            const on = i === active
            return (
              <button key={d.n} role="tab" aria-selected={on} onClick={() => setActive(i)}
                className={`leaf-sm relative flex flex-col items-start p-4 text-left transition duration-300 ${on ? (d.highlight ? 'bg-sun text-pine' : 'bg-forest text-white') : d.highlight ? 'bg-sun/15 text-forest hover:bg-sun/30' : 'bg-mist text-forest hover:bg-forest/10'}`}>
                <d.icon size={18} className={on ? '' : 'text-leaf'} />
                <span className="mt-3 font-display text-3xl font-bold leading-none">{d.n}</span>
                <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">{d.theme}</span>
              </button>
            )
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={day.n} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}
            className="mt-6 grid gap-10 rounded-[2rem] border border-forest/10 p-8 md:p-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="eyebrow text-leaf">{day.name} {day.n} novembre · {day.theme}</p>
              <h3 className="mt-4 font-display text-3xl font-bold leading-tight text-forest md:text-4xl">{day.goal}</h3>
              <p className="mt-6 flex items-start gap-2 text-sm text-ink/60"><MapPin size={16} className="mt-0.5 shrink-0 text-leaf" />{day.where}</p>
            </div>
            <ol className="relative">
              {day.slots.map(([h, t], i) => (
                <motion.li key={h + t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="grid grid-cols-[84px_1fr] gap-4 border-b border-forest/10 py-4 last:border-0">
                  <span className="font-display font-bold text-leaf">{h}</span>
                  <span className="text-ink/80">{t}</span>
                </motion.li>
              ))}
            </ol>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

/* ======================================================= JOURNÉE PHARE */
function Phare() {
  return (
    <section id="phare" className="noise relative overflow-hidden bg-forest py-28 text-white lg:py-36">
      <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-leaf/30 blur-[120px]" />
      <div className={`${WRAP} relative`}>
        <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Reveal>
              <span className="leaf-sm inline-flex items-center gap-2 bg-sun px-4 py-2 text-xs font-bold uppercase tracking-widest text-pine"><Star size={14} /> Vendredi 20 novembre</span>
              <h2 className="mt-8 font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
                Réunir en un même lieu décideurs, industriels, PME et <span className="grad-text">investisseurs.</span>
              </h2>
              <p className="mt-6 max-w-xl text-lg text-white/70">Journée de l’industrialisation de l’Afrique · CETEF Togo 2000. Interventions limitées à 8 minutes, questions de la salle regroupées.</p>
            </Reveal>
            <div className="mt-12 grid grid-cols-3 gap-4">
              {[['2', 'tables rondes d’une heure'], ['20 min', 'par rotation d’affaires'], ['14h—17h', 'rendez-vous préparés']].map(([v, l]) => (
                <Reveal key={l} className="border-t-2 border-sun pt-4">
                  <p className="font-display text-3xl font-bold text-sun sm:text-4xl">{v}</p>
                  <p className="mt-1 text-sm text-white/60">{l}</p>
                </Reveal>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {[
              ['Table ronde 1', '10h00', 'La transformation locale, levier stratégique de la souveraineté économique du Togo', 'Un industriel · un investisseur · une PME · un institutionnel'],
              ['Table ronde 2', '11h20', 'Industrie et emploi des jeunes', 'Un chef d’entreprise · un jeune diplômé · un formateur · le Ministère'],
              ['Rencontres d’affaires', '14h00', '10 tables numérotées, 7 créneaux de 20 minutes, 70 rendez-vous relancés à trois mois', 'Les investisseurs restent à table, les PME tournent'],
            ].map(([k, h, t, s], i) => (
              <Reveal key={k} delay={i * 0.1}>
                <article className="leaf group border border-white/10 bg-white/5 p-7 backdrop-blur transition hover:border-sun/50 hover:bg-white/10">
                  <div className="flex items-center justify-between"><span className="eyebrow text-sun">{k}</span><span className="font-display font-bold text-white/50">{h}</span></div>
                  <h3 className="mt-3 font-display text-xl font-bold leading-snug">« {t} »</h3>
                  <p className="mt-3 text-sm text-white/55">{s}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ======================================================= TABLE RONDE FÉMININ */
function Speakers() {
  return (
    <section className="py-28 lg:py-36">
      <div className={WRAP}>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <SectionHead num="04" eyebrow="Jeudi 19 · 15h00" title={<>Les métiers de l’industrie <span className="text-leaf">au féminin.</span></>}
              lead="Cinq industrielles pressenties pour la table ronde du jeudi, à partir des entreprises de la zone franche. Participation à confirmer." />
            <Reveal className="mt-10"><Img name="portrait" alt="Industrielle togolaise" className="leaf aspect-[4/5] w-full max-w-sm" tone="lime" /></Reveal>
          </div>
          <ul className="divide-y divide-forest/10 border-y border-forest/10">
            {SPEAKERS.map((s, i) => (
              <Reveal key={s.i} delay={i * 0.05}>
                <li className="group grid grid-cols-[64px_1fr] gap-6 py-8 sm:grid-cols-[80px_1fr_auto] sm:items-center">
                  <span className="leaf-sm grid h-16 w-16 place-items-center bg-gradient-to-br from-forest to-lime font-display text-lg font-bold text-white transition group-hover:rotate-6 sm:h-20 sm:w-20">{s.i}</span>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-forest">{s.name}</h3>
                    <p className="eyebrow mt-1 text-leaf">{s.org}</p>
                    <p className="mt-3 inline-block rounded-full bg-mist px-3 py-1 text-xs text-ink/70">{s.tags}</p>
                  </div>
                  <ArrowUpRight className="hidden text-forest/30 transition group-hover:text-leaf sm:block" />
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ======================================================= COMMENT ÇA MARCHE */
function HowItWorks() {
  const steps = [
    [Mail, 'Appel à labellisation : lettre officielle du Ministère aux entreprises, écoles et chambre de commerce.'],
    [ListChecks, 'L’entreprise remplit un court formulaire : visite, créneaux, effectif, sécurité, référent.'],
    [BadgeCheck, 'Le Ministère valide et remet le label avec un kit (affiche, logo).'],
    [UserCheck, 'Les écoles s’inscrivent ; l’équipe associe chaque groupe à une visite.'],
    [Bus, 'Convention type école–entreprise, autorisation parentale, transport organisé.'],
    [Timer, 'Visite de 90 minutes, avec un questionnaire avant et après pour mesurer l’effet.'],
    [Camera, 'Un référent accueille dans chaque entreprise ; une équipe filme quelques visites.'],
  ] as const
  const visit = [['Accueil', 10, 'bg-mist text-forest'], ['Visite guidée', 45, 'bg-forest text-white'], ['Échange', 20, 'bg-leaf text-white'], ['Questions', 15, 'bg-lime text-pine']] as const
  return (
    <section id="participer" className="bg-mist py-28 lg:py-36">
      <div className={WRAP}>
        <SectionHead num="05" eyebrow="Comment ça marche" title={<>Le label, <span className="text-leaf">la feuille.</span></>}
          lead="Un badge que le Ministère remet à chaque usine et chaque école participante. Il donne le droit d’afficher le symbole de la semaine et de figurer sur la carte des usines ouvertes." />
        <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="flex justify-center gap-6 sm:gap-10">
            <motion.div whileHover={{ rotate: -4, y: -6 }} className="w-1/2 max-w-[220px]"><LabelSticker variant="usine" /></motion.div>
            <motion.div whileHover={{ rotate: 4, y: -6 }} className="mt-12 w-1/2 max-w-[220px]"><LabelSticker variant="ecole" /></motion.div>
          </Reveal>
          <Reveal className="grid grid-cols-3 gap-3">
            {[['30 × 30 cm', 'Porte d’entrée'], ['10 × 10 cm', 'Machine, véhicule'], ['4 × 4 cm', 'Version courte']].map(([s, l]) => (
              <div key={s} className="leaf-sm bg-white p-5"><p className="font-display text-lg font-bold text-forest">{s}</p><p className="text-xs text-ink/55">{l}</p></div>
            ))}
            <a href="mailto:" className="leaf col-span-3 group mt-3 flex items-center justify-between bg-forest p-7 text-white transition hover:bg-pine">
              <span><span className="eyebrow text-lime">Entreprises et écoles</span><span className="mt-2 block font-display text-2xl font-bold">Demander le label 2026</span></span>
              <span className="leaf-sm grid h-14 w-14 place-items-center bg-lime text-pine transition group-hover:rotate-[-12deg]"><ArrowUpRight /></span>
            </a>
          </Reveal>
        </div>

        <h3 className="mt-24 font-display text-3xl font-bold text-forest">Usines ouvertes, étape par étape</h3>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([Icon, t], i) => (
            <Reveal key={i} delay={i * 0.04}>
              <li className="leaf-sm h-full bg-white p-6">
                <div className="flex items-center justify-between"><Icon size={20} className="text-leaf" /><span className="font-display text-4xl font-bold text-forest/10">{i + 1}</span></div>
                <p className="mt-4 text-sm leading-relaxed text-ink/75">{t}</p>
              </li>
            </Reveal>
          ))}
        </ol>
        <p className="eyebrow mt-14 text-ink/50">Une visite type · 90 minutes</p>
        <div className="mt-4 flex overflow-hidden rounded-2xl text-sm font-semibold">
          {visit.map(([l, m, c], i) => (
            <motion.div key={l} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.15, duration: 0.6 }}
              style={{ flexGrow: m, transformOrigin: 'left' }} className={`flex basis-0 items-center justify-between gap-2 px-4 py-4 ${c}`}>
              <span className="truncate">{l}</span><span className="opacity-70">{m}’</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ======================================================= EXPO & ENFANTS */
function Expo() {
  const items = [
    { icon: Store, t: 'L’exposition, un seul jour', w: 'Samedi 21', d: '20 à 25 stands simples (une table, une affiche, quelques produits) : agro-alimentaire, textile, matériaux, cosmétiques. Gratuit pour les entreprises locales.' },
    { icon: Baby, t: 'L’espace enfants', w: 'Samedi 21', d: 'Atelier de montage guidé animé par des étudiants d’écoles techniques, démonstrations de fabrication en direct. Chaque enfant repart avec l’objet fabriqué.' },
    { icon: Handshake, t: 'Les rencontres d’affaires', w: 'Vendredi 20 · 14h–17h', d: 'Inscription avec un profil court : ce que je fabrique ou ce que je cherche. Rendez-vous préparés, fiche de contact relancée à trois mois.' },
  ]
  return (
    <section className="py-28 lg:py-36">
      <div className={WRAP}>
        <div className="grid gap-5 lg:grid-cols-3">
          {items.map((x, i) => (
            <Reveal key={x.t} delay={i * 0.08}>
              <article className="leaf h-full border border-forest/10 p-8 transition hover:border-leaf hover:shadow-xl hover:shadow-forest/5">
                <x.icon className="text-leaf" />
                <p className="eyebrow mt-6 text-leaf">{x.w}</p>
                <h3 className="mt-2 font-display text-2xl font-bold text-forest">{x.t}</h3>
                <p className="mt-3 leading-relaxed text-ink/65">{x.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-[1.4fr_1fr]">
          <Reveal><Img name="agro" alt="Produits agro-alimentaires togolais" className="leaf aspect-[4/3] w-full md:aspect-auto md:h-full" tone="lime" /></Reveal>
          <div className="grid gap-5">
            <Reveal><Img name="materiaux" alt="Matériaux de construction" className="leaf-r aspect-[16/10] w-full" /></Reveal>
            <Reveal><Img name="chimie" alt="Chimie et énergie" className="leaf aspect-[16/10] w-full" tone="sun" /></Reveal>
          </div>
        </div>
        <p className="eyebrow mt-5 text-ink/45">Ce que le Togo fabrique : agro-alimentaire, matériaux, chimie et énergie</p>
      </div>
    </section>
  )
}

/* ======================================================= SITES */
function Sites() {
  return (
    <section id="sites" className="bg-pine py-28 text-white lg:py-36">
      <div className={WRAP}>
        <SectionHead dark num="06" eyebrow="Sites et industries mobilisés" title="Six pôles, du port aux régions." />
        <div className="mt-16 grid gap-px overflow-hidden rounded-[2rem] bg-white/10 md:grid-cols-2 lg:grid-cols-3">
          {POLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.05} className="h-full">
              <article className="group flex h-full flex-col bg-pine p-9 transition duration-500 hover:bg-forest">
                <span className="leaf-sm grid h-12 w-12 place-items-center bg-white/5 text-lime transition group-hover:bg-lime group-hover:text-pine"><p.icon size={22} /></span>
                <h3 className="mt-8 font-display text-2xl font-bold">{p.title}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-white/60">{p.text}</p>
                <p className="mt-6 flex items-center gap-2 border-t border-white/10 pt-5 text-sm font-medium text-lime"><Sparkles size={14} />{p.when}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ======================================================= ÉCOLES & PARTENAIRES */
function Schools() {
  return (
    <section className="py-28 lg:py-36">
      <div className={WRAP}>
        <SectionHead num="07" eyebrow="Tournée des écoles" title={<>Le matin à l’usine, <span className="text-leaf">midi en classe.</span></>}
          lead="Sur les cinq jours ouvrés, un circuit de visites dans plusieurs établissements de Lomé et, si possible, à Kara ou Dapaong. Un enseignant référent par établissement suit tout le circuit." />
        <div className="mt-14 grid gap-3 md:grid-cols-3">
          {[[Bus, 'Transport groupé le matin'], [Factory, 'Visite d’usine de 90 minutes'], [BookOpenText, 'Retour en classe avant midi']].map(([I, t], i) => {
            const Icon = I as typeof Bus
            return (
              <Reveal key={i} delay={i * 0.1}>
                <div className="leaf-sm flex items-center gap-5 bg-forest p-7 text-white">
                  <span className="font-display text-5xl font-bold text-lime">{i + 1}</span>
                  <Icon className="text-lime/70" /><span className="font-semibold">{t as string}</span>
                </div>
              </Reveal>
            )
          })}
        </div>
        <p className="eyebrow mt-20 text-center text-ink/45">Partenaires à associer</p>
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {PARTNERS.map((p) => (
            <div key={p.name} className="leaf-sm flex flex-col items-center gap-3 border border-forest/10 p-6 text-center transition hover:border-leaf">
              <p.icon className="text-leaf" size={26} /><span className="text-sm font-medium text-forest">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ======================================================= COMMUNICATION */
function Media() {
  const phases = [
    { icon: Megaphone, t: 'Annoncer', w: 'Fin octobre — 15 novembre', d: 'Identité visuelle, vidéo d’annonce de 45 secondes, appel à labellisation, affichage à Lomé.' },
    { icon: Video, t: 'Raconter', w: '16 — 22 novembre', d: 'Un reportage court par jour, direct de la journée phare, carte des usines ouvertes mise à jour.', on: true },
    { icon: Clapperboard, t: 'Prolonger', w: '23 novembre — 15 décembre', d: 'Film de synthèse de 3 minutes, bilan en chiffres, témoignages, suivi des contacts d’affaires.' },
  ]
  return (
    <section className="bg-mist py-28 lg:py-36">
      <div className={WRAP}>
        <SectionHead num="08" eyebrow="Communication et audiovisuel" title="Annoncer, raconter, prolonger."
          lead="Six à huit portraits d’industrie de 60 à 90 secondes, chacun autour d’un produit et d’une personne, tournés dans des pôles différents." />
        <div className="relative mt-16 grid gap-5 md:grid-cols-3">
          {phases.map((p, i) => (
            <Reveal key={p.t} delay={i * 0.1}>
              <article className={`leaf h-full p-8 ${p.on ? 'bg-forest text-white' : 'bg-white'}`}>
                <p.icon className={p.on ? 'text-sun' : 'text-leaf'} />
                <h3 className="mt-6 font-display text-3xl font-bold">{p.t}</h3>
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${p.on ? 'bg-sun text-pine' : 'bg-forest text-white'}`}>{p.w}</span>
                <p className={`mt-5 leading-relaxed ${p.on ? 'text-white/70' : 'text-ink/65'}`}>{p.d}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ======================================================= INDICATEURS */
function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView || !ref.current) return
    const c = animate(0, to, { duration: 1.8, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => { if (ref.current) ref.current.textContent = Math.round(v).toLocaleString('fr-FR') } })
    return () => c.stop()
  }, [inView, to])
  return <span ref={ref}>0</span>
}

function Kpis() {
  return (
    <section className="py-28 lg:py-36">
      <div className={WRAP}>
        <SectionHead num="09" eyebrow="Indicateurs de succès" title={<>Des résultats mesurés, <span className="text-leaf">publiés le 22 novembre.</span></>}
          lead="Nous annonçons des contacts suivis plutôt que des montants d’accords : les grandes foires publient des engagements dont peu se traduisent en investissements." />
        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] bg-forest/10 lg:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-white p-8 lg:p-10">
              <p className="font-display text-5xl font-extrabold tracking-tight text-forest lg:text-6xl"><Counter to={k.v} /></p>
              <div className="rule mt-5 !w-12" />
              <p className="mt-4 text-sm text-ink/60">{k.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ======================================================= FOOTER */
function Footer() {
  return (
    <footer className="noise relative overflow-hidden bg-pine text-white">
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-moss/40 blur-[140px]" />
      <div className={`${WRAP} relative py-28 text-center`}>
        <Reveal>
          <Mark className="mx-auto h-20 w-auto text-lime" />
          <h2 className="mx-auto mt-10 max-w-4xl font-display text-4xl font-bold leading-tight sm:text-6xl">
            Construire aujourd’hui <span className="grad-text">l’industrie de demain.</span>
          </h2>
          <p className="eyebrow mt-6 text-white/40">Production · Transformation · Progrès industriel</p>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <a href="#participer" className="leaf-sm inline-flex items-center gap-2 bg-lime px-7 py-4 font-semibold text-pine transition hover:bg-white">Participer <ArrowRight size={18} /></a>
            <a href="#programme" className="leaf-sm inline-flex items-center gap-2 border border-white/20 px-7 py-4 font-semibold transition hover:border-lime hover:text-lime">Programme</a>
          </div>
          <p className="mt-10 font-display text-lg font-bold text-lime">#SemaineIndustrie2026</p>
        </Reveal>
      </div>
      <div className={`${WRAP} relative flex flex-col items-center justify-between gap-6 border-t border-white/10 py-10 text-sm text-white/50 md:flex-row`}>
        <div className="flex items-center gap-4">
          <img src="/images/armoiries.png" alt="République togolaise" className="h-12 w-auto" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <p className="max-w-sm text-left">Ministère délégué, chargé de la Promotion des investissements, de l’Industrie et de la Souveraineté économique</p>
        </div>
        <Logo />
        <p>Conçu par <strong className="text-white">DEKA ÉDITIONS</strong> · 2026</p>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Ambition />
        <Pillars />
        <Programme />
        <Phare />
        <Speakers />
        <HowItWorks />
        <Expo />
        <Sites />
        <Schools />
        <Media />
        <Kpis />
      </main>
      <Footer />
    </>
  )
}
