import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Award, Check, ClipboardList, Compass, Lightbulb, Share2, X } from 'lucide-react'
import { Seo } from '../components/Seo'
import { publicSeo, SITE_URL } from '../lib/seo'
import { BrandLogoWhite, WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'
import SurveyGame from '../components/SurveyGame'
import { DAY_MS, hasStoreKey, readStore, writeStore } from '../lib/localStore'
import { submitGameResult, type GameResultPayload } from '../api/surveys'
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

type Game = 'sondage' | 'quiz' | 'talents'

const PAGE_URL = `${SITE_URL}/vue-par-vous`

/* Réponses d'une partie terminée, gardées 24 h : une seule partie par jour et par appareil. */
const doneKey = (game: Game) => `vue-par-vous-done:${game}`

/* Réponses enregistrées d'un jeu, ou null s'il n'a pas été joué (ou si la donnée est invalide). */
function savedAnswers(game: Game) {
  const saved = readStore<unknown>(doneKey(game))
  const valid = Array.isArray(saved) && saved.length === 5 && saved.every((a) => Number.isInteger(a) && a >= 0 && a <= 3)
  return valid ? (saved as number[]) : null
}

/* Garde la partie sur l'appareil et l'envoie au serveur (échec silencieux : le résultat reste affiché). */
function recordGame(payload: GameResultPayload) {
  writeStore(doneKey(payload.game), payload.answers, DAY_MS)
  submitGameResult(payload).catch(() => {})
}

/* Sondage fini = volet « après » envoyé (il n'est ouvert qu'après « avant »). */
function isDone(game: Game) {
  return game === 'sondage' ? hasStoreKey('survey-done:after:') : savedAnswers(game) != null
}

/* Partage natif (mobile) ; sinon copie texte + lien et renvoie true pour l'afficher. */
async function shareResult(text: string, url: string) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: VUE_PAR_VOUS_TITLE, text, url })
    } catch {
      /* partage annulé : rien à faire */
    }
    return false
  }
  return copyText(`${text} ${url}`)
}

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
  const [answers, setAnswers] = useState<(number | null)[]>(() => savedAnswers('quiz') || QUIZ.map(() => null))
  const [done, setDone] = useState(() => savedAnswers('quiz') != null)
  const [copied, setCopied] = useState(false)
  const score = quizScore(answers)

  /* Partage le score avec le lien du jeu. */
  async function share() {
    const text = `J'ai obtenu ${score}/5 au défi « Curieux de l'industrie » de la Semaine de l'industrie 2026. À vous de jouer !`
    if (await shareResult(text, `${PAGE_URL}?jeu=quiz`)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!done) {
    return (
      <Stepper
        questions={QUIZ}
        answers={answers}
        onAnswer={(step, choice) => setAnswers((prev) => prev.map((a, i) => (i === step ? choice : a)))}
        onFinish={() => {
          recordGame({ game: 'quiz', answers: answers as number[], score: quizScore(answers) })
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
        <p className="mt-3 text-4xl font-bold">
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
          <Share2 className="h-4 w-4" aria-hidden /> {copied ? 'Lien copié' : 'Partager'}
        </Button>
      </div>
    </div>
  )
}

/* Jeu 2 : explorateur de talents, profil(s) en tête selon la grille. */
function TalentGame() {
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => savedAnswers('talents') || TALENT_QUESTIONS.map(() => null),
  )
  const [done, setDone] = useState(() => savedAnswers('talents') != null)
  const [copied, setCopied] = useState(false)
  const result = done ? computeProfiles(answers.map((a) => (a == null ? null : LETTERS[a])) as (Letter | null)[]) : null
  const names = result ? result.profiles.map((p) => p.name).join(' + ') : ''

  /* Partage le profil avec le lien du jeu. */
  async function share() {
    const text = `Mon profil de découverte « ${VUE_PAR_VOUS_TITLE} » : ${names}. Semaine de l'industrie 2026. Et vous ?`
    if (await shareResult(text, `${PAGE_URL}?jeu=talents`)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!result) {
    return (
      <Stepper
        questions={TALENT_QUESTIONS}
        answers={answers}
        onAnswer={(step, choice) => setAnswers((prev) => prev.map((a, i) => (i === step ? choice : a)))}
        onFinish={() => {
          const picked = computeProfiles(answers.map((a) => LETTERS[a as number]))
          recordGame({ game: 'talents', answers: answers as number[], profiles: picked.profiles.map((p) => p.code) })
          setDone(true)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        finishLabel="Voir mon profil"
      />
    )
  }

  return (
    <div className="mt-8">
      {/* Une seule carte résultat (à capturer ou partager) ; titre seulement en cas d'égalité. */}
      <div className="bg-forest px-6 py-8 text-white sm:px-8">
        <BrandLogoWhite className="h-8 w-auto" />
        {result.tie && <p className="mt-6 text-[15px] text-white/75">Vos réponses se partagent entre deux univers.</p>}
        {result.profiles.map((p, i) => (
          <div key={p.code} className={i > 0 ? 'mt-6 border-t border-white/20 pt-6' : 'mt-6'}>
            <p className="text-2xl font-bold">{p.name}</p>
            <p className="mt-1 text-[15px] text-sun">{p.orientation}</p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/85">{p.description}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 text-[13px] italic text-ink/60">{TALENT_DISCLAIMER}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => void share()}>
          <Share2 className="h-4 w-4" aria-hidden /> {copied ? 'Lien copié' : 'Partager'}
        </Button>
      </div>
    </div>
  )
}

const GAMES: { key: Game; title: string; lead: string; card?: string; icon: typeof Award }[] = [
  {
    key: 'sondage',
    title: 'Votre avis compte',
    lead: "Quelques questions rapides pour mesurer ce que les visites d'usines apportent aux jeunes et au public.",
    card: "Répondez au questionnaire avant puis après votre visite d'usine.",
    icon: ClipboardList,
  },
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
  const current = GAMES.find((g) => g.key === raw) || null
  const game = current?.key ?? null

  return (
    <main className="py-12 sm:py-16">
      <Seo {...publicSeo('/vue-par-vous')} />
      <div className={WRAP}>
        {/* Jeu ouvert : colonne centrée, chapeau sur toute la largeur de la colonne. */}
        <div className={current ? 'mx-auto max-w-3xl' : ''}>
          <div className="animate-rise">
            {current ? (
              <SectionHeader level={1} title={current.title} lead={current.lead} className="[&_p]:max-w-none" />
            ) : (
              <SectionHeader
                level={1}
                title={VUE_PAR_VOUS_TITLE}
                lead="Un questionnaire pour donner son avis, et deux défis pour tester ses connaissances et explorer ses intérêts."
              />
            )}
          </div>

          {!current && (
            <img
              src="/images/metiers.jpg"
              alt="Hall d’exposition présentant en silhouettes grandeur nature les métiers de l’industrie, visité par des élèves"
              loading="lazy"
              width={1344}
              height={752}
              className="mt-8 aspect-[16/9] w-full rounded-sm object-cover sm:aspect-[21/8]"
            />
          )}

          {game === 'sondage' && <SurveyGame />}
          {game === 'quiz' && <QuizGame />}
          {game === 'talents' && <TalentGame />}

          {!current && (
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {GAMES.map((g) => {
                const Icon = g.icon
                /* Le sondage n'est pas un jeu : carte marquée, et fermée une fois fini (réponse unique). */
                const survey = g.key === 'sondage'
                const done = isDone(g.key)
                const closed = survey && done
                const body = (
                  <>
                    {done && (
                      <span
                        role="img"
                        aria-label="Terminé"
                        title="Terminé"
                        className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-forest text-white"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      </span>
                    )}
                    <Icon className={`h-8 w-8 ${survey ? 'text-forest' : 'text-energy'}`} strokeWidth={1.75} aria-hidden />
                    <p className="mt-4 text-[18px] font-semibold text-forest">{g.title}</p>
                    <p className="mt-2 flex-1 text-[15px] text-ink/70">
                      {closed ? 'Merci, vos réponses avant et après la visite sont enregistrées.' : g.card || g.lead}
                    </p>
                    {!closed && (
                      <p className="mt-5 text-[14px] font-semibold text-forest underline underline-offset-4">
                        {survey ? 'Répondre' : done ? 'Voir mon résultat' : 'Commencer'}
                      </p>
                    )}
                  </>
                )
                const frame = `relative flex flex-col p-6 transition-colors ${
                  survey ? 'border-2 border-sun bg-sage' : 'border border-forest/30 bg-white hover:bg-sage'
                }`
                return closed ? (
                  <div key={g.key} className={frame}>
                    {body}
                  </div>
                ) : (
                  <Link
                    key={g.key}
                    to={`/vue-par-vous?jeu=${g.key}`}
                    className={`group ${frame} ${survey ? 'hover:bg-sun/25' : ''}`}
                  >
                    {body}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
