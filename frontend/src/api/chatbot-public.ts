import { API_BASE } from '../config/api'

export type ChatEvent =
  | { type: 'delta'; text: string; conversation_id?: string }
  | { type: 'replace'; text: string }
  | { type: 'end'; conversation_id?: string }
  | { type: 'reset' }
  | { type: 'error' }

/* Envoie une question et transmet la réponse au fur et à mesure qu'elle arrive. */
export async function askChatbot(
  body: { query: string; visitor_id: string; conversation_id: string | null },
  onEvent: (event: ChatEvent) => void,
  signal: AbortSignal,
) {
  const res = await fetch(`${API_BASE}/chatbot/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) {
    const payload = await res.json().catch(() => null) as { error?: { message?: string } } | null
    throw new Error(payload?.error?.message || 'Réponse indisponible')
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return
    buffer += value
    let end = buffer.indexOf('\n\n')
    while (end >= 0) {
      const block = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      if (block.startsWith('data: ')) onEvent(JSON.parse(block.slice(6)) as ChatEvent)
      end = buffer.indexOf('\n\n')
    }
  }
}
