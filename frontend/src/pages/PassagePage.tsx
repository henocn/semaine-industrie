import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPassport, recordPassage, type Passport } from '../api/passports'
import { checkinPalais, getMediaPass, getPalaisPass, type MediaPass, type PalaisPass } from '../api/participations'
import { peekOrgaUser } from '../api/auth'
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

/* Page ouverte par le QR : accueil du Palais pour un code JP-, sinon l'industrie confirme le passage. */
export default function PassagePage() {
  const { code = '' } = useParams()
  const visitorCode = code.trim().toUpperCase()
  if (visitorCode.startsWith('JP-')) return <PalaisPassage code={visitorCode} />
  if (visitorCode.startsWith('MD-')) return <MediaPassage code={visitorCode} />
  return <IndustryPassage visitorCode={visitorCode} />
}

/* Passage chez une industrie : elle saisit son code de suivi. */
function IndustryPassage({ visitorCode }: { visitorCode: string }) {
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
              <p className="text-[18px] font-semibold text-forest">{visitorName}</p>
              <p className="mt-0.5 text-[14px] text-ink/55">{visitorCode}</p>
            </div>

            {error && <p role="alert" className="text-[15px] font-medium text-red-700">{error}</p>}

            <label className="block text-[14px] font-medium text-forest">
              Code de suivi industrie
              <input
                value={industryCode}
                onChange={(e) => setIndustryCode(e.target.value.toUpperCase())}
                className={`${field} mt-1`}
                placeholder="IN-K7P4"
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

/* Heure d'entrée à Lomé (ex. 08:42). */
function entryTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lome' })
}

/* Verdict affiché en grand à l'accueil : couleur et texte. */
function palaisVerdict(pass: PalaisPass) {
  if (pass.status !== 'approved') return { tone: 'text-red-700', text: 'Inscription pas encore validée' }
  if (pass.today === null) return { tone: 'text-ink/70', text: 'Aucune journée du Palais aujourd’hui' }
  if (!pass.expected_today) return { tone: 'text-red-700', text: 'Pas inscrit pour aujourd’hui' }
  if (pass.checked_in_today) return { tone: 'text-forest', text: 'Attendu aujourd’hui · entrée déjà enregistrée' }
  return { tone: 'text-forest', text: 'Attendu aujourd’hui' }
}

/* Accueil du Palais : la personne, ses journées, et l'entrée du jour pour l'équipe connectée. */
function PalaisPassage({ code }: { code: string }) {
  const [pass, setPass] = useState<PalaisPass | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  /* Page non pré-rendue (adresse dynamique) : la session locale se lit dès le premier rendu. */
  const [staff] = useState(() => typeof window !== 'undefined' && Boolean(peekOrgaUser()))

  useEffect(() => {
    getPalaisPass(code)
      .then(setPass)
      .catch((err) => setError(err instanceof Error ? err.message : 'QR introuvable'))
  }, [code])

  /* Enregistre l'entrée du jour. */
  async function onCheckin() {
    setBusy(true)
    setError(null)
    try {
      const updated = await checkinPalais(code)
      setPass(updated)
      setNotice(updated.already ? 'Entrée déjà enregistrée aujourd’hui.' : 'Entrée enregistrée.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  const verdict = pass ? palaisVerdict(pass) : null
  const canCheckin = Boolean(pass && staff && pass.status === 'approved' && pass.expected_today && !pass.checked_in_today)

  return (
    <main className="py-16 sm:py-24">
      <Seo
        title="Accueil au Palais"
        description="Contrôle d'une inscription aux rendez-vous au Palais des Congrès."
        path={`/passage/${code}`}
        noIndex
      />
      <div className={`${WRAP} max-w-lg`}>
        <SectionHeader level={1} title="Accueil au Palais des Congrès" />

        {error && <p role="alert" className="mt-8 text-[15px] font-medium text-red-700">{error}</p>}

        {pass && verdict && (
          <div className="mt-8 space-y-6">
            <div>
              <p className="text-[18px] font-semibold text-forest">{pass.name}</p>
              <p className="mt-0.5 font-mono text-[14px] text-ink/55">{pass.code}</p>
              <p className={`mt-4 text-[20px] font-semibold ${verdict.tone}`}>{verdict.text}</p>
            </div>

            <ul className="divide-y divide-forest/10 border-y border-forest/10">
              {pass.days.map((day) => (
                <li
                  key={day.n}
                  className={`flex items-start justify-between gap-4 py-3 ${day.n === pass.today ? 'font-semibold' : ''}`}
                >
                  <span className={day.registered ? 'text-forest' : 'text-ink/40'}>
                    {day.label}
                    <span className="block text-[13px] font-normal">{day.title} · {day.place}</span>
                  </span>
                  <span className={`shrink-0 text-right text-[14px] ${day.registered ? 'text-forest' : 'text-ink/40'}`}>
                    {day.registered ? 'Inscrit' : 'Non inscrit'}
                    {day.checked_in_at && (
                      <span className="block text-[13px] font-normal">Entrée à {entryTime(day.checked_in_at)}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            {notice && <p className="text-[15px] font-semibold text-forest">{notice}</p>}

            {canCheckin && (
              <Button type="button" disabled={busy} onClick={() => void onCheckin()}>
                {busy ? 'Enregistrement…' : 'Enregistrer l’entrée'}
              </Button>
            )}

            {!staff && (
              <p className="text-[14px] text-ink/60">
                Équipe d’accueil :{' '}
                <Link
                  to={`/login?retour=${encodeURIComponent(`/passage/${pass.code}`)}`}
                  className="font-semibold text-forest underline underline-offset-4"
                >
                  connectez-vous
                </Link>{' '}
                pour enregistrer les entrées.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

/* Verdict d'une accréditation média au contrôle. */
function mediaVerdict(pass: MediaPass) {
  if (pass.status === 'approved') return { tone: 'text-forest', text: 'Accréditation valide' }
  if (pass.status === 'rejected') return { tone: 'text-red-700', text: 'Accréditation refusée' }
  return { tone: 'text-red-700', text: 'Accréditation pas encore validée' }
}

/* Contrôle d'une accréditation média : la personne, son média, son profil et la validité. */
function MediaPassage({ code }: { code: string }) {
  const [pass, setPass] = useState<MediaPass | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMediaPass(code)
      .then(setPass)
      .catch((err) => setError(err instanceof Error ? err.message : 'QR introuvable'))
  }, [code])

  const verdict = pass ? mediaVerdict(pass) : null

  return (
    <main className="py-16 sm:py-24">
      <Seo
        title="Accréditation médias"
        description="Contrôle d'une accréditation média de la Semaine de l'industrie."
        path={`/passage/${code}`}
        noIndex
      />
      <div className={`${WRAP} max-w-lg`}>
        <SectionHeader level={1} title="Accréditation médias" />

        {error && <p role="alert" className="mt-8 text-[15px] font-medium text-red-700">{error}</p>}

        {pass && verdict && (
          <div className="mt-8 space-y-5">
            <div>
              <p className="text-[18px] font-semibold text-forest">{pass.name}</p>
              <p className="mt-0.5 font-mono text-[14px] text-ink/55">{pass.code}</p>
              <p className={`mt-4 text-[20px] font-semibold ${verdict.tone}`}>{verdict.text}</p>
            </div>
            <dl className="divide-y divide-forest/10 border-y border-forest/10 text-[15px]">
              {pass.outlet && (
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-ink/60">Média</dt>
                  <dd className="text-right font-semibold text-forest">{pass.outlet}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-ink/60">Profil</dt>
                <dd className="text-right text-forest">{pass.profile}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-ink/60">Validité</dt>
                <dd className="text-right text-forest">{pass.validity}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </main>
  )
}
