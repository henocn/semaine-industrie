import { useState, type FormEvent } from 'react'
import { verifyTrackingCode, type TrackingResources } from '../api/labels'

type Props = {
  open: boolean
  onClose: () => void
}

/* Modal : vérifie le code de suivi puis propose les PDF. */
export function ResourcesModal({ open, onClose }: Props) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TrackingResources | null>(null)

  if (!open) return null

  /* Réinitialise et ferme. */
  function close() {
    setCode('')
    setError(null)
    setData(null)
    onClose()
  }

  /* Vérifie le code auprès de l'API. */
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await verifyTrackingCode(code)
      setData(res)
    } catch (err) {
      setData(null)
      setError(err instanceof Error ? err.message : 'Code invalide')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md border border-black bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sun">
              Ressources
            </p>
            <h2 className="display mt-2 text-2xl text-forest">Téléchargements</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="grid h-9 w-9 place-items-center border border-black text-forest"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {!data ? (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <p className="text-[14px] text-ink/65">
              Entrez votre code de suivi reçu à l&apos;acceptation du label pour télécharger
              votre document et le programme.
            </p>
            <label className="block text-[14px] font-medium text-forest">
              Code de suivi
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="IN-K7P4"
                className="mt-1 w-full border border-black px-3 py-2.5 font-mono text-[15px] tracking-wide focus:outline-none"
                autoComplete="off"
              />
            </label>
            {error && <p className="text-[13px] text-flag">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-forest px-4 py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Vérification…' : 'Vérifier le code'}
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-[14px] text-ink/70">
              Bienvenue, <span className="font-semibold text-forest">{data.organization_name}</span>.
            </p>
            <a
              href={data.label_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between border border-black px-4 py-3 text-[14px] font-semibold text-forest hover:bg-sage"
            >
              <span>Télécharger le label (PDF)</span>
              <span aria-hidden>↓</span>
            </a>
            <a
              href={data.programme_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between border border-black px-4 py-3 text-[14px] font-semibold text-forest hover:bg-sage"
            >
              <span>Télécharger le programme (PDF)</span>
              <span aria-hidden>↓</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setData(null)
                setCode('')
              }}
              className="text-[13px] text-ink/50 underline underline-offset-2"
            >
              Utiliser un autre code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
