import { apiFetch } from './client'

export type SurveyQuestion = { key: string; label: string }

/* Questions du questionnaire. */
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
  return apiFetch<{
    counts: { before: number; after: number }
    averages: Array<{ key: string; label: string; before: number | null; after: number | null }>
    total: number
  }>('/surveys/stats')
}
