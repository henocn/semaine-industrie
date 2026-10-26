import { API_BASE } from '../config/api'
import { apiFetch } from './client'
import { getAccessToken } from './session'

export type VoteOption = {
  id: string
  label: string
  description: string | null
  image_url: string | null
  votes: number
}

/* Résultats / options de vote. */
export function getVotes() {
  return apiFetch<VoteOption[]>('/engagement/votes')
}

/* Vote (1 par voter_key). */
export function castVote(option_id: string, voter_key: string) {
  return apiFetch<VoteOption[]>('/engagement/votes', {
    method: 'POST',
    body: JSON.stringify({ option_id, voter_key }),
  })
}

/* Envoie un produit (image facultative au premier enregistrement). */
async function sendProduct(path: string, method: 'POST' | 'PATCH', title: string, description: string, file: File | null) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('label', title)
  body.append('description', description)
  if (file) body.append('image', file)
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
  const json = (await res.json()) as {
    success: boolean
    data?: VoteOption
    error?: { message: string }
  }
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Erreur HTTP ${res.status}`)
  }
  return json.data
}

/* Ajoute un produit au coup de cœur. */
export function createVoteProduct(title: string, description: string, file: File | null) {
  return sendProduct('/engagement/votes/options', 'POST', title, description, file)
}

/* Met à jour un produit. */
export function updateVoteProduct(id: string, title: string, description: string, file: File | null) {
  return sendProduct(`/engagement/votes/options/${id}`, 'PATCH', title, description, file)
}

/* Retire un produit du vote. */
export function deleteVoteProduct(id: string) {
  return apiFetch<{ id: string }>(`/engagement/votes/options/${id}`, { method: 'DELETE' })
}
