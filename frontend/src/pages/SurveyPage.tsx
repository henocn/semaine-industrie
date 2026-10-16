import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getSurveyQuestions, submitSurvey, type SurveyQuestion } from '../api/surveys'
import { Mark, WRAP } from '../components/layout/Mark'

/* Questionnaire avant / après (1–5). */
export default function SurveyPage() {
  const [params] = useSearchParams()
  const phase = (params.get('phase') === 'after' ? 'after' : 'before') as 'before' | 'after'
  const code = params.get('code') || ''
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSurveyQuestions().then(setQuestions).catch((err) => setError(err instanceof Error ? err.message : 'Erreur'))
  }, [])

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const answers: Record<string, number> = {}
    for (const q of questions) {
      answers[q.key] = Number(fd.get(q.key))
    }
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
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur">
        <div className={`${WRAP} flex h-16 items-center justify-between`}>
          <Link to="/" className="flex items-center gap-2.5 text-forest">
            <Mark className="h-6 w-auto text-leaf" />
            <span className="text-[15px] font-semibold">Semaine de l’industrie 2026</span>
          </Link>
        </div>
      </header>
      <main className="py-16 sm:py-24">
        <div className={`${WRAP} max-w-2xl`}>
          <h1 className="display text-4xl">
            Questionnaire {phase === 'before' ? 'avant' : 'après'}
          </h1>
          <p className="mt-4 text-lg text-ink/65">Notez de 1 (pas d’accord) à 5 (tout à fait d’accord).</p>
          {sent ? (
            <p className="mt-10 text-xl text-forest">Merci, vos réponses sont enregistrées.</p>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-8">
              {questions.map((q) => (
                <fieldset key={q.key}>
                  <legend className="text-[15px] font-medium text-forest">{q.label}</legend>
                  <div className="mt-3 flex gap-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-forest/20 text-[15px] has-[:checked]:bg-forest has-[:checked]:text-white">
                        <input required type="radio" name={q.key} value={n} className="sr-only" />
                        {n}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              {error && <p className="text-red-700">{error}</p>}
              <button type="submit" className="bg-forest px-8 py-4 text-[15px] font-semibold text-white hover:bg-ink">
                Envoyer
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
