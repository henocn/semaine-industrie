import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listChatbotConversations, type ChatbotConversation } from '../api/chatbot'
import { OrgaShell } from '../components/layout/OrgaShell'
import { useOrgaRealtime } from '../lib/useOrgaRealtime'

const COLUMNS = 4

/* Conversations du bot WhatsApp : une ligne par contact, le clic ouvre la conversation. */
export default function OrgaChatbotPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ChatbotConversation[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const lastRequest = useRef(0)

  /* Charge la liste des contacts ; seule la réponse la plus récente compte. */
  async function load() {
    lastRequest.current += 1
    const request = lastRequest.current
    setBusy(true)
    try {
      setError(null)
      const list = await listChatbotConversations()
      if (request === lastRequest.current) setRows(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useOrgaRealtime(['whatsapp:message'], () => load())

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => row.phone.includes(query) || row.last_body.toLowerCase().includes(query))
  }, [rows, search])

  return (
    <OrgaShell
      title="Chatbot"
      actions={
        <button
          type="button"
          className="orga-btn-ghost px-3 py-2 text-[13px]"
          disabled={busy}
          onClick={() => void load()}
        >
          Actualiser
        </button>
      }
    >
      {error && <p className="mb-4 text-[14px] text-red-700">{error}</p>}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher un contact ou un message"
        aria-label="Rechercher une conversation"
        className="mb-4 w-full max-w-md border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none"
      />

      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} {filtered.length > 1 ? 'contacts' : 'contact'}
          </h2>
          <p className="text-[12px] text-ink/45">Cliquez une ligne pour lire la conversation</p>
        </div>
        <table className="orga-table min-w-[720px]">
          <thead>
            <tr>
              <th className="w-44">Contact</th>
              <th className="w-24">Messages</th>
              <th>Dernier message</th>
              <th className="w-36">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS} className="py-10 text-ink/40">
                  Aucune conversation
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr
                key={row.phone}
                className="cursor-pointer"
                onClick={() => navigate(`/orga/chatbot/${row.phone}`)}
              >
                <td className="whitespace-nowrap font-semibold text-forest">
                  <Link to={`/orga/chatbot/${row.phone}`} onClick={(e) => e.stopPropagation()}>
                    +{row.phone}
                  </Link>
                </td>
                <td>{row.messages}</td>
                <td className="max-w-0 truncate text-[13px] text-ink/70">
                  {row.last_direction === 'out' ? 'Bot : ' : ''}{row.last_body}
                </td>
                <td className="whitespace-nowrap text-[13px]">
                  {new Date(row.last_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}
