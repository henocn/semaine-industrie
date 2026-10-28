import { useEffect, useState, type FormEvent } from 'react'
import { listResources, type GlobalResource } from '../api/resources'
import { verifyTrackingCode, type TrackingResources } from '../api/labels'
import { Seo } from '../components/Seo'
import { publicSeo } from '../lib/seo'
import { WRAP } from '../components/layout/Mark'
import { SectionHeader } from '../components/ui/SectionHeader'

/* Fichiers propres à la structure : kit du label, sinon le PDF du label seul. */
function ownFiles(data: TrackingResources) {
  if (data.kit_files?.length) return data.kit_files.map((f) => ({ key: f.id, name: f.name, url: f.url }))
  return data.label_pdf_url ? [{ key: 'label', name: 'Label (PDF)', url: data.label_pdf_url }] : []
}

/* Page publique : ressources de la semaine, puis ressources personnelles par code de suivi. */
export default function ResourcesPage() {
  const [docs, setDocs] = useState<GlobalResource[]>([])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mine, setMine] = useState<TrackingResources | null>(null)

  useEffect(() => {
    listResources().then(setDocs).catch(() => setDocs([]))
  }, [])

  /* Vérifie le code de suivi et affiche les ressources de la structure. */
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      setMine(await verifyTrackingCode(code))
    } catch (err) {
      setMine(null)
      setError(err instanceof Error ? err.message : 'Code invalide')
    } finally {
      setBusy(false)
    }
  }

  const files = mine ? ownFiles(mine) : []

  return (
    <main className={`${WRAP} pb-20 pt-16 sm:pt-24`}>
      <Seo {...publicSeo('/ressources')} />
      <div className="animate-rise max-w-3xl">
        <SectionHeader
          level={1}
          title="Ressources de la semaine"
          lead="Les documents de la semaine sont ouverts à tous. Avec votre code de suivi, retrouvez aussi vos propres ressources."
        />

        {docs.length > 0 ? (
          <ul className="mt-8 divide-y divide-forest/10 border border-forest/15 bg-white">
            {docs.map((doc) => (
              <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="font-semibold text-forest">{doc.title}</p>
                  {doc.is_primary && <p className="mt-1 text-[13px] text-ink/50">Programme de la semaine</p>}
                </div>
                <a className="ui-btn-outline" href={doc.file_url} target="_blank" rel="noreferrer">
                  Télécharger
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-[15px] text-ink/60">Aucun document pour le moment.</p>
        )}

        <section className="mt-12 border-t border-forest/15 pt-10" aria-labelledby="mes-ressources">
          <h2 id="mes-ressources" className="text-xl font-semibold text-forest">
            Mes ressources
          </h2>
          <p className="mt-2 text-[15px] text-ink/70">
            Entrez le code de suivi reçu à l&apos;acceptation de votre label.
          </p>

          <form onSubmit={onSubmit} className="mt-5 flex flex-wrap items-end gap-3">
            <label className="min-w-[14rem] flex-1 text-[14px] font-medium text-forest">
              Code de suivi
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="IN-K7P4"
                autoComplete="off"
                className="mt-1 w-full border border-forest/40 bg-white px-3 py-2.5 font-mono text-[15px] tracking-wide focus:border-forest focus:outline-none"
              />
            </label>
            <button type="submit" disabled={busy} className="ui-btn-primary disabled:opacity-50">
              {busy ? 'Vérification…' : 'Mes ressources'}
            </button>
          </form>
          {error && (
            <p role="alert" className="mt-3 text-[14px] font-medium text-flag">
              {error}
            </p>
          )}

          {mine && (
            <div className="mt-6">
              <p className="text-[15px] text-ink/75">
                Ressources de <span className="font-semibold text-forest">{mine.organization_name}</span>
              </p>
              {files.length > 0 ? (
                <ul className="mt-3 divide-y divide-forest/10 border border-forest/15 bg-white">
                  {files.map((f) => (
                    <li key={f.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                      <p className="font-semibold text-forest">{f.name}</p>
                      <a className="ui-btn-outline" href={f.url} target="_blank" rel="noopener noreferrer">
                        Télécharger
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[14px] text-ink/60">Aucun document n&apos;est encore disponible pour votre structure.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
