import type { ScheduleDocument, SelectList, Store } from './types'

const STORAGE_KEY = 'tobias-tool/v1'
const BROKEN_KEY = 'tobias-tool/v1-broken'

export function emptyStore(): Store {
  return { documents: [], lists: [] }
}

/**
 * Reads the store back from localStorage. Anything unreadable is set aside under
 * a second key rather than thrown away, so a bad write does not silently cost
 * someone their documents.
 */
export function loadStore(): Store {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return emptyStore()

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    localStorage.setItem(BROKEN_KEY, raw)
    return emptyStore()
  }

  if (!isStore(parsed)) {
    localStorage.setItem(BROKEN_KEY, raw)
    return emptyStore()
  }
  return parsed
}

/** Returns false when the browser refused the write, e.g. the quota is full. */
export function saveStore(store: Store): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    return true
  } catch {
    return false
  }
}

function isStore(value: unknown): value is Store {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  if (!Array.isArray(candidate.documents) || !Array.isArray(candidate.lists)) return false
  return candidate.documents.every(isDocument) && candidate.lists.every(isList)
}

function isDocument(value: unknown): value is ScheduleDocument {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.startTime === 'string' &&
    Array.isArray(candidate.headerFields) &&
    Array.isArray(candidate.columns) &&
    Array.isArray(candidate.rows)
  )
}

function isList(value: unknown): value is SelectList {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    Array.isArray(candidate.values)
  )
}
