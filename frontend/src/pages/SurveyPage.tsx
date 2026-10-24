import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Check, Clock, Lightbulb, Lock, MapPin, Ticket } from 'lucide-react'
import {
  getSurveyQuestions,
  submitSurvey,
  type SurveyAnswerValue,
  type SurveyQuestion,
} from '../api/surveys'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

type Phase = 'before' | 'after'
type Screen = 'intro' | 'questions' | 'sent'

const PHASES: { key: Phase; title: string; lead: string }[] = [
  { key: 'before', title: 'Avant la visite', lead: "Ce que vous attendez et ce que vous savez déjà de l'industrie." },
  { key: 'after', title: 'Après la visite', lead: 'Ce que vous avez découvert et ce que vous en retenez.' },
]

const SCALE_HINTS: Record<number, string> = {
  1: 'Pas du tout',
  2: 'Plutôt non',
  3: 'Moyennement',
  4: 'Plutôt oui',
  5: 'Tout à fait',
}

/* Délai avant de passer seul à la question suivante après un choix. */
const AUTO_NEXT_MS = 350

/* Lecture / écriture localStorage sans jamais casser la page. */
function readStore<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeStore(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* stockage indisponible : on continue sans brouillon */
  }
}

/* Indique si une réponse est valide pour la question. */
function isAnswered(q: SurveyQuestion, value: SurveyAnswerValue | undefined) {
  if (q.kind === 'choice') {
    return typeof value === 'string' && value.length > 0
  }
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && n <= 5
}

/* Questionnaire avant / après visite : charge les questions, un parcours par phase. */
export default function SurveyPage() {
  const [params] = useSearchParams()
  const phase: Phase = params.get('phase') === 'after' ? 'after' : 'before'
  const code = (params.get('code') || '').trim().toUpperCase()
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    getSurveyQuestions()
      .then(setQuestions)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <SurveyFlow
      key={`${phase}:${code}`}
      phase={phase}
      code={code}
      questions={questions}
      loading={loading}
      loadError={loadError}
    />
  )
}

/* Accueil, questions pas à pas et remerciement ; brouillon gardé sur l'appareil. */
function SurveyFlow({
  phase,
  code,
  questions,
  loading,
  loadError,
}: {
  phase: Phase
  code: string
  questions: SurveyQuestion[]
  loading: boolean
  loadError: string | null
}) {
  const [params, setParams] = useSearchParams()
  const draftKey = `survey-draft:${phase}:${code}`
  const doneKey = `survey-done:${phase}:${code}`

  const [answers, setAnswers] = useState<Record<string, SurveyAnswerValue>>(
    () => readStore<Record<string, SurveyAnswerValue>>(draftKey) || {},
  )
  const [alreadyDone, setAlreadyDone] = useState(() => Boolean(readStore<boolean>(doneKey)))
  /* Déjà répondu sur cet appareil : on affiche directement le remerciement. */
  const [screen, setScreen] = useState<Screen>(() => (alreadyDone ? 'sent' : 'intro'))
  const [justSent, setJustSent] = useState(false)
  const [afterDone] = useState(() => Boolean(readStore<boolean>(`survey-done:after:${code}`)))
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoNext = useRef<number | null>(null)

  useEffect(() => () => {
    if (autoNext.current) window.clearTimeout(autoNext.current)
  }, [])

  const total = questions.length
  const current = questions[step] || null
  const isLast = step >= total - 1
  const currentAnswered = current ? isAnswered(current, answers[current.key]) : false
  const answeredCount = questions.filter((q) => isAnswered(q, answers[q.key])).length
  const minutes = Math.max(1, Math.ceil((total * 10) / 60))

  const allComplete = useMemo(
    () => total > 0 && questions.every((q) => isAnswered(q, answers[q.key])),
    [answers, questions, total],
  )

  /* Choisit la phase (garde le code passeport dans l'adresse). */
  function choosePhase(next: Phase) {
    const q = new URLSearchParams(params)
    q.set('phase', next)
    setParams(q, { replace: true })
  }

  /* Démarre (ou reprend) le questionnaire à la première question sans réponse. */
  function start() {
    const firstOpen = questions.findIndex((q) => !isAnswered(q, answers[q.key]))
    setStep(firstOpen === -1 ? 0 : firstOpen)
    setError(null)
    setScreen('questions')
  }

  /* Enregistre une réponse ; sur un choix, passe seul à la suite. */
  const setAnswer = useCallback(
    (value: SurveyAnswerValue) => {
      if (!current) return
      setAnswers((prev) => {
        const next = { ...prev, [current.key]: value }
        writeStore(draftKey, next)
        return next
      })
      setError(null)
      if (autoNext.current) window.clearTimeout(autoNext.current)
      if (!isLast) {
        autoNext.current = window.setTimeout(() => setStep((s) => Math.min(s + 1, total - 1)), AUTO_NEXT_MS)
      }
    },
    [current, draftKey, isLast, total],
  )

  /* Passe à la question suivante. */
  function onNext() {
    if (!currentAnswered) {
      setError('Merci de répondre avant de continuer.')
      return
    }
    setError(null)
    if (!isLast) setStep((s) => s + 1)
  }

  /* Revient à la question précédente. */
  function onPrev() {
    if (autoNext.current) window.clearTimeout(autoNext.current)
    setError(null)
    if (step === 0) setScreen('intro')
    else setStep((s) => s - 1)
  }

  /* Raccourcis clavier : 1 à 5 pour l'échelle ou les choix. */
  useEffect(() => {
    if (screen !== 'questions' || !current) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1) return
      if (current?.kind === 'choice') {
        const opt = (current.options || [])[n - 1]
        if (opt) setAnswer(opt)
      } else if (n <= 5) {
        setAnswer(n)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, screen, setAnswer])

  /* Envoie le questionnaire ; un code passeport inconnu n'empêche pas l'envoi. */
  async function onSubmit() {
    if (!allComplete) {
      setError('Merci de répondre à toutes les questions.')
      const firstOpen = questions.findIndex((q) => !isAnswered(q, answers[q.key]))
      if (firstOpen !== -1) setStep(firstOpen)
      return
    }
    setError(null)
    setBusy(true)
    const payload = { phase, answers, source: 'qr' as const }
    try {
      try {
        await submitSurvey({ ...payload, passport_code: code || undefined })
      } catch (err) {
        if (!code || !(err instanceof Error) || !/passeport/i.test(err.message)) throw err
        await submitSurvey(payload)
      }
      writeStore(draftKey, null)
      writeStore(doneKey, true)
      setAlreadyDone(true)
      setJustSent(true)
      setScreen('sent')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  const phaseInfo = PHASES.find((p) => p.key === phase) || PHASES[0]
  const afterHref = `/questionnaire?phase=after${code ? `&code=${encodeURIComponent(code)}` : ''}`

  return (
    <main className="py-12 sm:py-16">
      <Seo {...publicSeo('/questionnaire')} />
      <div className={`${WRAP} max-w-xl`}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            eyebrow="Enquête visiteurs"
            title={screen === 'intro' ? 'Votre avis compte' : phaseInfo.title}
            lead={
              screen === 'intro'
                ? "Quelques questions rapides pour mesurer ce que les visites d'usines apportent aux jeunes et au public."
                : undefined
            }
          />
        </div>

        {loading ? (
          <p className="mt-10 text-[15px] text-ink/70">Chargement…</p>
        ) : total === 0 ? (
          <div className="mt-10 border border-line bg-sage px-5 py-6">
            <p className="text-[15px] text-ink/75">
              {loadError || "Le questionnaire n'est pas encore disponible. Revenez pendant la Semaine de l'industrie."}
            </p>
            <div className="mt-4">
              <Button variant="link" to="/vue-par-vous">En attendant, jouez à « L&apos;industrie, vue par vous ! »</Button>
            </div>
          </div>
        ) : screen === 'intro' ? (
          <div className="mt-8">
            <p className="text-[14px] font-semibold text-forest">Vous répondez…</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Moment de la visite">
              {PHASES.map((p) => {
                const active = p.key === phase
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => choosePhase(p.key)}
                    className={`border px-4 py-4 text-left transition-colors ${
                      active ? 'border-forest bg-forest text-white' : 'border-forest/30 bg-white hover:bg-sage'
                    }`}
                  >
                    <span className={`block text-[16px] font-semibold ${active ? 'text-white' : 'text-forest'}`}>
                      {p.title}
                    </span>
                    <span className={`mt-1 block text-[14px] ${active ? 'text-white/80' : 'text-ink/65'}`}>{p.lead}</span>
                  </button>
                )
              })}
            </div>

            <ul className="mt-6 space-y-2 text-[14px] text-ink/75">
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-energy" aria-hidden /> {total} questions, environ {minutes} min
              </li>
              {code ? (
                <li className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-energy" aria-hidden /> Réponses liées au passeport {code}
                </li>
              ) : (
                <li className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-energy" aria-hidden /> Réponses anonymes
                </li>
              )}
            </ul>

            {alreadyDone && (
              <p className="mt-6 border-l-4 border-sun bg-sage px-4 py-3 text-[14px] text-ink/80">
                Vous avez déjà répondu au questionnaire « {phaseInfo.title.toLowerCase()} » sur cet appareil. Vous pouvez
                répondre à nouveau si une autre personne utilise ce téléphone.
              </p>
            )}

            <div className="mt-8">
              <Button onClick={start} withArrow>
                {answeredCount > 0 && answeredCount < total ? `Reprendre (${answeredCount}/${total})` : 'Commencer'}
              </Button>
            </div>
          </div>
        ) : screen === 'sent' ? (
          <div className="mt-8">
            <div className="border-2 border-sun bg-sage px-5 py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-white">
                <Check className="h-6 w-6" aria-hidden />
              </span>
              <p className="mt-4 text-xl font-semibold text-forest">
                {justSent ? 'Merci pour vos réponses !' : `Questionnaire « ${phaseInfo.title.toLowerCase()} » déjà rempli`}
              </p>
              <p className="mt-2 text-[15px] text-ink/75">
                {phase === 'before' && !afterDone
                  ? 'Bonne visite ! Revenez après pour nous dire ce que vous en avez retenu.'
                  : "Vos réponses nous aident à préparer les prochaines éditions de la Semaine de l'industrie."}
              </p>
              {phase === 'before' && !afterDone && (
                <div className="mt-5">
                  <Button variant="outline" to={afterHref}>Répondre après la visite</Button>
                </div>
              )}
            </div>
            {!justSent && (
              <p className="mt-4 text-center text-[13px] text-ink/60">
                Une autre personne utilise ce téléphone ?{' '}
                <button type="button" className="font-semibold text-forest underline underline-offset-2" onClick={() => setScreen('intro')}>
                  Répondre à nouveau
                </button>
              </p>
            )}

            <p className="mt-8 text-[14px] font-semibold text-forest">Et maintenant ?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { to: '/vue-par-vous', label: 'Jouer', lead: "L'industrie, vue par vous !", icon: Lightbulb },
                { to: '/carte', label: 'Carte', lead: 'Les usines ouvertes', icon: MapPin },
                { to: '/programme', label: 'Programme', lead: 'Les temps forts de la semaine', icon: CalendarDays },
              ].map(({ to, label, lead, icon: Icon }) => (
                <Link key={to} to={to} className="border border-forest/30 bg-white p-4 transition-colors hover:bg-sage">
                  <Icon className="h-5 w-5 text-energy" aria-hidden />
                  <span className="mt-2 block text-[15px] font-semibold text-forest">{label}</span>
                  <span className="block text-[13px] text-ink/65">{lead}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : current ? (
          <div className="mt-8">
            <div className="mb-6">
              <div className="flex items-center justify-between text-[12px] font-medium text-ink/70">
                <span>
                  Question {step + 1} / {total}
                </span>
                <span>{Math.round((answeredCount / total) * 100)}% répondu</span>
              </div>
              <div className="mt-2 flex gap-1" aria-hidden>
                {questions.map((q, i) => (
                  <span
                    key={q.key}
                    className={`h-1.5 flex-1 transition-colors ${
                      i === step ? 'bg-forest' : isAnswered(q, answers[q.key]) ? 'bg-energy' : 'bg-sage'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="min-h-[260px]" key={current.key}>
              <p className="animate-rise text-[19px] font-semibold leading-snug text-forest sm:text-[21px]">
                {current.label}
              </p>

              {current.kind === 'choice' ? (
                <ul className="mt-6 space-y-2" role="radiogroup" aria-label={current.label}>
                  {(current.options || []).map((opt, i) => {
                    const active = answers[current.key] === opt
                    return (
                      <li key={opt}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setAnswer(opt)}
                          className={`flex w-full items-center gap-3 border px-4 py-3.5 text-left text-[15px] font-medium transition-colors ${
                            active ? 'border-forest bg-forest text-white' : 'border-forest/40 bg-white text-ink/85 hover:bg-sage'
                          }`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center border text-[12px] font-semibold ${
                              active ? 'border-sun text-sun' : 'border-forest/40 text-forest'
                            }`}
                          >
                            {active ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                          </span>
                          <span>{opt}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="mt-6">
                  <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={current.label}>
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = answers[current.key] === n
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          aria-label={`${n} – ${SCALE_HINTS[n]}`}
                          onClick={() => setAnswer(n)}
                          className={`flex h-16 flex-col items-center justify-center border text-[18px] font-semibold transition-colors ${
                            active ? 'border-forest bg-forest text-white' : 'border-forest/40 bg-white text-ink/75 hover:bg-sage'
                          }`}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-[12px] font-medium text-ink/60">
                    <span>{SCALE_HINTS[1]}</span>
                    <span>{SCALE_HINTS[5]}</span>
                  </div>
                  <p className="mt-4 h-5 text-center text-[14px] font-semibold text-forest" aria-live="polite">
                    {typeof answers[current.key] === 'number' ? SCALE_HINTS[answers[current.key] as number] : ''}
                  </p>
                </div>
              )}
            </div>

            {error && <p role="alert" className="mt-4 text-[14px] font-medium text-flag">{error}</p>}

            <div className="sticky bottom-0 -mx-5 mt-8 flex items-center gap-3 border-t border-line bg-white/95 px-5 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
              <Button variant="link" onClick={onPrev}>
                Précédent
              </Button>
              <div className="ml-auto">
                {!isLast ? (
                  <Button onClick={onNext} disabled={!currentAnswered}>
                    Suivant
                  </Button>
                ) : (
                  <Button onClick={() => void onSubmit()} disabled={busy || !currentAnswered} withArrow={false}>
                    {busy ? 'Envoi…' : 'Envoyer mes réponses'}
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-3 hidden text-center text-[12px] text-ink/50 sm:block">
              Astuce : répondez avec les touches 1 à 5 du clavier.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  )
}
