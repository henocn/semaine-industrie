import { apiFetch } from './client'

export type SurveyQuestionKind = 'scale' | 'choice'

export type SurveyQuestion = {
  id?: string
  key: string
  label: string
  kind?: SurveyQuestionKind
  options?: string[] | null
  sort_order?: number
  is_active?: boolean
}

export type SurveyStats = {
  questions: Array<{ key: string; label: string; kind?: string; is_active?: boolean }>
  counts: { before: number; after: number }
  averages: Array<{
    key: string
    label: string
    kind?: string
    before: number | null
    after: number | null
  }>
  choices?: Array<{
    key: string
    label: string
    kind: 'choice'
    options: string[]
    before: Record<string, number>
    after: Record<string, number>
  }>
  total: number
}

export type SurveyAnswerValue = number | string

/* Questions actives (formulaire public). */
export function getSurveyQuestions() {
  return apiFetch<SurveyQuestion[]>('/surveys/questions')
}

/* Soumet before/after. */
export function submitSurvey(payload: {
  phase: 'before' | 'after'
  answers: Record<string, SurveyAnswerValue>
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
export function createSurveyQuestion(payload: {
  label: string
  kind: SurveyQuestionKind
  options?: string[]
}) {
  return apiFetch<SurveyQuestion>('/surveys/admin/questions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/* Met à jour une question. */
export function updateSurveyQuestion(
  id: string,
  payload: { label?: string; kind?: SurveyQuestionKind; options?: string[] | null },
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

/* Réordonne via drag and drop. */
export function reorderSurveyQuestions(ordered_ids: string[]) {
  return apiFetch<SurveyQuestion[]>('/surveys/admin/questions/reorder', {
    method: 'POST',
    body: JSON.stringify({ ordered_ids }),
  })
}
