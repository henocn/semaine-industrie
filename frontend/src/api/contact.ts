import { apiFetch } from './client'

/* Envoie le formulaire contact public vers info@. */
export function sendContactMessage(payload: {
  name: string
  organization?: string
  email: string
  message: string
}) {
  return apiFetch<{ ok: boolean }>('/contact', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
