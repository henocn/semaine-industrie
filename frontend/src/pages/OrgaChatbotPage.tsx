import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  getChatbotConversation,
  listChatbotConversations,
  type ChatbotConversation,
  type ChatbotMessage,
} from '../api/chatbot'
import { OrgaShell } from '../components/layout/OrgaShell'

const COLUMNS = 5

/* Date et heure courtes. */
function formatMoment(value: string) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

/* Affiche le texte en gras entre astérisques, comme WhatsApp. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*([^*\n]+)\*/).map((part, index) => (
        index % 2 ? <strong key={index}>{part}</strong> : <Fragment key={index}>{part}</Fragment>
      ))}
    </>
  )
}

/* Conversation d'un numéro, en lecture seule. */
function Thread({ phone }: { phone: string }) {
  const [messages, setMessages] = useState<ChatbotMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getChatbotConversation(phone)
      .then((rows) => {
        if (active) setMessages(rows)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Erreur')
      })
    return () => {
      active = false
    }
  }, [phone])

  if (error) return <p className="p-4 text-[14px] text-red-700">{error}</p>
  if (!messages) return <p className="p-4 text-[14px] text-ink/50">Chargement…</p>

  return (
    <ol
      ref={(element) => {
        if (element) element.scrollTop = element.scrollHeight
      }}
      className="flex max-h-[520px] flex-col gap-3 overflow-y-auto bg-forest/5 p-4"
    >
      {messages.map((message) => {
        const fromBot = message.direction === 'out'
        return (
          <li key={message.id} className={`max-w-[80%] ${fromBot ? 'self-end' : 'self-start'}`}>
            <p className={`whitespace-pre-wrap break-words border border-black px-3 py-2 text-[14px] text-ink ${fromBot ? 'bg-sage' : 'bg-white'}`}>
              <RichText text={message.body} />
            </p>
            <p className={`mt-1 text-[12px] text-ink/50 ${fromBot ? 'text-right' : ''}`}>
              {fromBot ? 'Bot' : 'Correspondant'} · {formatMoment(message.sent_at)}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

/* Conversations du bot WhatsApp : une ligne par numéro, lecture seule. */
export default function OrgaChatbotPage() {
  const [rows, setRows] = useState<ChatbotConversation[]>([])
  const [search, setSearch] = useState('')
  const [openPhone, setOpenPhone] = useState<string | null>(null)
  const [refreshes, setRefreshes] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /* Charge la liste des numéros. */
  async function load() {
    setBusy(true)
    try {
      setError(null)
      setRows(await listChatbotConversations())
      setRefreshes((count) => count + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => [row.phone, row.profile_name, row.last_body]
      .some((value) => value?.toLowerCase().includes(query)))
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
        placeholder="Rechercher un numéro, un nom ou un message"
        aria-label="Rechercher une conversation"
        className="mb-4 w-full max-w-md border border-black bg-white px-3 py-2 text-[14px] text-ink focus:outline-none"
      />

      <section className="orga-panel !p-0 overflow-x-auto">
        <div className="flex items-center justify-between border-b border-black px-4 py-3">
          <h2 className="text-[15px] font-semibold text-forest">
            {filtered.length} {filtered.length > 1 ? 'numéros' : 'numéro'}
          </h2>
          <p className="text-[12px] text-ink/45">Cliquez une ligne pour lire la conversation</p>
        </div>
        <table className="orga-table min-w-[800px]">
          <thead>
            <tr>
              <th className="w-44">Numéro</th>
              <th className="w-48">Nom WhatsApp</th>
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
            {filtered.map((row) => {
              const open = openPhone === row.phone
              return (
                <Fragment key={row.phone}>
                  <tr
                    className={`cursor-pointer ${open ? 'bg-forest/10' : ''}`}
                    aria-expanded={open}
                    onClick={() => setOpenPhone(open ? null : row.phone)}
                  >
                    <td className="whitespace-nowrap font-semibold text-forest">+{row.phone}</td>
                    <td>{row.profile_name || '—'}</td>
                    <td>{row.messages}</td>
                    <td className="max-w-0 truncate text-[13px] text-ink/70">
                      {row.last_direction === 'out' ? 'Bot : ' : ''}{row.last_body}
                    </td>
                    <td className="whitespace-nowrap text-[13px]">{formatMoment(row.last_at)}</td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={COLUMNS} className="!p-0">
                        <Thread key={`${row.phone}-${refreshes}`} phone={row.phone} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </section>
    </OrgaShell>
  )
}
