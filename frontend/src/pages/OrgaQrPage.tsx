import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../api/auth'
import { listQrBatch, type QrBatchItem } from '../api/labels'
import { OrgaNav } from '../components/layout/OrgaNav'
import { WRAP } from '../components/layout/Mark'

/* Écran orga : QR en lot pour impression des labels. */
export default function OrgaQrPage() {
  const navigate = useNavigate()
  const user = getStoredUser()
  const [items, setItems] = useState<QrBatchItem[]>([])
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

  return (
    <>
      <OrgaNav email={user?.email} />
      <main className="py-12 sm:py-16">
        <div className={WRAP}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
            <div>
              <h1 className="display text-4xl">QR des labels</h1>
              <p className="mt-3 max-w-xl text-ink/65">
                Un QR par structure validée, prêt pour l’impression des autocollants. Utilisez Imprimer pour le lot.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="bg-forest px-6 py-3 text-[15px] font-semibold text-white hover:bg-ink"
            >
              Imprimer le lot
            </button>
          </div>

          {error && <p className="mt-6 text-red-700 print:hidden">{error}</p>}
          {items.length === 0 && !error && (
            <p className="mt-10 text-ink/55">Aucun label validé pour l’instant.</p>
          )}

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
            {items.map((item) => (
              <article key={item.id} className="break-inside-avoid border border-forest/15 p-5">
                <img src={item.qr_data_url} alt={`QR ${item.name}`} className="mx-auto h-40 w-40" />
                <p className="mt-4 text-center text-lg font-semibold text-forest">{item.name}</p>
                <p className="mt-1 text-center text-[15px] text-ink/55">
                  {item.label_code}
                  {item.city ? ` · ${item.city}` : ''}
                </p>
                <p className="mt-2 break-all text-center text-xs text-ink/40">{item.fiche_url}</p>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
