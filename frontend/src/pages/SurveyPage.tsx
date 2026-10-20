import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getSurveyQuestions,
  submitSurvey,
  type SurveyAnswerValue,
  type SurveyQuestion,
} from '../api/surveys'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Indique si une réponse est valide pour la question. */
function isAnswered(q: SurveyQuestion, value: SurveyAnswerValue | undefined) {
  if (q.kind === 'choice') {
    return typeof value === 'string' && value.length > 0
  }
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && n <= 5
}

/* Questionnaire pas à pas (une question, puis Suivant). */
export default function SurveyPage() {
  const [params] = useSearchParams()
  const phase = (params.get('phase') === 'after' ? 'after' : 'before') as 'before' | 'after'
  const code = params.get('code') || ''
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, SurveyAnswerValue>>({})
  const [step, setStep] = useState(0)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSurveyQuestions()
      .then(setQuestions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [])

  const total = questions.length
  const current = questions[step] || null
  const isLast = step >= total - 1
  const currentAnswered = current ? isAnswered(current, answers[current.key]) : false

  const allComplete = useMemo(
    () => total > 0 && questions.every((q) => isAnswered(q, answers[q.key])),
    [answers, questions, total],
  )

  /* Enregistre une réponse pour la question courante. */
  function setAnswer(value: SurveyAnswerValue) {
    if (!current) return
    setAnswers((prev) => ({ ...prev, [current.key]: value }))
    setError(null)
  }

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
    setError(null)
    setStep((s) => Math.max(0, s - 1))
  }

  /* Envoie le questionnaire. */
  async function onSubmit() {
    if (!allComplete) {
      setError('Merci de répondre à toutes les questions.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await submitSurvey({
        phase,
        answers,
        passport_code: code || undefined,
        source: 'qr',
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="py-12 sm:py-16">
      <Seo
        title="Questionnaire"
        description="Questionnaire avant ou après visite pour la Semaine de l'industrie 2026."
        path="/questionnaire"
      />
      <div className={`${WRAP} max-w-lg`}>
        <div className="animate-rise">
          <SectionHeader
            level={1}
            eyebrow="Enquête"
            title={phase === 'before' ? 'Avant la visite' : 'Après la visite'}
          />
        </div>

        {sent ? (
          <div className="mt-10 border-2 border-sun bg-sage px-5 py-8 text-center">
            <p className="text-lg font-semibold text-forest">Merci</p>
            <p className="mt-2 text-[15px] text-ink/75">Vos réponses sont enregistrées.</p>
          </div>
        ) : loading ? (
          <p className="mt-10 text-[15px] text-ink/70">Chargement…</p>
        ) : total === 0 ? (
          <p className="mt-10 text-[15px] text-ink/70">Le questionnaire n&apos;est pas encore disponible.</p>
        ) : current ? (
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
                  style={{ width: `${Math.min(((step + 1) / total) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="min-h-[220px]">
              <p className="text-[18px] font-semibold leading-snug text-forest sm:text-[20px]">
                {current.label}
              </p>

              {current.kind === 'choice' ? (
                <ul className="mt-6 space-y-2" role="radiogroup" aria-label={current.label}>
                  {(current.options || []).map((opt) => {
                    const active = answers[current.key] === opt
                    return (
                      <li key={opt}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setAnswer(opt)}
                          className={`w-full border border-forest/40 px-4 py-3.5 text-left text-[15px] font-medium transition-colors ${
                            active
                              ? 'bg-forest text-white'
                              : 'bg-white text-ink/85 hover:bg-sage'
                          }`}
                        >
                          {opt}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-ink/70">
                    <span>Pas d&apos;accord</span>
                    <span>Tout à fait</span>
                  </div>
                  <div
                    className="mt-2 grid grid-cols-5 border border-forest/40"
                    role="radiogroup"
                    aria-label={current.label}
                  >
                    {[1, 2, 3, 4, 5].map((n) => {
                      const active = answers[current.key] === n
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setAnswer(n)}
                          className={`h-14 text-[16px] font-semibold transition-colors ${
                            n > 1 ? 'border-l border-forest/40' : ''
                          } ${
                            active
                              ? 'bg-forest text-white'
                              : 'bg-white text-ink/75 hover:bg-sage'
                          }`}
                        >
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {error && <p role="alert" className="mt-4 text-[14px] font-medium text-flag">{error}</p>}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {step > 0 && (
                <Button variant="link" onClick={onPrev}>
                  Précédent
                </Button>
              )}
              <div className="ml-auto">
                {!isLast ? (
                  <Button onClick={onNext} disabled={!currentAnswered}>
                    Suivant
                  </Button>
                ) : (
                  <Button onClick={() => void onSubmit()} disabled={busy || !allComplete} withArrow={false}>
                    {busy ? 'Envoi…' : 'Envoyer'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}
