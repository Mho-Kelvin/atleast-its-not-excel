import { SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action'
import { describe, expect, it } from 'vitest'
import { createColumn, createDocument } from './document'
import {
  columnsFromDndItems,
  headerSlots,
  isDragPlaceholder,
  rowsFromDndItems,
  HANDLE_SLOT,
  TIME_SLOT,
  TRAILING_SLOT,
} from './slots'
import type { Row } from './types'

describe('headerSlots', () => {
  it('puts the start-time slot directly in front of the duration column', () => {
    const columns = [
      createColumn('Programmpunkt', 'text'),
      createColumn('Dauer', 'duration'),
      createColumn('Verantwortlich', 'text'),
    ]

    expect(headerSlots(columns).map((slot) => slot.id)).toEqual([
      HANDLE_SLOT.id,
      columns[0].id,
      TIME_SLOT.id,
      columns[1].id,
      columns[2].id,
      TRAILING_SLOT.id,
    ])
  })

  it('leaves out the start-time slot when no column holds a duration', () => {
    const columns = [createColumn('Programmpunkt', 'text')]

    expect(headerSlots(columns).map((slot) => slot.id)).toEqual([
      HANDLE_SLOT.id,
      columns[0].id,
      TRAILING_SLOT.id,
    ])
  })

  it('gives one slot per rendered cell, which is what the drag library indexes', () => {
    const document = createDocument('Ablauf')
    expect(headerSlots(document.columns)).toHaveLength(document.columns.length + 3)
  })
})

describe('columnsFromDndItems', () => {
  it('drops the fixed cells and keeps the columns in their dropped order', () => {
    const first = createColumn('Programmpunkt', 'text')
    const second = createColumn('Dauer', 'duration')

    const reordered = [HANDLE_SLOT, second, TIME_SLOT, first, TRAILING_SLOT]

    expect(columnsFromDndItems(reordered)).toEqual([second, first])
  })

  it('keeps the item the library marked as its drag shadow', () => {
    const column = createColumn('Ort', 'text')
    const shadow = { ...column, isDndShadowItem: true }

    expect(columnsFromDndItems([HANDLE_SLOT, shadow, TRAILING_SLOT])).toEqual([shadow])
  })

  it('ignores a fixed cell that was dropped out of its usual place', () => {
    const column = createColumn('Ort', 'text')

    expect(columnsFromDndItems([column, TRAILING_SLOT, HANDLE_SLOT])).toEqual([column])
  })

  it('moves the duration column when the start-time cell is what was dragged', () => {
    const first = createColumn('Programmpunkt', 'text')
    const duration = createColumn('Dauer', 'duration')
    const last = createColumn('Verantwortlich', 'text')

    // The time cell was dragged to the front; the duration column has not moved.
    const items = [HANDLE_SLOT, TIME_SLOT, first, duration, last, TRAILING_SLOT]

    expect(columnsFromDndItems(items, TIME_SLOT.id)).toEqual([duration, first, last])
  })

  it('moves the duration column to the end when the start-time cell lands there', () => {
    const first = createColumn('Programmpunkt', 'text')
    const duration = createColumn('Dauer', 'duration')
    const last = createColumn('Verantwortlich', 'text')

    const items = [HANDLE_SLOT, first, duration, last, TIME_SLOT, TRAILING_SLOT]

    expect(columnsFromDndItems(items, TIME_SLOT.id)).toEqual([first, last, duration])
  })

  it('leaves the order alone when the start-time cell is dropped where it started', () => {
    const first = createColumn('Programmpunkt', 'text')
    const duration = createColumn('Dauer', 'duration')

    const items = [HANDLE_SLOT, first, TIME_SLOT, duration, TRAILING_SLOT]

    expect(columnsFromDndItems(items, TIME_SLOT.id)).toEqual([first, duration])
  })

  it('ignores a start-time drag when no column holds a duration', () => {
    const only = createColumn('Programmpunkt', 'text')

    expect(columnsFromDndItems([HANDLE_SLOT, only, TRAILING_SLOT], TIME_SLOT.id)).toEqual([only])
  })

  it('never lets the library placeholder through as a column', () => {
    const column = createColumn('Ort', 'text')
    const placeholder = { id: SHADOW_PLACEHOLDER_ITEM_ID }

    expect(columnsFromDndItems([HANDLE_SLOT, placeholder, column, TRAILING_SLOT])).toEqual([column])
  })
})

describe('isDragPlaceholder', () => {
  it('spots the placeholder the library swaps in past a zone edge', () => {
    expect(isDragPlaceholder({ id: SHADOW_PLACEHOLDER_ITEM_ID })).toBe(true)
    expect(isDragPlaceholder(createColumn('Ort', 'text'))).toBe(false)
    expect(isDragPlaceholder(HANDLE_SLOT)).toBe(false)
  })
})

describe('rowsFromDndItems', () => {
  it('keeps the placeholder out of the stored rows', () => {
    const document = createDocument('Ablauf')
    const placeholder = { id: SHADOW_PLACEHOLDER_ITEM_ID } as Row

    expect(rowsFromDndItems([...document.rows, placeholder])).toEqual(document.rows)
  })
})
