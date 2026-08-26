import type { SelectList, StartTime, Store } from './types'

export function createList(name: string): SelectList {
  return { id: crypto.randomUUID(), name, values: [] }
}

export function createStartTime(time = '', name = ''): StartTime {
  return { id: crypto.randomUUID(), time, name }
}

/** Never a list value: the dropdown entry that turns the cell into a text box. */
export const CUSTOM_VALUE = '__custom__'

/**
 * Deleting a list also clears it off every column that pointed at it, in every
 * document and every template. A column left holding a dead list id would show
 * an empty dropdown with no way to tell why.
 */
export function removeList(store: Store, listId: string): void {
  store.lists = store.lists.filter((list) => list.id !== listId)
  for (const document of [...store.documents, ...store.templates]) {
    for (const column of document.columns) {
      if (column.listId === listId) column.listId = undefined
    }
  }
}

/** Keeps one empty entry at the end of every list, which is how entries are added. */
export function ensureListDrafts(store: Store): void {
  for (const list of store.lists) {
    if (list.values.at(-1) !== '') list.values.push('')
  }

  const lastTime = store.startTimes.at(-1)
  if (!lastTime || lastTime.time !== '' || (lastTime.name ?? '') !== '') {
    store.startTimes.push(createStartTime())
  }
}

export function isDuplicateValue(values: readonly string[], index: number): boolean {
  const value = values[index]
  if (value === '') return false
  return values.some((other, position) => position !== index && other === value)
}

/** A named entry without a time is invisible in the dropdown, so it is flagged. */
export function isStartTimeMissing(entry: StartTime): boolean {
  return entry.time === '' && (entry.name ?? '') !== ''
}

/** A time on its own is not enough: two entries only clash when their names match too. */
export function isDuplicateStartTime(entries: readonly StartTime[], index: number): boolean {
  const entry = entries[index]
  if (entry.time === '') return false
  return entries.some(
    (other, position) =>
      position !== index && other.time === entry.time && (other.name ?? '') === (entry.name ?? ''),
  )
}

export function listValues(lists: readonly SelectList[], listId: string | undefined): string[] {
  const values = lists.find((list) => list.id === listId)?.values ?? []
  return values.filter((value) => value !== '').sort((a, b) => a.localeCompare(b))
}

/** The entries the start-time dropdown offers: named ones by name, bare times last. */
export function startTimeOptions(entries: readonly StartTime[]): StartTime[] {
  const named = entries.filter((entry) => entry.time !== '' && (entry.name ?? '') !== '')
  const unnamed = entries.filter((entry) => entry.time !== '' && (entry.name ?? '') === '')

  named.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '') || a.time.localeCompare(b.time))
  unnamed.sort((a, b) => a.time.localeCompare(b.time))

  return [...named, ...unnamed]
}
