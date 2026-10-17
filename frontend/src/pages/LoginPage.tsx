import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { Seo } from '../components/Seo'
import { BrandLogo } from '../components/layout/Mark'

const field =
  'mt-2 w-full border-0 border-b border-forest/25 bg-transparent px-0 py-3 text-lg text-ink placeholder:text-ink/35 focus:border-forest focus:outline-none focus:ring-0'

/* Page de connexion, hors header public. */
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
      if (session.user.role === 'orga') navigate('/orga')
      else navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-svh overflow-hidden lg:grid-cols-2">
      <Seo title="Connexion" path="/login" noIndex />
      <div className="relative flex h-full items-center justify-center px-6 sm:px-12">
        <Link to="/" className="absolute left-6 top-6 sm:left-10 sm:top-8">
          <BrandLogo className="h-10 w-auto" />
        </Link>

        <div className="w-full max-w-sm">
          <h1 className="display text-4xl">Connexion</h1>

          <form onSubmit={onSubmit} className="mt-10 grid gap-8">
            <label className="block text-[15px] font-medium text-forest">
              E-mail
              <input
                required
                type="email"
                name="email"
                autoComplete="username"
                className={field}
              />
            </label>
            <label className="block text-[15px] font-medium text-forest">
              Mot de passe
              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
                className={field}
              />
            </label>
            {error && <p className="text-[15px] text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-forest px-8 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>

      <div className="relative hidden h-full overflow-hidden bg-forest lg:block">
        <img
          src="/images/hall.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-forest/55" />
        <div className="relative flex h-full items-center justify-center px-12 text-center">
          <div className="max-w-md">
            <h2 className="display text-[clamp(1.75rem,3vw,2.5rem)] !text-white">
              Portail d’administration
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/80">
              Labels, passeports, visites et bilan : un seul espace pour piloter la semaine.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
