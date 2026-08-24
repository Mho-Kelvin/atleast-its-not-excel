import { SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action'
import type { Column, ColumnType, HeaderField, Row, ScheduleDocument } from './types'

function newId(): string {
  return crypto.randomUUID()
}

export function createColumn(title: string, type: ColumnType): Column {
  return { id: newId(), title, type }
}

export function rowsFromDndItems(items: readonly Row[]): Row[] {
  return items.filter((row) => !isDragPlaceholder(row))
}

export function createRow(columns: readonly Column[]): Row {
  const cells: Record<string, string> = {}
  for (const column of columns) cells[column.id] = ''
  return { id: newId(), cells }
}

export function createDocument(title: string): ScheduleDocument {
  const columns = [
    createColumn('Dauer', 'duration'),
    createColumn('Programmpunkt', 'text'),
    createColumn('Verantwortlich', 'text'),
  ]
  return {
    id: newId(),
    title,
    headerFields: [],
    startTime: '09:00',
    columns,
    rows: [createRow(columns)],
    updatedAt: Date.now(),
  }
}

export function findDurationColumn(columns: readonly Column[]): Column | undefined {
  return columns.find((column) => column.type === 'duration')
}

export const HANDLE_SLOT = { id: '__handle' }
export const TIME_SLOT = { id: '__time' }
export const TRAILING_SLOT = { id: '__trailing' }

/**
 * Dragging past the edge of a zone makes the library swap the dragged item for
 * a placeholder of its own. It is neither a fixed cell nor a column, and it
 * carries none of a column's or a row's fields, so it must never be rendered as
 * one and must never reach the stored document.
 */
export function isDragPlaceholder(item: { id: string }): boolean {
  return item.id === SHADOW_PLACEHOLDER_ITEM_ID
}

const FIXED_SLOT_IDS = new Set([
  HANDLE_SLOT.id,
  TIME_SLOT.id,
  TRAILING_SLOT.id,
  SHADOW_PLACEHOLDER_ITEM_ID,
])

/** A cell position in the table: either a user column or one of the fixed cells. */
export type HeaderSlot = Column | { id: string }

/**
 * The drag library maps each DOM child of a zone onto the same index of its
 * items array, so the fixed cells have to travel in that array too. The header
 * row and every body row render the same slot order.
 */
export function headerSlots(columns: readonly Column[]): HeaderSlot[] {
  const slots: HeaderSlot[] = [HANDLE_SLOT]
  for (const column of columns) {
    if (column.type === 'duration') slots.push(TIME_SLOT)
    slots.push(column)
  }
  slots.push(TRAILING_SLOT)
  return slots
}

/**
 * Keeps the item the library marked as its drag shadow, which carries the id of
 * the column being dragged and has to stay in place for the animation.
 *
 * The start-time cell is the handle for the whole time group, so a drag that
 * started there moves the duration column it belongs to.
 */
export function columnsFromDndItems(items: readonly HeaderSlot[], draggedId?: string): Column[] {
  const columns = items.filter((item) => !FIXED_SLOT_IDS.has(item.id)) as Column[]
  if (draggedId !== TIME_SLOT.id) return columns
  return withDurationColumnAt(columns, countColumnsBefore(items, TIME_SLOT.id))
}

function countColumnsBefore(items: readonly HeaderSlot[], id: string): number {
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return -1
  return items.slice(0, index).filter((item) => !FIXED_SLOT_IDS.has(item.id)).length
}

function withDurationColumnAt(columns: Column[], target: number): Column[] {
  const from = columns.findIndex((column) => column.type === 'duration')
  if (from < 0 || target < 0) return columns

  const rest = columns.filter((_, index) => index !== from)
  const at = Math.min(target > from ? target - 1 : target, rest.length)
  rest.splice(at, 0, columns[from])
  return rest
}

/**
 * A document carries at most one duration column, because the start-time
 * cascade has to have a single unambiguous source.
 */
export function canAddColumnType(columns: readonly Column[], type: ColumnType): boolean {
  if (type !== 'duration') return true
  return findDurationColumn(columns) === undefined
}

export function addColumn(document: ScheduleDocument, column: Column): void {
  document.columns.push(column)
  for (const row of document.rows) row.cells[column.id] = ''
}

export function removeColumn(document: ScheduleDocument, columnId: string): void {
  document.columns = document.columns.filter((column) => column.id !== columnId)
  for (const row of document.rows) delete row.cells[columnId]
}

export function createHeaderField(label = ''): HeaderField {
  return { id: newId(), label, value: '' }
}

/**
 * A copy with fresh ids throughout, so editing the copy cannot reach back into
 * the original through a shared column id.
 */
export function duplicateDocument(source: ScheduleDocument, title: string): ScheduleDocument {
  const newColumnIds = new Map<string, string>()
  const columns = source.columns.map((column) => {
    const id = newId()
    newColumnIds.set(column.id, id)
    return { ...column, id }
  })

  const rows = source.rows.map((row) => {
    const cells: Record<string, string> = {}
    for (const [oldColumnId, value] of Object.entries(row.cells)) {
      const newColumnId = newColumnIds.get(oldColumnId)
      if (newColumnId !== undefined) cells[newColumnId] = value
    }
    return { id: newId(), cells }
  })

  return {
    id: newId(),
    title,
    headerFields: source.headerFields.map((field) => ({ ...field, id: newId() })),
    startTime: source.startTime,
    columns,
    rows,
    hideTimeInPrint: source.hideTimeInPrint,
    updatedAt: Date.now(),
  }
}
