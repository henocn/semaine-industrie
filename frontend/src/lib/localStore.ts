export const DAY_MS = 24 * 60 * 60 * 1000
export const MONTH_MS = 30 * DAY_MS

/* Valeur stockée avec une date d'expiration. */
type Expiring = { __v: unknown; __exp: number }

function isExpiring(value: unknown): value is Expiring {
  return typeof value === 'object' && value !== null && '__exp' in value && '__v' in value
}

/* Lecture localStorage sans jamais casser la page ; une valeur expirée est supprimée. */
export function readStore<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isExpiring(parsed)) return parsed as T
    if (Date.now() > parsed.__exp) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.__v as T
  } catch {
    return null
  }
}

/* Écriture localStorage ; ttlMs fixe une durée de vie (sinon permanent), null efface. */
export function writeStore(key: string, value: unknown, ttlMs?: number) {
  try {
    if (value == null) {
      localStorage.removeItem(key)
      return
    }
    const stored = ttlMs ? { __v: value, __exp: Date.now() + ttlMs } : value
    localStorage.setItem(key, JSON.stringify(stored))
  } catch {
    /* stockage indisponible : on continue sans mémoire locale */
  }
}

/* Vrai si une clé non expirée commençant par prefix est enregistrée. */
export function hasStoreKey(prefix: string) {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    return keys.some((key) => readStore(key) != null)
  } catch {
    return false
  }
}
