import { useEffect, useState, type DragEvent, type FormEvent } from 'react'
import {
  createSurveyQuestion,
  deleteSurveyQuestion,
  getSurveyStats,
  listSurveyQuestionsAdmin,
  reorderSurveyQuestions,
  updateSurveyQuestion,
  type SurveyQuestion,
  type SurveyQuestionKind,
  type SurveyStats,
} from '../api/surveys'
import { OrgaShell } from '../components/layout/OrgaShell'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

const iconBtn =
  'grid h-9 w-9 place-items-center border border-black bg-white text-forest hover:bg-forest hover:text-white disabled:opacity-40'

/* Icône crayon. */
function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 20h4L19 9l-4-4L4 16v4z" />
      <path d="m13 7 4 4" />
    </svg>
  )
}

/* Icône poubelle. */
function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 7h14M10 11v6M14 11v6M9 7V5h6v2M7 7l1 12h8l1-12" />
    </svg>
  )
}

/* Icône poignée drag. */
function IconGrip() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="7" r="1.4" />
      <circle cx="15" cy="7" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="17" r="1.4" />
      <circle cx="15" cy="17" r="1.4" />
    </svg>
  )
}

/* Backoffice : questions d'enquête + aperçu des réponses. */
export default function OrgaSurveyPage() {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])
  const [stats, setStats] = useState<SurveyStats | null>(null)
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<SurveyQuestionKind>('scale')
  const [optionsText, setOptionsText] = useState('Oui\nNon')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editKind, setEditKind] = useState<SurveyQuestionKind>('scale')
  const [editOptionsText, setEditOptionsText] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)

  /* Parse les options (une par ligne). */
  function parseOptions(text: string) {
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
  }

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
      const payload =
        kind === 'choice'
          ? { label: label.trim(), kind, options: parseOptions(optionsText) }
          : { label: label.trim(), kind: 'scale' as const }
      await createSurveyQuestion(payload)
      setLabel('')
      setKind('scale')
      setOptionsText('Oui\nNon')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Enregistre l'édition. */
  async function onSaveEdit(id: string) {
    if (!editLabel.trim()) return
    setBusy(true)
    try {
      await updateSurveyQuestion(id, {
        label: editLabel.trim(),
        kind: editKind,
        options: editKind === 'choice' ? parseOptions(editOptionsText) : null,
      })
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Début du drag. */
  function onDragStart(id: string) {
    setDragId(id)
  }

  /* Survol pendant le drag : réordonne localement. */
  function onDragOver(e: DragEvent, overId: string) {
    e.preventDefault()
    if (!dragId || dragId === overId) return
    setQuestions((prev) => {
      const from = prev.findIndex((q) => q.id === dragId)
      const to = prev.findIndex((q) => q.id === overId)
      if (from < 0 || to < 0) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  /* Fin du drag : persiste l'ordre. */
  async function onDragEnd() {
    if (!dragId) return
    setDragId(null)
    const ids = questions.map((q) => q.id).filter(Boolean) as string[]
    if (ids.length < 2) return
    setBusy(true)
    try {
      const ordered = await reorderSurveyQuestions(ids)
      setQuestions(ordered)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réordonnancement impossible')
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <OrgaShell title="Sondage">
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="orga-panel mb-6">
        <h2 className="text-[15px] font-semibold text-forest">Questions</h2>
        <p className="mt-1 text-[13px] text-ink/50">
          Glissez pour réordonner. Note 1 à 5, ou question à choix.
        </p>

        <form onSubmit={onAdd} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="text-[13px] font-medium text-forest">
              Nouvelle question
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={field}
                placeholder="Ex. Je recommande cette visite"
                maxLength={400}
              />
            </label>
            <label className="text-[13px] font-medium text-forest">
              Type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as SurveyQuestionKind)}
                className={field}
              >
                <option value="scale">Note 1 à 5</option>
                <option value="choice">Choix multiples</option>
              </select>
            </label>
          </div>
          {kind === 'choice' && (
            <label className="block text-[13px] font-medium text-forest">
              Options (une par ligne)
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={4}
                className={`${field} resize-y`}
                placeholder={'Oui\nNon\nPeut-être'}
              />
            </label>
          )}
          <button
            type="submit"
            disabled={busy || !label.trim() || (kind === 'choice' && parseOptions(optionsText).length < 2)}
            className="orga-btn disabled:opacity-50"
          >
            Ajouter
          </button>
        </form>

        <ul className="mt-5 space-y-2">
          {questions.length === 0 && (
            <li className="text-[13px] text-ink/40">Aucune question pour l&apos;instant.</li>
          )}
          {questions.map((q, index) => (
            <li
              key={q.id || q.key}
              draggable={Boolean(q.id) && editingId !== q.id}
              onDragStart={() => q.id && onDragStart(q.id)}
              onDragOver={(e) => q.id && onDragOver(e, q.id)}
              onDragEnd={() => void onDragEnd()}
              className={`border border-black bg-white px-3 py-3 ${
                dragId === q.id ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 shrink-0 cursor-grab text-ink/35 active:cursor-grabbing"
                  title="Glisser pour réordonner"
                  aria-hidden="true"
                >
                  <IconGrip />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                    #{index + 1} · {q.kind === 'choice' ? 'Choix' : 'Note 1-5'}
                  </p>
                  {editingId === q.id ? (
                    <div className="mt-2 space-y-2">
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        className={field}
                      />
                      <select
                        value={editKind}
                        onChange={(e) => setEditKind(e.target.value as SurveyQuestionKind)}
                        className={field}
                      >
                        <option value="scale">Note 1 à 5</option>
                        <option value="choice">Choix multiples</option>
                      </select>
                      {editKind === 'choice' && (
                        <textarea
                          value={editOptionsText}
                          onChange={(e) => setEditOptionsText(e.target.value)}
                          rows={3}
                          className={`${field} resize-y`}
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="orga-btn px-3 py-1.5 text-[12px]"
                          disabled={busy}
                          onClick={() => q.id && void onSaveEdit(q.id)}
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button"
                          className="orga-btn-ghost px-3 py-1.5 text-[12px]"
                          onClick={() => setEditingId(null)}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-[14px] font-medium text-forest">{q.label}</p>
                      {q.kind === 'choice' && Array.isArray(q.options) && (
                        <p className="mt-1 text-[12px] text-ink/45">{q.options.join(' · ')}</p>
                      )}
                    </>
                  )}
                </div>
                {editingId !== q.id && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className={iconBtn}
                      title="Modifier"
                      aria-label="Modifier"
                      disabled={busy || !q.id}
                      onClick={() => {
                        setEditingId(q.id || null)
                        setEditLabel(q.label)
                        setEditKind(q.kind === 'choice' ? 'choice' : 'scale')
                        setEditOptionsText((q.options || []).join('\n'))
                      }}
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className={`${iconBtn} text-red-700 hover:bg-red-700 hover:text-white`}
                      title="Supprimer"
                      aria-label="Supprimer"
                      disabled={busy || !q.id}
                      onClick={async () => {
                        if (!q.id) return
                        if (!window.confirm('Supprimer cette question ?')) return
                        setBusy(true)
                        try {
                          await deleteSurveyQuestion(q.id)
                          await load()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Suppression impossible')
                        } finally {
                          setBusy(false)
                        }
                      }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                )}
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
            {(stats.averages?.length ?? 0) > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="orga-table min-w-[560px]">
                  <thead>
                    <tr>
                      <th>Note 1 à 5</th>
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
                  </tbody>
                </table>
              </div>
            )}
            {(stats.choices?.length ?? 0) > 0 && (
              <div className="mt-6 space-y-4">
                {stats.choices?.map((c) => (
                  <div key={c.key} className="border border-black p-3">
                    <p className="text-[14px] font-semibold text-forest">{c.label}</p>
                    <ul className="mt-2 space-y-1 text-[13px] text-ink/70">
                      {c.options.map((opt) => (
                        <li key={opt}>
                          {opt} : avant {c.before[opt] || 0} · après {c.after[opt] || 0}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {!stats.averages?.length && !stats.choices?.length && (
              <p className="mt-3 text-[13px] text-ink/40">Pas encore de données</p>
            )}
          </>
        ) : (
          <p className="mt-2 text-[13px] text-ink/40">Chargement…</p>
        )}
      </section>
    </OrgaShell>
  )
}
