import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { getPassport, recordPassage, type Passport } from '../api/passports'
import { Seo } from '../components/Seo'
import { WRAP } from '../components/layout/Mark'
import { Button } from '../components/ui/Button'
import { SectionHeader } from '../components/ui/SectionHeader'

const STORAGE_KEY = 'si26_industry_code'

const field =
  'w-full rounded-sm border border-forest/25 bg-white px-3 py-2.5 text-base uppercase text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-2 focus:ring-energy/30'

/* Lit le code industrie déjà saisi sur cet appareil. */
function readStoredCode() {
  try {
    return String(localStorage.getItem(STORAGE_KEY) || '').trim().toUpperCase()
  } catch {
    return ''
  }
}

/* Garde le code industrie pour les prochains scans. */
function storeCode(code: string) {
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* stockage indisponible */
  }
}

/* Page ouverte par le QR visiteur : l'industrie confirme le passage. */
export default function PassagePage() {
  const { code = '' } = useParams()
  const visitorCode = code.trim().toUpperCase()
  const [passport, setPassport] = useState<Passport | null>(null)
  const [industryCode, setIndustryCode] = useState(readStoredCode)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ name: string; site: string; already: boolean } | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!visitorCode) return
    getPassport(visitorCode)
      .then(setPassport)
      .catch((err) => setError(err instanceof Error ? err.message : 'QR introuvable'))
  }, [visitorCode])

  const visitorName = passport
    ? (passport.holder_name || passport.school_name || passport.code)
    : visitorCode

  /* Enregistre le passage avec le code industrie. */
  async function onConfirm(e: FormEvent) {
    e.preventDefault()
    const industry = industryCode.trim().toUpperCase()
    if (!visitorCode || !industry) return
    setBusy(true)
    setError(null)
    try {
      const result = await recordPassage(visitorCode, industry)
      storeCode(industry)
      setIndustryCode(industry)
      setDone({
        name: result.visitor.name,
        site: result.site.name,
        already: result.already,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="py-16 sm:py-24">
      <Seo
        title="Valider un passage"
        description="Validation du passage d'un visiteur de la Semaine de l'industrie."
        path={visitorCode ? `/passage/${visitorCode}` : '/passage'}
        noIndex
      />
      <div className={`${WRAP} max-w-lg`}>
        <SectionHeader
          level={1}
          eyebrow="Passage"
          title="Valider le passage"
          lead="L'industrie saisit son code de suivi, puis OK."
        />

        {done && (
          <div className="mt-10 border border-forest/15 bg-white px-5 py-6">
            <p className="text-[15px] font-semibold text-forest">
              {done.already ? 'Passage déjà enregistré' : 'Passage enregistré'}
            </p>
            <p className="mt-2 text-[15px] text-ink/70">
              {done.name} chez {done.site}.
            </p>
          </div>
        )}

        {!done && (
          <form onSubmit={(e) => void onConfirm(e)} className="mt-10 space-y-5">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-wide text-ink/45">Visiteur</p>
              <p className="mt-1 text-[18px] font-semibold text-forest">{visitorName}</p>
              <p className="mt-0.5 text-[14px] text-ink/55">{visitorCode}</p>
            </div>

            {error && <p role="alert" className="text-[15px] font-medium text-red-700">{error}</p>}

            <label className="block text-[14px] font-medium text-forest">
              Code de suivi industrie
              <input
                value={industryCode}
                onChange={(e) => setIndustryCode(e.target.value.toUpperCase())}
                className={`${field} mt-1`}
                placeholder="IN-2001"
                autoComplete="off"
                autoCapitalize="characters"
                required
              />
            </label>

            <Button type="submit" disabled={busy || !industryCode.trim() || !visitorCode}>
              {busy ? 'Validation…' : 'OK'}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
