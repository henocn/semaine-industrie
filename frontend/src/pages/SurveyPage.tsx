import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getSurveyQuestions, submitSurvey, type SurveyQuestion } from '../api/surveys'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'

/* Questionnaire avant / après (notes de 1 a 5). */
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
    <main className="py-16 sm:py-24">
        <Seo
          title="Questionnaire"
          description="Questionnaire avant ou après visite pour la Semaine de l’industrie 2026."
          path="/questionnaire"
        />
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
  )
}
