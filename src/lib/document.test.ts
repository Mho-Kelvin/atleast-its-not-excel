import { describe, expect, it } from 'vitest'
import {
  addColumn,
  canAddColumnType,
  createColumn,
  createDocument,
  createRow,
  findDurationColumn,
  removeColumn,
} from './document'

describe('createDocument', () => {
  it('starts with one duration column and one empty row', () => {
    const document = createDocument('Ablauf')
    expect(findDurationColumn(document.columns)?.title).toBe('Dauer')
    expect(document.rows).toHaveLength(1)
    expect(Object.values(document.rows[0].cells)).toEqual(['', '', ''])
  })
})

describe('canAddColumnType', () => {
  it('refuses a second duration column', () => {
    const document = createDocument('Ablauf')
    expect(canAddColumnType(document.columns, 'duration')).toBe(false)
    expect(canAddColumnType(document.columns, 'text')).toBe(true)
  })

  it('allows a duration column again once the first one is gone', () => {
    const document = createDocument('Ablauf')
    removeColumn(document, findDurationColumn(document.columns)!.id)
    expect(canAddColumnType(document.columns, 'duration')).toBe(true)
  })
})

describe('addColumn and removeColumn', () => {
  it('keeps every row in step with the column set', () => {
    const document = createDocument('Ablauf')
    const column = createColumn('Ort', 'text')
    addColumn(document, column)
    expect(document.rows[0].cells[column.id]).toBe('')

    removeColumn(document, column.id)
    expect(column.id in document.rows[0].cells).toBe(false)
  })
})

describe('createRow', () => {
  it('gives the new row a cell for every column', () => {
    const document = createDocument('Ablauf')
    const row = createRow(document.columns)
    expect(Object.keys(row.cells).sort()).toEqual(document.columns.map((c) => c.id).sort())
  })
})
