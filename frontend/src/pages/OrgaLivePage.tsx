import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { listQuestions, reviewQuestion, type LiveQuestion } from '../api/engagement'
import { getSurveyStats } from '../api/surveys'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Modération questions + aperçu questionnaire. */
export default function OrgaLivePage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [questions, setQuestions] = useState<LiveQuestion[]>([])
  const [survey, setSurvey] = useState<Awaited<ReturnType<typeof getSurveyStats>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const [q, s] = await Promise.all([listQuestions(), getSurveyStats()])
      setQuestions(q)
      setSurvey(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
      navigate('/login')
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'orga') {
      navigate('/login')
      return
    }
    load()
  }, [navigate, user])

  async function onReview(id: string, status: 'approved' | 'done' | 'rejected') {
    await reviewQuestion(id, status)
    await load()
  }

  return (
    <OrgaShell
      title="Live & mesures"
      actions={
        <Link to="/questions" className="rounded-xl bg-forest px-4 py-2.5 text-[13px] font-semibold text-white">
          Formulaire public
        </Link>
      }
    >
      {error && <p className="mb-4 text-red-700">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold text-forest">Questions en salle</h2>
          <ul className="mt-4 space-y-3">
            {questions.length === 0 && <li className="text-[13px] text-ink/40">Aucune</li>}
            {questions.map((q) => (
              <li key={q.id} className="rounded-xl bg-[#f7f8f9] p-3">
                <p className="text-[14px] text-forest">{q.body}</p>
                <p className="mt-1 text-[12px] text-ink/45">{q.author_name || 'Anonyme'} · {q.status}</p>
                {q.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => onReview(q.id, 'approved')} className="rounded-lg bg-forest px-3 py-1.5 text-[12px] font-semibold text-white">Approuver</button>
                    <button type="button" onClick={() => onReview(q.id, 'rejected')} className="rounded-lg bg-[#e5e7eb] px-3 py-1.5 text-[12px] font-semibold">Refuser</button>
                  </div>
                )}
                {q.status === 'approved' && (
                  <button type="button" onClick={() => onReview(q.id, 'done')} className="mt-2 rounded-lg bg-leaf px-3 py-1.5 text-[12px] font-semibold text-white">Marquer traitée</button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-[15px] font-semibold text-forest">Questionnaire avant / après</h2>
          {survey && (
            <>
              <p className="mt-2 text-[13px] text-ink/50">
                Avant : {survey.counts.before} · Après : {survey.counts.after}
              </p>
              <ul className="mt-4 space-y-2">
                {survey.averages.map((a) => (
                  <li key={a.key} className="rounded-xl bg-[#f7f8f9] px-3 py-2.5 text-[13px]">
                    <p className="text-ink/70">{a.label}</p>
                    <p className="mt-1 font-semibold text-forest">
                      {a.before ?? '—'} → {a.after ?? '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </OrgaShell>
  )
}
