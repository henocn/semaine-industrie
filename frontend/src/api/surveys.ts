import { apiFetch } from './client'

export type SurveyQuestion = {
  id?: string
  key: string
  label: string
  sort_order?: number
  is_active?: boolean
}

export type SurveyStats = {
  questions: Array<{ key: string; label: string; is_active?: boolean }>
  counts: { before: number; after: number }
  averages: Array<{ key: string; label: string; before: number | null; after: number | null }>
  total: number
}

export type SurveyResponseRow = {
  id: string
  phase: 'before' | 'after'
  answers: Record<string, number>
  source: string
  created_at: string
}

/* Questions actives (formulaire public). */
export function getSurveyQuestions() {
  return apiFetch<SurveyQuestion[]>('/surveys/questions')
}

/* Soumet before/after. */
export function submitSurvey(payload: {
  phase: 'before' | 'after'
  answers: Record<string, number>
  passport_code?: string
  source?: 'qr' | 'paper'
}) {
  return apiFetch('/surveys', { method: 'POST', body: JSON.stringify(payload) })
}

/* Stats orga. */
export function getSurveyStats() {
  return apiFetch<SurveyStats>('/surveys/stats')
}

/* Questions (admin). */
export function listSurveyQuestionsAdmin() {
  return apiFetch<SurveyQuestion[]>('/surveys/admin/questions')
}

/* Crée une question. */
export function createSurveyQuestion(label: string) {
  return apiFetch<SurveyQuestion>('/surveys/admin/questions', {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
}

/* Met à jour une question. */
export function updateSurveyQuestion(
  id: string,
  payload: { label?: string; is_active?: boolean; sort_order?: number },
) {
  return apiFetch<SurveyQuestion>(`/surveys/admin/questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/* Supprime une question. */
export function deleteSurveyQuestion(id: string) {
  return apiFetch<{ id: string }>(`/surveys/admin/questions/${id}`, { method: 'DELETE' })
}

/* Monte ou descend une question. */
export function moveSurveyQuestion(id: string, direction: 'up' | 'down') {
  return apiFetch<SurveyQuestion>(`/surveys/admin/questions/${id}/move`, {
    method: 'POST',
    body: JSON.stringify({ direction }),
  })
}

/* Dernières réponses. */
export function listSurveyResponses(limit = 30) {
  return apiFetch<SurveyResponseRow[]>(`/surveys/responses?limit=${limit}`)
}
