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
export async function uploadResource(file: File, title: string, isPrimary: boolean) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('file', file)
  body.append('title', title)
  body.append('is_primary', isPrimary ? '1' : '0')
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

/* Marque une ressource comme fichier principal. */
export function setPrimaryResource(id: string) {
  return apiFetch<GlobalResource>(`/resources/${id}/primary`, { method: 'PATCH' })
}

/* Supprime une ressource. */
export function deleteResource(id: string) {
  return apiFetch<{ id: string }>(`/resources/${id}`, { method: 'DELETE' })
}

export type EntryResourceKind = 'organization' | 'participation' | 'business'

export type EntryResource = {
  id: string
  entry_kind: EntryResourceKind
  entry_id: string
  title: string
  file_url: string
  original_name?: string | null
}

/* Liste les fichiers joints à une fiche acceptée. */
export function listEntryResources(kind: EntryResourceKind, entryId: string) {
  const q = new URLSearchParams({ kind, id: entryId })
  return apiFetch<EntryResource[]>(`/entry-resources?${q}`)
}

/* Ajoute un fichier titré à une fiche acceptée. */
export async function uploadEntryResource(
  kind: EntryResourceKind,
  entryId: string,
  file: File,
  title: string,
) {
  const token = getAccessToken()
  const body = new FormData()
  body.append('file', file)
  body.append('title', title)
  body.append('kind', kind)
  body.append('id', entryId)
  const res = await fetch(`${API_BASE}/entry-resources`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })
  const json = (await res.json()) as {
    success: boolean
    data?: EntryResource
    error?: { message: string }
  }
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.error?.message || `Erreur HTTP ${res.status}`)
  }
  return json.data
}

/* Retire un fichier d'une fiche. */
export function deleteEntryResource(id: string) {
  return apiFetch<{ id: string }>(`/entry-resources/${id}`, { method: 'DELETE' })
}
