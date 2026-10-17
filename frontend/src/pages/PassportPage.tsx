import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPassport, type Passport } from '../api/passports'
import { WRAP } from '../components/layout/Mark'

/* Page publique « mon passeport ». */
export default function PassportPage() {
  const { code = '' } = useParams()
  const [passport, setPassport] = useState<Passport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return
    getPassport(code)
      .then(setPassport)
      .catch((err) => setError(err instanceof Error ? err.message : 'Introuvable'))
  }, [code])

  return (
    <main className="py-16 sm:py-24">
        <div className={WRAP}>
          {error && <p className="text-lg text-forest">{error}</p>}
          {!error && !passport && <p className="text-ink/55">Chargement…</p>}
          {passport && (
            <>
              <p className="text-[15px] font-semibold text-leaf">Passeport {passport.code}</p>
              <h1 className="display mt-3 text-4xl sm:text-5xl">
                {passport.holder_name || 'Parcours industrie'}
              </h1>
              <p className="mt-4 text-lg text-ink/65">
                {[passport.school_name, passport.class_label].filter(Boolean).join(' · ') || 'Visites tamponnées ci-dessous'}
              </p>

              <ul className="mt-12 border-t border-forest/15">
                {(passport.visits || []).length === 0 && (
                  <li className="py-8 text-ink/50">Aucune visite enregistrée pour l’instant.</li>
                )}
                {(passport.visits || []).map((v) => (
                  <li key={v.id} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-forest/10 py-5">
                    <div>
                      <p className="text-xl font-semibold text-forest">{v.organization?.name}</p>
                      <p className="mt-1 text-[15px] text-ink/55">{v.organization?.city}</p>
                    </div>
                    <p className="text-[15px] text-ink/45">
                      {new Date(v.scanned_at).toLocaleString('fr-FR')}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>
  )
}
