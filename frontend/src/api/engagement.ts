import { apiFetch } from './client'

export type LiveQuestion = {
  id: string
  session_key: string
  author_name: string | null
  body: string
  status: string
  createdAt?: string
}

export type VoteOption = {
  id: string
  label: string
  votes: number
  organization?: { name: string; slug: string } | null
}

/* Envoie une question live. */
export function askQuestion(payload: { body: string; author_name?: string; session_key?: string }) {
  return apiFetch<LiveQuestion>('/engagement/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Liste les questions. */
export function listQuestions(params?: { public?: boolean; status?: string }) {
  const sp = new URLSearchParams()
  if (params?.public) sp.set('public', '1')
  if (params?.status) sp.set('status', params.status)
  const q = sp.toString() ? `?${sp}` : ''
  return apiFetch<LiveQuestion[]>(`/engagement/questions${q}`)
}

/* Modère une question. */
export function reviewQuestion(id: string, status: 'approved' | 'done' | 'rejected') {
  return apiFetch<LiveQuestion>(`/engagement/questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
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
