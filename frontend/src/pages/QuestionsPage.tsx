import { useState, type FormEvent } from 'react'
import { askQuestion } from '../api/engagement'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'

const field =
  'mt-2 w-full border-0 border-b border-forest/25 bg-transparent px-0 py-3 text-lg text-ink focus:border-forest focus:outline-none'

/* Envoi de questions en direct (forum). */
export default function QuestionsPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await askQuestion({
        body: String(fd.get('body') || ''),
        author_name: String(fd.get('author_name') || '') || undefined,
        session_key: 'forum',
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    }
  }

  return (
    <main className="py-16 sm:py-24">
        <Seo
          title="Questions live"
          description="Posez une question pendant les tables rondes de la Semaine de l’industrie 2026."
          path="/questions"
        />
        <div className={`${WRAP} max-w-xl`}>
          <h1 className="display text-4xl">Poser une question</h1>
          <p className="mt-4 text-lg text-ink/65">Tables rondes : le modérateur triera ensuite.</p>
          {sent ? (
            <p className="mt-10 text-xl text-forest">Merci, votre question a été envoyée.</p>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 grid gap-8">
              <label className="text-[15px] font-medium text-forest">
                Prénom (optionnel)
                <input name="author_name" className={field} />
              </label>
              <label className="text-[15px] font-medium text-forest">
                Question
                <textarea required name="body" rows={4} className={`${field} resize-none`} />
              </label>
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
