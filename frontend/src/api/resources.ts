import { API_BASE } from '../config/api'
import { apiFetch } from './client'
import { getAccessToken } from './session'

export type GlobalResource = {
  id: string
  title: string
  file_url: string
  is_primary: boolean
}

/* Liste les ressources globales. */
export function listResources() {
  return apiFetch<GlobalResource[]>('/resources')
}

/* Envoie un fichier (orga). */
export async function uploadResource(file: File, title: string, asProgramme = false) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('file', file)
  body.append('title', title)
  body.append('is_primary', asProgramme ? '1' : '0')
  const res = await fetch(`${API_BASE}/resources`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
  const json = (await res.json()) as {
    success: boolean
    data?: GlobalResource
    error?: { message: string }
  }
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Erreur HTTP ${res.status}`)
  }
  return json.data
}

/* Marque ou retire le fichier programme (un seul à la fois). */
export function setProgrammeResource(id: string, flagged: boolean) {
  return apiFetch<GlobalResource>(`/resources/${id}/primary`, {
    method: 'PATCH',
    body: JSON.stringify({ is_primary: flagged }),
  })
}

/* Supprime une ressource. */
export function deleteResource(id: string) {
  return apiFetch<{ id: string }>(`/resources/${id}`, { method: 'DELETE' })
}
