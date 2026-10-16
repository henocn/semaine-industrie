import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { Mark, WRAP } from '../components/layout/Mark'

const field =
  'mt-2 w-full border-0 border-b border-forest/25 bg-transparent px-0 py-3 text-lg text-ink focus:border-forest focus:outline-none'

/* Page de connexion espaces connectés. */
export default function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  /* Authentifie et redirige selon le rôle. */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    try {
      const session = await login(String(fd.get('email')), String(fd.get('password')))
      if (session.user.role === 'orga') navigate('/orga/labels')
      else navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <header className="border-b border-forest/10 bg-white">
        <div className={`${WRAP} flex h-16 items-center`}>
          <Link to="/" className="flex items-center gap-2.5 text-forest">
            <Mark className="h-6 w-auto text-leaf" />
            <span className="text-[15px] font-semibold">Semaine de l’industrie 2026</span>
          </Link>
        </div>
      </header>
      <main className="py-20">
        <div className={`${WRAP} max-w-md`}>
          <h1 className="display text-4xl">Connexion</h1>
          <p className="mt-4 text-ink/65">Espace organisation, enseignants et partenaires.</p>
          <form onSubmit={onSubmit} className="mt-10 grid gap-8">
            <label className="block text-[15px] font-medium text-forest">
              E-mail
              <input required type="email" name="email" className={field} autoComplete="username" />
            </label>
            <label className="block text-[15px] font-medium text-forest">
              Mot de passe
              <input required type="password" name="password" className={field} autoComplete="current-password" />
            </label>
            {error && <p className="text-[15px] text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-forest px-8 py-4 text-[15px] font-semibold text-white hover:bg-ink disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </main>
    </>
  )
}
