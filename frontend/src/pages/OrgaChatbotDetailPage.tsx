import { Fragment, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getChatbotConversation, type ChatbotMessage } from '../api/chatbot'
import { OrgaShell } from '../components/layout/OrgaShell'

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

/* Conversation complète d'un contact, en lecture seule ; s'ouvre sur les derniers messages. */
export default function OrgaChatbotDetailPage() {
  const { phone = '' } = useParams()
  const [result, setResult] = useState<{ phone: string; messages?: ChatbotMessage[]; error?: string } | null>(null)

  useEffect(() => {
    let active = true
    getChatbotConversation(phone)
      .then((messages) => {
        if (active) setResult({ phone, messages })
      })
      .catch((err) => {
        if (active) setResult({ phone, error: err instanceof Error ? err.message : 'Erreur' })
      })
    return () => {
      active = false
    }
  }, [phone])

  const current = result?.phone === phone ? result : null
  const messages = current?.messages

  return (
    <OrgaShell
      title={`+${phone}`}
      actions={
        <Link to="/orga/chatbot" className="orga-btn-ghost px-3 py-2 text-[13px]">
          Tous les contacts
        </Link>
      }
    >
      {current?.error && <p className="text-[14px] text-red-700">{current.error}</p>}
      {!current && <p className="text-[14px] text-ink/50">Chargement…</p>}
      {messages?.length === 0 && <p className="text-[14px] text-ink/50">Aucun message pour ce contact.</p>}

      {messages && messages.length > 0 && (
        <section className="orga-panel !p-0">
          <h2 className="border-b border-black px-4 py-3 text-[15px] font-semibold text-forest">
            {messages.length} {messages.length > 1 ? 'messages' : 'message'}
          </h2>
          <ol className="flex flex-col gap-3 bg-forest/5 p-4">
            {messages.map((message) => {
              const fromBot = message.direction === 'out'
              return (
                <li key={message.id} className={`max-w-[80%] ${fromBot ? 'self-end' : 'self-start'}`}>
                  <p className={`whitespace-pre-wrap break-words border border-black px-3 py-2 text-[14px] text-ink ${fromBot ? 'bg-sage' : 'bg-white'}`}>
                    <RichText text={message.body} />
                  </p>
                  <p className={`mt-1 text-[12px] text-ink/50 ${fromBot ? 'text-right' : ''}`}>
                    {fromBot ? 'Bot' : 'Contact'} · {new Date(message.sent_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </li>
              )
            })}
          </ol>
          <div
            ref={(element) => {
              element?.scrollIntoView({ block: 'end' })
            }}
          />
        </section>
      )}
    </OrgaShell>
  )
}
