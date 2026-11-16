import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { OrgaShell } from '../components/layout/OrgaShell'
import { findByContact, listDeparturePoints, scanDeparture, scanPalais, type DeparturePoint } from '../api/scan'
import { readStore, writeStore } from '../lib/localStore'
import { PALAIS_DAYS } from '../data'

/* Réglages du scan, gardés sur l'appareil : le scanneur n'a pas à les refaire à chaque QR. */
type ScanSettings =
  | { mode: 'visite'; pointId: string; pointName: string }
  | { mode: 'palais'; day: number }

const STORE_KEY = 'si-scan-reglages'

/* Résultat affiché après un scan. */
type Outcome = { tone: 'ok' | 'already' | 'error'; title: string; detail?: string }

/* Détecteur QR natif du navigateur (Chrome, Edge, Android) ; absent sur iPhone et Firefox. */
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (options: { formats: string[] }) => Detector

function nativeDetector(): DetectorCtor | null {
  const ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
  return typeof ctor === 'function' ? ctor : null
}

/* Code lu dans un QR : lien /passage/CODE ou code seul. */
function codeFrom(raw: string) {
  const text = raw.trim()
  const fromLink = text.match(/\/passage\/([A-Za-z0-9-]+)/)
  return (fromLink ? fromLink[1] : text).toUpperCase()
}

/* Heure courte à Lomé. */
function hour(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lome' }).format(new Date(iso))
}

/* Jour du Palais d'aujourd'hui (16, 17 ou 18), sinon le premier. */
function defaultDay() {
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lome', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const today = iso.startsWith('2026-11-') ? Number(iso.slice(-2)) : null
  return PALAIS_DAYS.some((d) => d.n === today) ? (today as number) : PALAIS_DAYS[0].n
}

/* Libellé des réglages en cours. */
function settingsLabel(s: ScanSettings) {
  if (s.mode === 'visite') return `Visite · point de départ : ${s.pointName}`
  const day = PALAIS_DAYS.find((d) => d.n === s.day)
  return `Palais des Congrès · ${day ? `${day.label}, ${day.title.charAt(0).toLowerCase()}${day.title.slice(1)}` : `${s.day} novembre`}`
}

/* Formulaire des réglages : visite (point de départ) ou palais (jour). */
function SettingsForm({ initial, onSave }: { initial: ScanSettings | null; onSave: (s: ScanSettings) => void }) {
  const [mode, setMode] = useState<'visite' | 'palais'>(initial?.mode ?? 'visite')
  const [points, setPoints] = useState<DeparturePoint[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listDeparturePoints()
      .then(setPoints)
      .catch((err) => setError(err instanceof Error ? err.message : 'Points de départ indisponibles'))
  }, [])

  /* Enregistre les réglages choisis. */
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (mode === 'palais') {
      onSave({ mode: 'palais', day: Number(fd.get('day')) })
      return
    }
    const point = points?.find((p) => p.id === fd.get('point'))
    if (!point) {
      setError('Choisissez le point de départ')
      return
    }
    onSave({ mode: 'visite', pointId: point.id, pointName: point.name })
  }

  return (
    <form onSubmit={submit} className="orga-panel max-w-md space-y-5">
      <fieldset>
        <legend className="text-[14px] font-semibold text-forest">Que scannez-vous ?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(['visite', 'palais'] as const).map((m) => (
            <label
              key={m}
              className={`cursor-pointer border px-3 py-3 text-center text-[14px] font-semibold ${mode === m ? 'border-forest bg-forest text-white' : 'border-black bg-white text-forest'}`}
            >
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              {m === 'visite' ? 'Visite' : 'Palais'}
            </label>
          ))}
        </div>
      </fieldset>

      {mode === 'visite' ? (
        <label className="block text-[13px] font-medium text-forest">
          Point de départ
          <select
            name="point"
            required
            defaultValue={initial?.mode === 'visite' ? initial.pointId : ''}
            className="orga-input mt-1"
          >
            <option value="" disabled>
              {points === null ? 'Chargement…' : points.length ? 'Choisissez le point de départ' : 'Aucun point de départ dans les paramètres'}
            </option>
            {points?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label className="block text-[13px] font-medium text-forest">
          Journée
          <select name="day" defaultValue={initial?.mode === 'palais' ? initial.day : defaultDay()} className="orga-input mt-1">
            {PALAIS_DAYS.map((d) => (
              <option key={d.n} value={d.n}>
                {d.label} : {d.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <p className="text-[13px] text-red-700">{error}</p>}
      <button type="submit" className="orga-btn">
        Commencer à scanner
      </button>
    </form>
  )
}

/* Caméra + détection native ; s'arrête dès que le composant disparaît. */
function Camera({ onCode, paused }: { onCode: (raw: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const pausedRef = useRef(paused)
  const onCodeRef = useRef(onCode)

  useEffect(() => {
    pausedRef.current = paused
    onCodeRef.current = onCode
  }, [paused, onCode])

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer = 0
    let alive = true
    let reading = false

    /* Lecteur : détecteur natif (Chrome, Android), sinon jsQR (iPhone, Firefox). */
    async function makeReader(video: HTMLVideoElement): Promise<() => Promise<string | null>> {
      const Ctor = nativeDetector()
      if (Ctor) {
        const detector = new Ctor({ formats: ['qr_code'] })
        return async () => (await detector.detect(video))[0]?.rawValue || null
      }
      const { default: jsQR } = await import('jsqr')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      return async () => {
        if (!ctx || !video.videoWidth) return null
        /* Image réduite : plus rapide sur téléphone, assez nette pour un QR. */
        const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight))
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data || null
      }
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (media) => {
        if (!alive) {
          media.getTracks().forEach((t) => t.stop())
          return
        }
        stream = media
        const video = videoRef.current
        if (!video) return
        video.srcObject = media
        await video.play()
        const read = await makeReader(video)
        timer = window.setInterval(async () => {
          if (reading || pausedRef.current || video.readyState < 2) return
          reading = true
          try {
            const value = await read()
            if (value) onCodeRef.current(value)
          } catch {
            /* image illisible : on réessaie au tour suivant */
          } finally {
            reading = false
          }
        }, 250)
      })
      .catch(() => setError('Caméra indisponible : autorisez la caméra, ou saisissez le code ci-dessous.'))

    return () => {
      alive = false
      window.clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div>
      <video ref={videoRef} muted playsInline className="aspect-square w-full max-w-sm border border-black bg-black object-cover" />
      {error && <p className="mt-2 text-[13px] text-red-700">{error}</p>}
    </div>
  )
}

/* Page Scan : réglages (visite + point de départ, ou palais + jour), puis lecture des QR. */
export default function OrgaScanPage() {
  const [settings, setSettings] = useState<ScanSettings | null>(() => readStore<ScanSettings>(STORE_KEY))
  const [editing, setEditing] = useState(() => !readStore<ScanSettings>(STORE_KEY))
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [busy, setBusy] = useState(false)
  /* QR valide en attente du bouton « Entrer » : la caméra est masquée pendant ce temps. */
  const [candidate, setCandidate] = useState<{ code: string; name: string } | null>(null)
  const lastRef = useRef<{ code: string; at: number } | null>(null)

  /* Garde les réglages sur l'appareil et passe au scan. */
  function save(next: ScanSettings) {
    writeStore(STORE_KEY, next)
    setSettings(next)
    setEditing(false)
    setOutcome(null)
  }

  /* Vérifie un code lu (sans rien enregistrer) : valide, on affiche le nom et le bouton « Entrer ». */
  const submitCode = useCallback(
    async (raw: string) => {
      if (!settings || busy || candidate) return
      const code = codeFrom(raw)
      if (!code) return
      /* La caméra relit le même QR plusieurs fois : on ignore les répétitions rapprochées. */
      const last = lastRef.current
      if (last && last.code === code && Date.now() - last.at < 4000) return
      lastRef.current = { code, at: Date.now() }
      setBusy(true)
      setOutcome(null)
      try {
        if (settings.mode === 'visite') {
          const r = await scanDeparture(code, settings.pointId, true)
          if (r.already) {
            setOutcome({ tone: 'already', title: `${r.name} : départ déjà enregistré`, detail: `${r.point}, à ${hour(r.scanned_at)} · ${r.code}` })
          } else {
            setCandidate({ code, name: r.name })
          }
        } else {
          const r = await scanPalais(code, settings.day, true)
          const entry = r.already_at || r.days.find((d) => d.n === settings.day)?.checked_in_at
          if (r.already) {
            setOutcome({ tone: 'already', title: `${r.name} : entrée déjà enregistrée`, detail: `${entry ? `À ${hour(entry)} · ` : ''}${r.code}` })
          } else {
            setCandidate({ code, name: r.name })
          }
        }
      } catch (err) {
        setOutcome({ tone: 'error', title: err instanceof Error ? err.message : 'Scan impossible', detail: code })
      } finally {
        setBusy(false)
      }
    },
    [settings, busy, candidate],
  )

  /* Bouton « Entrer » : enregistre l'entrée (ou le départ), puis on revient au scan. */
  async function confirmEntry() {
    if (!settings || !candidate || busy) return
    setBusy(true)
    try {
      if (settings.mode === 'visite') {
        const r = await scanDeparture(candidate.code, settings.pointId)
        setOutcome({ tone: r.already ? 'already' : 'ok', title: `${r.name} : ${r.already ? 'départ déjà enregistré' : 'départ enregistré'}`, detail: r.code })
      } else {
        const r = await scanPalais(candidate.code, settings.day)
        setOutcome({ tone: r.already ? 'already' : 'ok', title: `${r.name} : ${r.already ? 'entrée déjà enregistrée' : 'entrée enregistrée'}`, detail: r.code })
      }
    } catch (err) {
      setOutcome({ tone: 'error', title: err instanceof Error ? err.message : 'Enregistrement impossible', detail: candidate.code })
    } finally {
      lastRef.current = { code: candidate.code, at: Date.now() }
      setCandidate(null)
      setBusy(false)
    }
  }

  /* Saisie manuelle du code. */
  function onManual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const input = e.currentTarget.elements.namedItem('code') as HTMLInputElement
    const value = input.value
    input.value = ''
    lastRef.current = null
    void submitCode(value)
  }

  /* Personne sans QR : numéro ou e-mail, puis même vérification et même bouton « Entrer » que pour un QR. */
  async function onContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!settings || busy || candidate) return
    const input = e.currentTarget.elements.namedItem('contact') as HTMLInputElement
    const value = input.value.trim()
    if (!value) return
    setBusy(true)
    setOutcome(null)
    let code: string | null = null
    try {
      code = (await findByContact(settings.mode, value)).code
      input.value = ''
    } catch (err) {
      setOutcome({ tone: 'error', title: err instanceof Error ? err.message : 'Recherche impossible', detail: value })
    } finally {
      setBusy(false)
    }
    if (code) {
      lastRef.current = null
      await submitCode(code)
    }
  }

  const toneClass = {
    ok: 'border-energy bg-energy/10 text-forest',
    already: 'border-sun bg-sun/15 text-ink',
    error: 'border-red-700 bg-red-50 text-red-800',
  }

  return (
    <OrgaShell title="Scan des QR">
      {editing || !settings ? (
        <SettingsForm initial={settings} onSave={save} />
      ) : (
        <div className="max-w-md space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border border-black bg-white px-4 py-3">
            <p className="text-[14px] font-semibold text-forest">{settingsLabel(settings)}</p>
            <button type="button" className="orga-btn-ghost px-3 py-1.5 text-[13px]" onClick={() => setEditing(true)}>
              Modifier
            </button>
          </div>

          {candidate ? (
            <div className="border border-black bg-white px-5 py-6 text-center">
              <p className="text-[22px] font-bold leading-tight text-forest">{candidate.name}</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmEntry()}
                className="mt-5 w-full bg-energy px-6 py-4 text-[18px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Enregistrement…' : 'Entrer'}
              </button>
            </div>
          ) : (
            <Camera onCode={(raw) => void submitCode(raw)} paused={busy} />
          )}

          {outcome && (
            <div role="status" className={`border-l-4 px-4 py-3 ${toneClass[outcome.tone]}`}>
              <p className="text-[15px] font-semibold">{outcome.title}</p>
              {outcome.detail && <p className="mt-0.5 text-[13px] opacity-80">{outcome.detail}</p>}
            </div>
          )}

          <form onSubmit={onManual} className="flex gap-2">
            <input
              name="code"
              placeholder={settings.mode === 'visite' ? 'Code PA-…' : 'Code JP-…'}
              autoComplete="off"
              autoCapitalize="characters"
              className="orga-input flex-1 uppercase"
            />
            <button type="submit" disabled={busy} className="orga-btn disabled:opacity-50">
              Valider
            </button>
          </form>

          <form onSubmit={(e) => void onContact(e)} className="flex gap-2">
            <input
              name="contact"
              placeholder="Numéro ou e-mail"
              autoComplete="off"
              inputMode="email"
              className="orga-input flex-1"
            />
            <button type="submit" disabled={busy} className="orga-btn disabled:opacity-50">
              Chercher
            </button>
          </form>
        </div>
      )}
    </OrgaShell>
  )
}
