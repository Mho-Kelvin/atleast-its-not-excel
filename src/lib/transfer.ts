import { isDocument, isList, normalise } from './storage'
import { strings } from './strings'
import type { ImportCounts, ScheduleDocument, SelectList, StartTime, Store } from './types'

const FORMAT = 'atleast-its-not-excel'
const VERSION = 1

export interface Envelope {
  format: string
  version: number
  exportedAt: number
  documents: ScheduleDocument[]
  templates: ScheduleDocument[]
  lists: SelectList[]
  startTimes: StartTime[]
}

export type ImportResult = { ok: true; counts: ImportCounts } | { ok: false }

function envelope(parts: Partial<Envelope>): Envelope {
  return {
    format: FORMAT,
    version: VERSION,
    exportedAt: Date.now(),
    documents: [],
    templates: [],
    lists: [],
    startTimes: [],
    ...parts,
  }
}

export function documentEnvelope(document: ScheduleDocument): Envelope {
  return envelope({ documents: [document] })
}

/**
 * A template travels with the lists its select columns point at, because it is
 * the thing people hand to someone else. A plain document does not.
 */
export function templateEnvelope(
  template: ScheduleDocument,
  lists: readonly SelectList[],
): Envelope {
  const used = new Set(template.columns.map((column) => column.listId))
  return envelope({ templates: [template], lists: lists.filter((list) => used.has(list.id)) })
}

export function listsEnvelope(store: Store): Envelope {
  return envelope({ lists: store.lists, startTimes: store.startTimes })
}

export function backupEnvelope(store: Store): Envelope {
  return envelope({ ...store })
}

export function fileName(base: string, on = new Date()): string {
  const raw = base.trim() === '' ? strings.exportFallbackName : base
  const clean = raw.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '')
  return `${clean}-${on.toISOString().slice(0, 10)}.json`
}

export function download(data: Envelope, base: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName(base)
  link.click()
  // Revoked a tick later: the click only starts the download, and pulling the
  // URL out from under it in the same task loses the file in some browsers.
  setTimeout(() => URL.revokeObjectURL(url))
}

/**
 * Merges a file into the store. Never replaces and never deletes, so a wrong
 * file costs nothing but a few entries to delete by hand.
 */
export function importInto(store: Store, text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false }
  }
  if (!isEnvelope(parsed)) return { ok: false }

  const incoming = normalise({
    documents: asArray(parsed.documents).filter(isDocument),
    templates: asArray(parsed.templates).filter(isDocument),
    lists: asArray(parsed.lists).filter(isList),
    // The trailing empty entry is the draft the dialog types into, not data.
    startTimes: asArray(parsed.startTimes).filter(isFilledStartTime),
  })

  return { ok: true, counts: merge(store, incoming) }
}

function isEnvelope(value: unknown): value is Partial<Envelope> {
  if (typeof value !== 'object' || value === null) return false
  return (value as Envelope).format === FORMAT
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/** A file is always written by this version, so the bare-string form loadStore
 *  still accepts cannot reach here. */
function isFilledStartTime(value: unknown): value is StartTime {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as StartTime
  if (typeof entry.time !== 'string') return false
  return entry.time !== '' || (entry.name ?? '') !== ''
}

function merge(store: Store, incoming: Store): ImportCounts {
  const documents = incoming.documents.map((entry) => copyIfTaken(store.documents, entry))
  const templates = incoming.templates.map((entry) => copyIfTaken(store.templates, entry))
  store.documents.push(...documents)
  store.templates.push(...templates)

  const lists = incoming.lists.filter((entry) => !hasId(store.lists, entry.id))
  const startTimes = incoming.startTimes.filter((entry) => !hasId(store.startTimes, entry.id))
  store.lists.push(...lists)
  store.startTimes.push(...startTimes)

  for (const document of [...documents, ...templates]) dropDeadListIds(store, document)

  return {
    documents: documents.length,
    templates: templates.length,
    lists: lists.length,
    startTimes: startTimes.length,
  }
}

function hasId(entries: readonly { id: string }[], id: string): boolean {
  return entries.some((entry) => entry.id === id)
}

/**
 * A colliding document is a second copy, not the same one, so it comes in beside
 * the original. A colliding list is the same list, and is skipped instead.
 */
function copyIfTaken(
  existing: readonly ScheduleDocument[],
  document: ScheduleDocument,
): ScheduleDocument {
  if (!hasId(existing, document.id)) return document
  return { ...document, id: crypto.randomUUID() }
}

/** A column left holding a list id nothing points at shows an empty dropdown. */
function dropDeadListIds(store: Store, document: ScheduleDocument): void {
  for (const column of document.columns) {
    if (column.listId !== undefined && !hasId(store.lists, column.listId)) {
      column.listId = undefined
    }
  }
}
