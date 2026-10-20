import { useEffect, useMemo, useState } from 'react'
import { listQrBatch, type QrBatchItem } from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Nettoie un libellé pour un nom de fichier. */
function safeFilePart(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80) || 'institution'
}

/* Télécharge un QR (data URL) au nom institution + code de suivi. */
function downloadQr(item: QrBatchItem) {
  const name = safeFilePart(item.name)
  const code = safeFilePart(item.label_code || 'sans-code')
  const filename = `${name}-${code}.png`
  const link = document.createElement('a')
  link.href = item.qr_data_url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

/* Écran orga : QR codes des labels validés. */
export default function OrgaQrPage() {
  const [items, setItems] = useState<QrBatchItem[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    /* Charge le lot de QR. */
    async function load() {
      try {
        const data = await listQrBatch()
        setItems(data.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    }
    void load()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) =>
      [item.name, item.label_code, item.city, item.region]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [items, query])

  return (
    <OrgaShell
      title="QR code"
      searchPlaceholder="Filtrer un label…"
      onSearch={setQuery}
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <section className="orga-panel sm:p-6">
        <div className="mb-5">
          <h2 className="text-[15px] font-semibold text-forest">Labels validés</h2>
          <p className="mt-1 text-[13px] text-ink/45">
            {filtered.length} QR · téléchargement au nom de l&apos;institution + code de suivi
          </p>
        </div>

        {filtered.length === 0 && !error && (
          <p className="py-10 text-[14px] text-ink/40">Aucun label validé pour l&apos;instant.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="border border-black bg-white p-5">
              <img
                src={item.qr_data_url}
                alt={`QR ${item.name}`}
                className="mx-auto h-36 w-36 border border-black bg-white p-2"
              />
              <p className="mt-4 text-center text-[15px] font-semibold text-forest">{item.name}</p>
              <p className="mt-1 text-center text-[12px] text-ink/50">
                {item.label_code || 'Sans code'}
                {item.city ? ` · ${item.city}` : ''}
              </p>
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="orga-btn px-4 py-2 text-[13px]"
                  onClick={() => downloadQr(item)}
                  disabled={!item.qr_data_url}
                >
                  Télécharger
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </OrgaShell>
  )
}
