import { useState, type FormEvent } from 'react'
import { askQuestion } from '../api/engagement'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { SectionHeader } from '../components/ui/SectionHeader'

const field =
  'w-full rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-base text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-energy/30'

/* Envoi de questions en direct (forum). */
export default function QuestionsPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /* Envoie la question au modérateur. */
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
        <div className="animate-rise">
          <SectionHeader
            level={1}
            eyebrow="Tables rondes"
            title="Poser une question"
            lead="Le modérateur triera ensuite les questions."
          />
        </div>
        {sent ? (
          <div className="mt-10 rounded-sm border-2 border-sun bg-sage p-6">
            <p className="text-xl text-forest">Merci, votre question a été envoyée.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 grid gap-6">
            <Field label="Prénom" optional>
              <input name="author_name" autoComplete="given-name" className={field} />
            </Field>
            <Field label="Question">
              <textarea required name="body" rows={4} className={`${field} resize-none`} />
            </Field>
            {error && (
              <p role="alert" className="text-[15px] font-medium text-flag">
                {error}
              </p>
            )}
            <div>
              <Button type="submit" withArrow={false}>Envoyer</Button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
