import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Award, Check, Compass, Lightbulb, MessageCircle, RotateCcw, Share2, X } from 'lucide-react'
import { Seo } from '../components/Seo'
import { publicSeo, SITE_URL } from '../lib/seo'
import { BrandLogoWhite, WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
import {
  computeProfiles,
  LETTERS,
  QUIZ,
  quizMessage,
  quizScore,
  TALENT_DISCLAIMER,
  TALENT_QUESTIONS,
  VUE_PAR_VOUS_TITLE,
  type Letter,
} from '../lib/vueParVous'

type Game = 'quiz' | 'talents'

const PAGE_URL = `${SITE_URL}/vue-par-vous`

/* Copie un texte (presse-papiers, sinon zone de texte temporaire). */
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const input = document.createElement('textarea')
    input.value = text
    document.body.appendChild(input)
    input.select()
    const ok = document.execCommand('copy')
    input.remove()
    return ok
  }
}

/* Questions pas à pas : une question, puis Suivant ; la dernière lance onFinish. */
function Stepper({
  questions,
  answers,
  onAnswer,
  onFinish,
  finishLabel,
}: {
  questions: { label: string; options: string[] }[]
  answers: (number | null)[]
  onAnswer: (step: number, choice: number) => void
  onFinish: () => void
  finishLabel: string
}) {
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const total = questions.length
  const current = questions[step]
  const isLast = step >= total - 1
  const answered = answers[step] != null
  const allAnswered = answers.every((a) => a != null)

  /* Passe à la suite, ou termine si tout est répondu. */
  function onNext() {
    if (!answered) {
      setError('Merci de répondre avant de continuer.')
      return
    }
    if (!isLast) {
      setError(null)
      setStep((s) => s + 1)
      return
    }
    if (!allAnswered) {
      setError('Merci de répondre à toutes les questions.')
      return
    }
    onFinish()
  }

  return (
    <div className="mt-8">
      <div className="mb-6">
        <div className="flex items-center justify-between text-[12px] font-medium text-ink/70">
          <span>
            Question {step + 1} / {total}
          </span>
          <span>{Math.round(((step + 1) / total) * 100)}%</span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-sage">
          <div
            className="h-full bg-energy transition-[width] duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="min-h-[260px]">
        <p className="text-[18px] font-semibold leading-snug text-forest sm:text-[20px]">{current.label}</p>
        <ul className="mt-6 space-y-2" role="radiogroup" aria-label={current.label}>
          {current.options.map((opt, i) => {
            const active = answers[step] === i
            return (
              <li key={opt}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    onAnswer(step, i)
                    setError(null)
                  }}
                  className={`flex w-full gap-3 border border-forest/40 px-4 py-3.5 text-left text-[15px] font-medium transition-colors ${
                    active ? 'bg-forest text-white' : 'bg-white text-ink/85 hover:bg-sage'
                  }`}
                >
                  <span className={`font-semibold ${active ? 'text-sun' : 'text-forest'}`}>{LETTERS[i]}.</span>
                  <span>{opt}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {error && <p role="alert" className="mt-4 text-[14px] font-medium text-flag">{error}</p>}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        {step > 0 && (
          <Button
            variant="link"
            onClick={() => {
              setError(null)
              setStep((s) => s - 1)
            }}
          >
            Précédent
          </Button>
        )}
        <div className="ml-auto">
          <Button onClick={onNext} disabled={!answered}>
            {isLast ? finishLabel : 'Suivant'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/* Jeu 1 : quiz de connaissances, score sur 5 puis corrigé commenté. */
function QuizGame() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUIZ.map(() => null))
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [round, setRound] = useState(0)
  const score = quizScore(answers)

  /* Repart de zéro. */
  function replay() {
    setAnswers(QUIZ.map(() => null))
    setDone(false)
    setCopied(false)
    setRound((r) => r + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* Copie le résultat avec le lien du jeu. */
  async function share() {
    const text = `J'ai obtenu ${score}/5 au défi « Curieux de l'industrie » de la Semaine de l'industrie 2026. À vous de jouer : ${PAGE_URL}?jeu=quiz`
    if (await copyText(text)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!done) {
    return (
      <Stepper
        key={round}
        questions={QUIZ}
        answers={answers}
        onAnswer={(step, choice) => setAnswers((prev) => prev.map((a, i) => (i === step ? choice : a)))}
        onFinish={() => {
          setDone(true)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        finishLabel="Voir mon résultat"
      />
    )
  }

  return (
    <div className="mt-8">
      <div className="bg-forest px-5 py-8 text-center text-white">
        <Award className="mx-auto h-10 w-10 text-sun" strokeWidth={1.75} aria-hidden />
        <p className="mt-3 text-[12px] font-semibold uppercase tracking-wide text-white/70">Votre résultat</p>
        <p className="mt-2 text-4xl font-bold">
          {score} / {QUIZ.length}
        </p>
        <p className="mt-3 text-[18px] font-semibold">{quizMessage(score)}</p>
        <p className="mt-2 text-[15px] text-white/80">
          Découvrez les réponses et les explications pour aller plus loin.
        </p>
      </div>

      <ol className="mt-8 space-y-6">
        {QUIZ.map((q, i) => {
          const right = answers[i] === q.answer
          return (
            <li key={q.label} className="border-b border-line pb-6">
              <p className="flex gap-2 text-[16px] font-semibold text-forest">
                {right ? (
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-energy" aria-label="Bonne réponse" />
                ) : (
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-flag" aria-label="Mauvaise réponse" />
                )}
                <span>
                  {i + 1}. {q.label}
                </span>
              </p>
              {!right && answers[i] != null && (
                <p className="mt-2 text-[14px] text-ink/60">Votre réponse : {q.options[answers[i] as number]}</p>
              )}
              <p className="mt-2 text-[15px] font-medium text-ink/85">Bonne réponse : {q.options[q.answer]}</p>
              <p className="mt-2 text-[15px] text-ink/70">{q.explanation}</p>
            </li>
          )
        })}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => void share()}>
          <Share2 className="h-4 w-4" aria-hidden /> {copied ? 'Résultat copié' : 'Copier mon résultat à partager'}
        </Button>
        <Button variant="outline" onClick={replay}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Rejouer
        </Button>
      </div>
    </div>
  )
}

/* Jeu 2 : explorateur de talents, profil(s) en tête selon la grille. */
function TalentGame() {
  const [answers, setAnswers] = useState<(number | null)[]>(() => TALENT_QUESTIONS.map(() => null))
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [round, setRound] = useState(0)
  const result = done ? computeProfiles(answers.map((a) => (a == null ? null : LETTERS[a])) as (Letter | null)[]) : null
  const names = result ? result.profiles.map((p) => p.name).join(' + ') : ''
  const shareUrl = `${PAGE_URL}?jeu=talents`
  const shareText = `Mon profil de découverte « ${VUE_PAR_VOUS_TITLE} » : ${names}. Semaine de l'industrie 2026. Et vous ?`

  /* Repart de zéro. */
  function replay() {
    setAnswers(TALENT_QUESTIONS.map(() => null))
    setDone(false)
    setCopied(false)
    setRound((r) => r + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* Partage natif (mobile), sinon copie du texte et du lien. */
  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: VUE_PAR_VOUS_TITLE, text: shareText, url: shareUrl })
        return
      } catch {
        /* partage annulé : rien à faire */
        return
      }
    }
    if (await copyText(`${shareText} ${shareUrl}`)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!result) {
    return (
      <Stepper
        key={round}
        questions={TALENT_QUESTIONS}
        answers={answers}
        onAnswer={(step, choice) => setAnswers((prev) => prev.map((a, i) => (i === step ? choice : a)))}
        onFinish={() => {
          setDone(true)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        finishLabel="Voir mon profil"
      />
    )
  }

  return (
    <div className="mt-8">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-energy">Votre profil de découverte</p>
      <h2 className="mt-2 text-2xl font-bold text-forest">
        {result.tie ? 'Vous avez deux univers de prédilection !' : result.profiles[0].name}
      </h2>

      <div className="mt-6 space-y-4">
        {result.profiles.map((p) => (
          <div key={p.code} className="border-2 border-sun bg-sage px-5 py-5">
            <p className="text-[18px] font-semibold text-forest">{p.name}</p>
            <p className="mt-1 text-[13px] font-medium uppercase tracking-wide text-ink/60">{p.orientation}</p>
            <p className="mt-3 text-[15px] text-ink/80">{p.description}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[13px] italic text-ink/60">{TALENT_DISCLAIMER}</p>

      {/* Carte de résultat à partager (capture d'écran ou partage du lien). */}
      <div className="mt-8 bg-forest px-6 py-7 text-white">
        <BrandLogoWhite className="h-8 w-auto" />
        <p className="mt-5 text-[13px] font-semibold uppercase tracking-wide text-sun">{VUE_PAR_VOUS_TITLE}</p>
        <p className="mt-1 text-[13px] text-white/70">
          {result.tie ? 'Mes univers de prédilection' : 'Mon profil de découverte'}
        </p>
        <p className="mt-3 text-2xl font-bold leading-tight">{names}</p>
        <p className="mt-5 text-[13px] text-white/70">Faites le test : {shareUrl.replace(/^https:\/\//, '')}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => void share()}>
          <Share2 className="h-4 w-4" aria-hidden /> {copied ? 'Lien copié' : 'Partager mon profil'}
        </Button>
        <Button
          variant="outline"
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank', 'noopener')}
        >
          <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
        </Button>
        <Button variant="outline" onClick={replay}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Rejouer
        </Button>
      </div>
    </div>
  )
}

const GAMES: { key: Game; title: string; lead: string; icon: typeof Award }[] = [
  {
    key: 'quiz',
    title: "Curieux de l'industrie",
    lead: 'Prêt à relever le défi industriel ? À vous de jouer !',
    icon: Lightbulb,
  },
  {
    key: 'talents',
    title: 'Explorateur de talents',
    lead: "Et si vous aviez un talent pour l'industrie sans le savoir ? Cinq questions pour explorer vos intérêts et découvrir les univers industriels qui pourraient vous correspondre.",
    icon: Compass,
  },
]

/* « L'industrie, vue par vous ! » : choix de l'expérience puis jeu. */
export default function VueParVousPage() {
  const [params] = useSearchParams()
  const raw = params.get('jeu')
  const game: Game | null = raw === 'quiz' || raw === 'talents' ? raw : null
  const current = GAMES.find((g) => g.key === game) || null

  return (
    <main className="py-12 sm:py-16">
      <Seo {...publicSeo('/vue-par-vous')} />
      <div className={`${WRAP} ${current ? 'max-w-2xl' : ''}`}>
        <div className="animate-rise">
          {current ? (
            <>
              <Link to="/vue-par-vous" className="text-[14px] font-semibold text-forest underline underline-offset-4">
                ← Toutes les expériences
              </Link>
              <div className="mt-4">
                <SectionHeader level={1} eyebrow={VUE_PAR_VOUS_TITLE} title={current.title} lead={current.lead} />
              </div>
            </>
          ) : (
            <SectionHeader
              level={1}
              eyebrow="Défis"
              title={VUE_PAR_VOUS_TITLE}
              lead="Trois expériences pour tester ses connaissances, explorer ses intérêts et partager sa vision de l'industrie togolaise."
            />
          )}
        </div>

        {game === 'quiz' && <QuizGame />}
        {game === 'talents' && <TalentGame />}

        {!current && (
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {GAMES.map((g, i) => {
              const Icon = g.icon
              return (
                <Link
                  key={g.key}
                  to={`/vue-par-vous?jeu=${g.key}`}
                  className="group flex flex-col border border-forest/30 bg-white p-6 transition-colors hover:bg-sage"
                >
                  <Icon className="h-8 w-8 text-energy" strokeWidth={1.75} aria-hidden />
                  <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-ink/60">Expérience {i + 1}</p>
                  <p className="mt-1 text-[18px] font-semibold text-forest">{g.title}</p>
                  <p className="mt-2 flex-1 text-[15px] text-ink/70">{g.lead}</p>
                  <p className="mt-5 text-[14px] font-semibold text-forest underline underline-offset-4">Commencer</p>
                </Link>
              )
            })}
            <div className="flex flex-col border border-dashed border-forest/30 p-6">
              <MessageCircle className="h-8 w-8 text-ink/40" strokeWidth={1.75} aria-hidden />
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-wide text-ink/60">Expérience 3</p>
              <p className="mt-1 text-[18px] font-semibold text-forest">Votre vision de l&apos;industrie</p>
              <p className="mt-2 flex-1 text-[15px] text-ink/70">Partagez votre regard sur l&apos;industrie togolaise.</p>
              <p className="mt-5 text-[14px] font-semibold text-ink/50">Bientôt disponible</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
