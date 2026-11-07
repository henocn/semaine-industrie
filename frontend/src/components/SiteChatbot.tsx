import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, X } from 'lucide-react'
import { askChatbot } from '../api/chatbot-public'

type Message = { id: string; role: 'user' | 'bot'; text: string; failed?: boolean }

const VISITOR_KEY = 'si_chat_visitor'
const SESSION_KEY = 'si_chat_session'
const FALLBACK = 'Le service est momentanément indisponible. Vous pouvez écrire à infos@semaineindustrie.tg.'
const SITE_LINK = /^https?:\/\/(?:www\.)?semaineindustrie\.tg(\/[^\s]*)?$/i
const INLINE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]*\w)/g

/* Identifiant anonyme du navigateur, exigé par Dify pour retrouver une conversation. */
function visitorId() {
  try {
    const known = localStorage.getItem(VISITOR_KEY)
    if (known) return known
    const created = crypto.randomUUID()
    localStorage.setItem(VISITOR_KEY, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

/* Relit la conversation en cours de l'onglet. */
function readSession(): { messages: Message[]; conversationId: string | null } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as { messages?: Message[]; conversationId?: string } | null
    return { messages: saved?.messages || [], conversationId: saved?.conversationId || null }
  } catch {
    return { messages: [], conversationId: null }
  }
}

/* Lien d'une réponse : navigation interne pour le site, nouvel onglet ailleurs. */
function AnswerLink({ href, children }: { href: string; children: ReactNode }) {
  const className = 'font-semibold text-forest underline underline-offset-2'
  const site = href.match(SITE_LINK)
  if (site) return <Link to={site[1] || '/'} className={className}>{children}</Link>
  return <a href={href} target={href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer" className={className}>{children}</a>
}

/* Gras, liens et adresses e-mail d'une ligne, sans jamais interpréter de HTML. */
function InlineText({ text }: { text: string }) {
  return (
    <>
      {text.split(INLINE).map((part, index) => {
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>
        if (part.startsWith('**')) return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>
        const named = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
        if (named) return /^(https?:|mailto:)/.test(named[2]) ? <AnswerLink key={index} href={named[2]}>{named[1]}</AnswerLink> : <Fragment key={index}>{named[1]}</Fragment>
        if (part.includes('@') && !part.startsWith('http')) return <AnswerLink key={index} href={`mailto:${part}`}>{part}</AnswerLink>
        const url = part.replace(/[.,;:!?]+$/, '')
        return <Fragment key={index}><AnswerLink href={url}>{url.replace(/^https?:\/\/(www\.)?/, '')}</AnswerLink>{part.slice(url.length)}</Fragment>
      })}
    </>
  )
}

/* Réponse en paragraphes et listes simples. */
function Answer({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let items: string[] = []
  const flush = () => {
    if (!items.length) return
    blocks.push(
      <ul key={blocks.length} className="list-disc space-y-1 pl-5">
        {items.map((item, index) => <li key={index}><InlineText text={item} /></li>)}
      </ul>,
    )
    items = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const bullet = line.match(/^[-*•]\s+(.*)/)
    if (bullet) {
      items.push(bullet[1])
      continue
    }
    flush()
    if (line) blocks.push(<p key={blocks.length}><InlineText text={line.replace(/^#+\s*/, '')} /></p>)
  }
  flush()
  return <div className="space-y-2">{blocks}</div>
}

/* Chat du site : l'interface est celle du site, le serveur relaie les questions à l'assistant. */
export function SiteChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => readSession().messages)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const conversation = useRef<string | null>(readSession().conversationId)
  const request = useRef<AbortController | null>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ messages, conversationId: conversation.current }))
    } catch {
      /* La conversation reste simplement en mémoire. */
    }
    list.current?.scrollTo({ top: list.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    if (open) field.current?.focus()
  }, [open])

  useEffect(() => () => request.current?.abort(), [])

  /* Ferme le chat et rend la main au bouton d'ouverture. */
  function close() {
    setOpen(false)
    requestAnimationFrame(() => launcher.current?.focus())
  }

  /* Pose une question et affiche la réponse au fil de l'eau. */
  async function ask(raw: string) {
    const query = raw.trim()
    if (!query || busy) return
    const botId = crypto.randomUUID()
    const write = (update: (message: Message) => Message) => {
      setMessages((current) => current.map((message) => (message.id === botId ? update(message) : message)))
    }
    setInput('')
    setBusy(true)
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: query }, { id: botId, role: 'bot', text: '' }])
    const controller = new AbortController()
    request.current = controller
    try {
      await askChatbot({ query, visitor_id: visitorId(), conversation_id: conversation.current }, (event) => {
        if (event.type === 'delta') {
          if (event.conversation_id) conversation.current = event.conversation_id
          write((message) => ({ ...message, text: message.text + event.text }))
        } else if (event.type === 'replace') {
          write((message) => ({ ...message, text: event.text }))
        } else if (event.type === 'reset') {
          conversation.current = null
        } else if (event.type === 'end') {
          if (event.conversation_id) conversation.current = event.conversation_id
        } else {
          write((message) => ({ ...message, text: FALLBACK, failed: true }))
        }
      }, controller.signal)
      write((message) => (message.text ? message : { ...message, text: FALLBACK, failed: true }))
    } catch (err) {
      if (!controller.signal.aborted) {
        const text = err instanceof Error && err.message !== 'Réponse indisponible' && !/fetch|network/i.test(err.message) ? err.message : FALLBACK
        write((message) => ({ ...message, text, failed: true }))
      }
    } finally {
      if (request.current === controller) {
        setBusy(false)
        field.current?.focus()
      }
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void ask(input)
  }

  if (!open) {
    return (
      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir l’assistant"
        title="Ouvrir l’assistant"
        className="site-chat-launcher fixed right-4 z-[85] grid h-16 w-16 place-items-center rounded-full border-[3px] border-sun bg-forest text-white shadow-lg shadow-forest/25 transition-colors hover:bg-ink"
      >
        <Bot className="h-9 w-9" strokeWidth={1.5} aria-hidden="true" />
      </button>
    )
  }

  return (
    <section
      role="dialog"
      aria-label="Assistant de la Semaine de l’industrie"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
      className="fixed inset-0 z-[90] flex flex-col overflow-hidden border border-forest/20 bg-white text-ink shadow-2xl shadow-forest/30 sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[min(38rem,calc(100dvh-2rem))] sm:w-[25rem]"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Fermer"
        title="Fermer"
        className="absolute right-2 top-2 z-10 grid h-9 w-9 place-items-center bg-white/90 text-forest transition-colors hover:bg-forest hover:text-white"
      >
        <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      <div ref={list} aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-sage/60 p-4 pt-12 text-[15px] leading-relaxed">
        <div className="max-w-[90%] border border-forest/10 bg-white px-3.5 py-2.5">
          Bonjour ! Je vous renseigne sur le programme, les visites et les inscriptions à la Semaine de l’industrie 2026.
        </div>
        {messages.map((message) => (message.role === 'user' ? (
          <div key={message.id} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words bg-forest px-3.5 py-2.5 text-white">
            {message.text}
          </div>
        ) : (
          <div key={message.id} className={`w-fit max-w-[90%] break-words border bg-white px-3.5 py-2.5 ${message.failed ? 'border-flag/40' : 'border-forest/10'}`}>
            {message.text
              ? <Answer text={message.text} />
              : <span className="text-ink/55">L’assistant écrit…</span>}
          </div>
        )))}
      </div>

      <form onSubmit={onSubmit} className="border-t border-forest/15 bg-white p-3">
        <div className="flex items-center gap-2">
          <input
            ref={field}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            maxLength={1000}
            placeholder="Écrivez votre question"
            aria-label="Votre question"
            className="h-11 min-w-0 flex-1 border border-forest/30 bg-white px-3 text-[15px] text-ink placeholder:text-ink/45 focus:border-forest focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Envoyer"
            title="Envoyer"
            className="grid h-11 w-11 shrink-0 place-items-center bg-forest text-white transition-colors hover:bg-ink disabled:opacity-40"
          >
            <Send className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 text-[12px] text-ink/55">
          Réponses automatiques.{' '}
          <Link to="/confidentialite/" className="underline underline-offset-2">Confidentialité</Link>
        </p>
      </form>
    </section>
  )
}
