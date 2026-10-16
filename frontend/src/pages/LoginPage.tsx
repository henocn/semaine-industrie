import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { Mark } from '../components/layout/Mark'

/* Page de connexion — entrée du backoffice. */
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
    <div className="grid min-h-svh bg-[#f3f4f6] lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-between p-8 sm:p-12">
        <Link to="/" className="flex items-center gap-2.5 text-forest">
          <Mark className="h-6 w-auto text-leaf" />
          <span className="text-[15px] font-semibold">Semaine Industrie</span>
        </Link>

        <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-[28px] font-semibold tracking-tight text-forest">Connexion</h1>
          <p className="mt-2 text-[14px] text-ink/50">Espace organisation et partenaires.</p>

          <form onSubmit={onSubmit} className="mt-8 grid gap-5">
            <label className="block text-[13px] font-medium text-forest">
              E-mail
              <input
                required
                type="email"
                name="email"
                autoComplete="username"
                className="mt-2 w-full rounded-xl border-0 bg-[#f3f4f6] px-4 py-3 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-forest/15"
              />
            </label>
            <label className="block text-[13px] font-medium text-forest">
              Mot de passe
              <input
                required
                type="password"
                name="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border-0 bg-[#f3f4f6] px-4 py-3 text-[15px] text-ink focus:outline-none focus:ring-2 focus:ring-forest/15"
              />
            </label>
            {error && <p className="text-[13px] text-red-700">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-forest px-5 py-3.5 text-[14px] font-semibold text-white hover:bg-ink disabled:opacity-60"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-[12px] text-ink/40">© 2026 Semaine de l’industrie</p>
      </div>

      <div className="relative hidden overflow-hidden bg-forest lg:block">
        <img src="/images/hall.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/70 to-transparent" />
        <div className="relative flex h-full items-end p-12">
          <div className="max-w-md text-white">
            <p className="text-[13px] font-semibold text-sun">Backoffice</p>
            <h2 className="mt-3 text-[36px] font-semibold leading-tight tracking-tight">
              Piloter labels, QR et bilan depuis un seul espace.
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}
