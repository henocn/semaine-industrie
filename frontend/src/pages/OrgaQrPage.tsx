import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { listQrBatch, type QrBatchItem } from '../api/labels'
import { OrgaShell } from '../components/layout/OrgaShell'

/* Écran orga : QR en lot — shell backoffice. */
export default function OrgaQrPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [items, setItems] = useState<QrBatchItem[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.role !== 'orga') {
      navigate('/login')
      return
    }
    /* Charge le lot de QR. */
    async function load() {
      try {
        const data = await listQrBatch()
        setItems(data.items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur')
      }
    }
    load()
  }, [navigate, user])

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
      title="QR / impression"
      searchPlaceholder="Filtrer un label…"
      onSearch={setQuery}
      actions={
        <button
          type="button"
          onClick={() => window.print()}
          className="orga-btn print:hidden"
        >
          Imprimer +
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700 print:hidden">{error}</p>}

      <section className="orga-panel print:shadow-none sm:p-6">
        <div className="mb-5 flex items-end justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-[15px] font-semibold text-forest">Lot prêt à imprimer</h2>
            <p className="mt-1 text-[13px] text-ink/45">{filtered.length} QR généré{filtered.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        {filtered.length === 0 && !error && (
          <p className="py-10 text-[14px] text-ink/40">Aucun label validé pour l’instant.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
          {filtered.map((item) => (
            <article key={item.id} className="break-inside-avoid border border-black bg-white p-5 print:border print:border-black/10 print:bg-white">
              <img src={item.qr_data_url} alt={`QR ${item.name}`} className="mx-auto h-36 w-36 border border-black bg-white p-2" />
              <p className="mt-4 text-center text-[15px] font-semibold text-forest">{item.name}</p>
              <p className="mt-1 text-center text-[12px] text-ink/50">
                {item.label_code}
                {item.city ? ` · ${item.city}` : ''}
              </p>
              <p className="mt-2 break-all text-center text-[10px] text-ink/35">{item.fiche_url}</p>
            </article>
          ))}
        </div>
      </section>
    </OrgaShell>
  )
}
