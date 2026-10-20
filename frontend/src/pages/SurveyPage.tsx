import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSurveyQuestions, submitSurvey, type SurveyQuestion } from '../api/surveys'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'

/* Questionnaire avant / après, notation compacte 1 à 5. */
export default function SurveyPage() {
  const [params] = useSearchParams()
  const phase = (params.get('phase') === 'after' ? 'after' : 'before') as 'before' | 'after'
  const code = params.get('code') || ''
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSurveyQuestions()
      .then(setQuestions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
  }, [])

  const complete = questions.length > 0 && questions.every((q) => answers[q.key] >= 1 && answers[q.key] <= 5)

  /* Enregistre les notes. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!complete) {
      setError('Merci de noter chaque affirmation.')
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
      <div className={`${WRAP} max-w-xl`}>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-forest/70">
          Enquête
        </p>
        <h1 className="display mt-2 text-3xl tracking-tight text-forest sm:text-4xl">
          {phase === 'before' ? 'Avant la visite' : 'Après la visite'}
        </h1>
        <p className="mt-2 text-[15px] text-ink/55">
          De 1 (pas d&apos;accord) à 5 (tout à fait).
        </p>

        {sent ? (
          <p className="mt-10 border border-forest bg-forest/5 px-5 py-6 text-lg text-forest">
            Merci, vos réponses sont enregistrées.
          </p>
        ) : questions.length === 0 && !error ? (
          <p className="mt-10 text-[15px] text-ink/55">Le questionnaire n&apos;est pas encore disponible.</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8">
            <div className="mb-3 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-ink/40">
              <span>Pas d&apos;accord</span>
              <span>Tout à fait</span>
            </div>

            <ul className="divide-y divide-black/10 border-y border-black">
              {questions.map((q) => {
                const value = answers[q.key]
                return (
                  <li key={q.key} className="py-4">
                    <p className="text-[14px] font-medium leading-snug text-forest">{q.label}</p>
                    <div
                      className="mt-2.5 grid grid-cols-5 border border-black"
                      role="radiogroup"
                      aria-label={q.label}
                    >
                      {[1, 2, 3, 4, 5].map((n) => {
                        const active = value === n
                        return (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [q.key]: n }))
                              setError(null)
                            }}
                            className={`h-10 text-[14px] font-semibold transition-colors ${
                              n > 1 ? 'border-l border-black' : ''
                            } ${
                              active
                                ? 'bg-forest text-white'
                                : 'bg-white text-ink/70 hover:bg-forest/5'
                            }`}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                  </li>
                )
              })}
            </ul>

            {error && <p className="mt-4 text-[14px] text-red-700">{error}</p>}

            <button
              type="submit"
              disabled={busy || !complete}
              className="mt-6 w-full bg-forest px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-ink disabled:opacity-45 sm:w-auto"
            >
              {busy ? 'Envoi…' : 'Envoyer'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
