import { SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action'
import type { Column, Row } from './types'

export const HANDLE_SLOT = { id: '__handle' }
export const TIME_SLOT = { id: '__time' }
export const TRAILING_SLOT = { id: '__trailing' }

/**
 * Dragging past the edge of a zone makes the library swap the dragged item for
 * a placeholder of its own. It carries none of a column's or a row's fields, so
 * it must never be rendered as one and must never reach the stored document.
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

export function rowsFromDndItems(items: readonly Row[]): Row[] {
  return items.filter((row) => !isDragPlaceholder(row))
}

/**
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
