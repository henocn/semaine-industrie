import { apiFetch } from './client'

export type ChatbotConversation = {
  phone: string
  messages: number
  last_at: string
  last_body: string
  last_direction: 'in' | 'out'
}

export type ChatbotMessage = {
  id: string
  direction: 'in' | 'out'
  body: string
  sent_at: string
}

/* Une ligne par numéro ayant échangé avec le bot. */
export function listChatbotConversations() {
  return apiFetch<ChatbotConversation[]>('/whatsapp/conversations')
}

/* Messages échangés avec un numéro. */
export function getChatbotConversation(phone: string) {
  return apiFetch<ChatbotMessage[]>(`/whatsapp/conversations/${encodeURIComponent(phone)}`)
}
