import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { registerParticipant } from '../api/business'
import { Mark, WRAP } from '../components/layout/Mark'

const field =
  'mt-2 w-full border-0 border-b border-forest/25 bg-transparent px-0 py-3 text-lg text-ink focus:border-forest focus:outline-none'

/* Inscription publique aux rencontres d'affaires. */
export default function BusinessRegisterPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /* Envoie le profil B2B. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    try {
      await registerParticipant({
        kind: String(fd.get('kind') || 'pme'),
        organization_name: String(fd.get('organization_name') || ''),
        contact_name: String(fd.get('contact_name') || ''),
        email: String(fd.get('email') || ''),
        phone: String(fd.get('phone') || '') || undefined,
        sector: String(fd.get('sector') || '') || undefined,
        offers: String(fd.get('offers') || '') || undefined,
        seeks: String(fd.get('seeks') || '') || undefined,
        country: String(fd.get('country') || '') || undefined,
      })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setLoading(false)
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
          <Link to="/" className="text-[15px] text-ink/70 hover:text-forest">Retour</Link>
        </div>
      </header>

      <main className="py-16 sm:py-24">
        <div className={`${WRAP} grid gap-14 md:grid-cols-[1fr_1.15fr]`}>
          <div>
            <h1 className="display text-4xl sm:text-5xl">Rencontres d’affaires</h1>
            <p className="mt-6 max-w-md text-lg text-ink/70">
              Investisseurs, acheteurs et PME : déposez un profil court. L’équipe prépare les rendez-vous du vendredi.
            </p>
          </div>

          {sent ? (
            <p className="self-center text-xl text-forest">
              Merci. Votre profil est enregistré. Vous recevrez le planning après validation.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-8 sm:grid-cols-2">
              <label className="block text-[15px] font-medium text-forest">
                Profil
                <select name="kind" className={field} defaultValue="pme">
                  <option value="pme">PME / industrie</option>
                  <option value="investisseur">Investisseur</option>
                  <option value="acheteur">Acheteur</option>
                </select>
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Pays
                <input name="country" defaultValue="Togo" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Organisation
                <input required name="organization_name" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Contact
                <input required name="contact_name" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                E-mail
                <input required type="email" name="email" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Téléphone
                <input name="phone" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest">
                Secteur
                <input name="sector" className={field} />
              </label>
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Ce que je fabrique / propose
                <textarea name="offers" rows={3} className={`${field} resize-none`} />
              </label>
              <label className="block text-[15px] font-medium text-forest sm:col-span-2">
                Ce que je cherche
                <textarea name="seeks" rows={3} className={`${field} resize-none`} />
              </label>
              {error && <p className="text-[15px] text-red-700 sm:col-span-2">{error}</p>}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-forest px-8 py-4 text-[15px] font-semibold text-white hover:bg-ink disabled:opacity-60"
                >
                  {loading ? 'Envoi…' : 'Déposer mon profil'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  )
}
