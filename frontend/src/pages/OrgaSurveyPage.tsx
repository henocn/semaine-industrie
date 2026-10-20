import { useEffect, useState, type FormEvent } from 'react'
import {
  createSurveyQuestion,
  deleteSurveyQuestion,
  getSurveyStats,
  listSurveyQuestionsAdmin,
  moveSurveyQuestion,
  updateSurveyQuestion,
  type SurveyQuestion,
  type SurveyStats,
} from '../api/surveys'
import { OrgaShell } from '../components/layout/OrgaShell'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Backoffice : questions d'enquête + aperçu des réponses. */
export default function OrgaSurveyPage() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const [label, setLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')

  /* Charge questions et stats. */
  async function load() {
    try {
      setError(null)
      const [q, s] = await Promise.all([listSurveyQuestionsAdmin(), getSurveyStats()])
      setQuestions(q)
      setStats(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  /* Ajoute une question. */
  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createSurveyQuestion(label.trim())
      setLabel('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Enregistre l'édition d'un libellé. */
  async function onSaveEdit(id: string) {
    if (!editLabel.trim()) return
    setBusy(true)
    try {
      await updateSurveyQuestion(id, { label: editLabel.trim() })
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <OrgaShell
      title="Enquête"
      actions={
        <a
          href="https://semaineindustrie.tg/questionnaire"
          target="_blank"
          rel="noopener noreferrer"
          className="orga-btn"
        >
          Voir le formulaire public
        </a>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="orga-panel mb-6">
        <h2 className="text-[15px] font-semibold text-forest">Questions</h2>
        <p className="mt-1 text-[13px] text-ink/50">
          Ces questions apparaissent sur le site public (notes de 1 à 5, avant / après).
        </p>

        <form onSubmit={onAdd} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-[13px] font-medium text-forest">
            Nouvelle question
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={field}
              placeholder="Ex. Je recommande cette visite à un ami"
              maxLength={400}
            />
          </label>
          <button type="submit" disabled={busy || !label.trim()} className="orga-btn disabled:opacity-50">
            Ajouter
          </button>
        </form>

        <ul className="mt-5 space-y-2">
          {questions.length === 0 && (
            <li className="text-[13px] text-ink/40">Aucune question pour l&apos;instant.</li>
          )}
          {questions.map((q, index) => (
            <li key={q.id || q.key} className="border border-black bg-white px-3 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                    #{index + 1} · {q.key}
                    {!q.is_active && ' · inactive'}
                  </p>
                  {editingId === q.id ? (
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className={`${field} mt-2`}
                    />
                  ) : (
                    <p className="mt-1 text-[14px] font-medium text-forest">{q.label}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="orga-btn-ghost px-2 py-1 text-[12px]"
                    disabled={busy || index === 0}
                    onClick={async () => {
                      if (!q.id) return
                      await moveSurveyQuestion(q.id, 'up')
                      await load()
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="orga-btn-ghost px-2 py-1 text-[12px]"
                    disabled={busy || index === questions.length - 1}
                    onClick={async () => {
                      if (!q.id) return
                      await moveSurveyQuestion(q.id, 'down')
                      await load()
                    }}
                  >
                    ↓
                  </button>
                  {editingId === q.id ? (
                    <>
                      <button
                        type="button"
                        className="orga-btn px-3 py-1 text-[12px]"
                        disabled={busy}
                        onClick={() => q.id && void onSaveEdit(q.id)}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        className="orga-btn-ghost px-3 py-1 text-[12px]"
                        onClick={() => setEditingId(null)}
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="orga-btn-ghost px-3 py-1 text-[12px]"
                      onClick={() => {
                        setEditingId(q.id || null)
                        setEditLabel(q.label)
                      }}
                    >
                      Modifier
                    </button>
                  )}
                  <button
                    type="button"
                    className="orga-btn-ghost px-3 py-1 text-[12px]"
                    disabled={busy || !q.id}
                    onClick={async () => {
                      if (!q.id) return
                      await updateSurveyQuestion(q.id, { is_active: !q.is_active })
                      await load()
                    }}
                  >
                    {q.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    type="button"
                    className="orga-btn-ghost px-3 py-1 text-[12px] text-red-700"
                    disabled={busy || !q.id}
                    onClick={async () => {
                      if (!q.id) return
                      if (!window.confirm('Supprimer cette question ?')) return
                      await deleteSurveyQuestion(q.id)
                      await load()
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="orga-panel">
        <h2 className="text-[15px] font-semibold text-forest">Résultats</h2>
        {stats ? (
          <>
            <p className="mt-2 text-[13px] text-ink/55">
              {stats.total} réponse{stats.total > 1 ? 's' : ''} · avant {stats.counts.before} · après{' '}
              {stats.counts.after}
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="orga-table min-w-[560px]">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Moy. avant</th>
                    <th>Moy. après</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.averages.map((a) => (
                    <tr key={a.key}>
                      <td className="font-medium text-forest">{a.label}</td>
                      <td>{a.before ?? '—'}</td>
                      <td>{a.after ?? '—'}</td>
                    </tr>
                  ))}
                  {stats.averages.length === 0 && (
                    <tr>
                      <td colSpan={3}>Pas encore de données</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="mt-2 text-[13px] text-ink/40">Chargement…</p>
        )}
      </section>
    </OrgaShell>
  )
}
