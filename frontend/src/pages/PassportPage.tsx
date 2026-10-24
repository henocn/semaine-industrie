import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPassport, type Passport } from '../api/passports'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Page publique « mon passeport » (groupe ou individuel). */
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

  const isGroup = passport?.kind === 'group'

  return (
    <main className="py-16 sm:py-24">
        <Seo
          title="Passeport"
          description="Passeport de visite de la Semaine de l’industrie 2026."
          path={code ? `/passeport/${code}` : '/passeport'}
          noIndex
        />
        <div className={WRAP}>
          {error && <p role="alert" className="text-lg font-medium text-forest">{error}</p>}
          {!error && !passport && <p className="text-ink/70">Chargement…</p>}
          {passport && (
            <>
              <div className="animate-rise">
                <SectionHeader
                  level={1}
                  eyebrow={`${isGroup ? 'Passeport de groupe' : 'Passeport'} ${passport.code}`}
                  title={isGroup
                    ? (passport.school_name || passport.holder_name || 'Parcours commun')
                    : (passport.holder_name || 'Parcours industrie')}
                  lead={isGroup
                    ? [
                        passport.class_label,
                        passport.headcount ? `${passport.headcount} élèves` : null,
                        'un tampon par site pour toute la classe',
                      ].filter(Boolean).join(' · ')
                    : ([passport.school_name, passport.class_label].filter(Boolean).join(' · ')
                      || 'Visites tamponnées ci-dessous')}
                />
              </div>

              <ul className="mt-12 border-t border-forest/15">
                {(passport.visits || []).length === 0 && (
                  <li className="py-8 text-ink/70">Aucune visite enregistrée pour l’instant.</li>
                )}
                {(passport.visits || []).map((v) => (
                  <li key={v.id} className="flex flex-wrap items-baseline justify-between gap-3 border-b border-forest/10 py-5">
                    <div>
                      <p className="text-xl font-semibold text-forest">{v.organization?.name}</p>
                      <p className="mt-1 text-[15px] text-ink/70">{v.organization?.city}</p>
                    </div>
                    <p className="text-[15px] text-ink/70">
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
