import { useEffect, useState, type FormEvent } from 'react'
import {
  deleteResource,
  listResources,
  uploadResource,
  type GlobalResource,
} from '../api/resources'
import { OrgaShell } from '../components/layout/OrgaShell'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Backoffice : fichiers partagés envoyés sur WhatsApp via Ressources. */
export default function OrgaResourcesPage() {
  const [items, setItems] = useState<GlobalResource[]>([])
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /* Charge la liste. */
  async function load() {
    try {
      setError(null)
      setItems(await listResources())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  /* Ajoute un fichier. */
  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    setBusy(true)
    setError(null)
    try {
      await uploadResource(file, title.trim())
      setTitle('')
      setFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <OrgaShell title="Ressources">
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="orga-panel mb-6">
        <h2 className="text-[15px] font-semibold text-forest">Ajouter un document</h2>
        <p className="mt-1 text-[13px] text-ink/50">
          Ces fichiers sont envoyés sur WhatsApp depuis l&apos;option Ressources.
        </p>
        <form onSubmit={onAdd} className="mt-4 space-y-3">
          <label className="block text-[13px] font-medium text-forest">
            Titre
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={field} maxLength={200} />
          </label>
          <label className="block text-[13px] font-medium text-forest">
            Fichier
            <input
              type="file"
              className={field}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button type="submit" disabled={busy || !file || !title.trim()} className="orga-btn disabled:opacity-50">
            Ajouter
          </button>
        </form>
      </section>

      <section className="orga-panel">
        <h2 className="text-[15px] font-semibold text-forest">Documents</h2>
        <ul className="mt-4 space-y-2">
          {items.length === 0 && <li className="text-[13px] text-ink/40">Aucun document pour l&apos;instant.</li>}
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border border-black bg-white px-3 py-3">
              <p className="text-[14px] font-medium text-forest">{item.title}</p>
              <div className="flex flex-wrap gap-2">
                <a href={item.file_url} target="_blank" rel="noreferrer" className="orga-btn-ghost px-3 py-1.5 text-[12px]">
                  Ouvrir
                </a>
                <button
                  type="button"
                  className="orga-btn-ghost px-3 py-1.5 text-[12px] text-red-700"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm('Supprimer ce document ?')) return
                    setBusy(true)
                    try {
                      await deleteResource(item.id)
                      await load()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Suppression impossible')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </OrgaShell>
  )
}
