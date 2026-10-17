import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { listQuestions, reviewQuestion, type LiveQuestion } from '../api/engagement'
import { getSurveyStats } from '../api/surveys'
import { OrgaShell } from '../components/layout/OrgaShell'
import { joinRoom, onRealtime } from '../lib/socket'

/* Modération questions + aperçu questionnaire (temps réel Socket.IO). */
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
    joinRoom('live')
    const offCreated = onRealtime<LiveQuestion>('question:created', (q) => {
      setQuestions((prev) => [q, ...prev.filter((x) => x.id !== q.id)])
    })
    const offUpdated = onRealtime<LiveQuestion>('question:updated', (q) => {
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? q : x)))
    })
    const offSurvey = onRealtime<Awaited<ReturnType<typeof getSurveyStats>>>('survey:updated', setSurvey)
    return () => {
      offCreated()
      offUpdated()
      offSurvey()
    }
  }, [navigate, user])

  async function onReview(id: string, status: 'approved' | 'done' | 'rejected') {
    const updated = await reviewQuestion(id, status)
    setQuestions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
  }

  return (
    <OrgaShell
      title="Live & mesures"
      actions={
        <Link to="/questions" className="orga-btn">
          Formulaire public
        </Link>
      }
    >
      {error && <p className="mb-4 text-red-700">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="orga-panel">
          <h2 className="text-[15px] font-semibold text-forest">Questions en salle</h2>
          <ul className="mt-4 space-y-3">
            {questions.length === 0 && <li className="text-[13px] text-ink/40">Aucune</li>}
            {questions.map((q) => (
              <li key={q.id} className="border border-black bg-white p-3">
                <p className="text-[14px] text-forest">{q.body}</p>
                <p className="mt-1 text-[12px] text-ink/45">{q.author_name || 'Anonyme'} · {q.status}</p>
                {q.status === 'pending' && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => onReview(q.id, 'approved')} className="orga-btn px-3 py-1.5 text-[12px] font-semibold text-white">Approuver</button>
                    <button type="button" onClick={() => onReview(q.id, 'rejected')} className="orga-btn-ghost px-3 py-1.5 text-[12px] font-semibold">Refuser</button>
                  </div>
                )}
                {q.status === 'approved' && (
                  <button type="button" onClick={() => onReview(q.id, 'done')} className="mt-2 orga-btn px-3 py-1.5 text-[12px] font-semibold text-white">Marquer traitée</button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="orga-panel">
          <h2 className="text-[15px] font-semibold text-forest">Questionnaire avant / après</h2>
          {survey && (
            <>
              <p className="mt-2 text-[13px] text-ink/50">
                Avant : {survey.counts.before} · Après : {survey.counts.after}
              </p>
              <ul className="mt-4 space-y-2">
                {survey.averages.map((a) => (
                  <li key={a.key} className="border border-black bg-white px-3 py-2.5 text-[13px]">
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
