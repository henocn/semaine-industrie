import { useEffect, useState, type FormEvent } from 'react'
import {
  deleteEntryResource,
  listEntryResources,
  uploadEntryResource,
  type EntryResource,
  type EntryResourceKind,
} from '../api/resources'

const field =
  'mt-1 w-full border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none'

/* Joint des fichiers titrés à une fiche acceptée. */
export function EntryResourcesPanel({
  kind,
  entryId,
}: {
  kind: EntryResourceKind
  entryId: string
}) {
  const [items, setItems] = useState<EntryResource[]>([])
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /* Charge les fichiers de la fiche. */
  async function load() {
    try {
      setError(null)
      setItems(await listEntryResources(kind, entryId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, entryId])

  /* Ajoute un fichier avec son titre. */
  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!file || !title.trim()) return
    setBusy(true)
    setError(null)
    try {
      await uploadEntryResource(kind, entryId, file, title.trim())
      setTitle('')
      setFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  /* Retire un fichier de la fiche. */
  async function onDelete(id: string) {
    if (!window.confirm('Retirer ce fichier de la fiche ?')) return
    setBusy(true)
    setError(null)
    try {
      await deleteEntryResource(id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 border-t border-black pt-4">
      <h3 className="text-[14px] font-semibold text-forest">Ressources</h3>
      <p className="mt-1 text-[13px] text-ink/50">
        Fichiers envoyés sur WhatsApp via « Mes ressources ».
      </p>
      {error && <p className="mt-2 text-[13px] text-red-700">{error}</p>}

      <form onSubmit={(e) => void onAdd(e)} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="text-[13px] font-medium text-forest">
          Titre
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
            maxLength={200}
          />
        </label>
        <label className="text-[13px] font-medium text-forest">
          Fichier
          <input
            type="file"
            className={field}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy || !file || !title.trim()}
            className="orga-btn disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
      </form>

      <ul className="mt-3 space-y-2">
        {items.length === 0 && (
          <li className="text-[13px] text-ink/40">Aucun fichier pour l&apos;instant.</li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-3 border border-black bg-white px-3 py-2.5"
          >
            <p className="min-w-0 flex-1 truncate text-[14px] font-medium text-forest">{item.title}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={item.file_url}
                target="_blank"
                rel="noreferrer"
                className="orga-btn-ghost px-3 py-1.5 text-[12px]"
              >
                Ouvrir
              </a>
              <button
                type="button"
                className="orga-btn-ghost px-3 py-1.5 text-[12px] text-red-700"
                disabled={busy}
                onClick={() => void onDelete(item.id)}
              >
                Retirer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
