import { describe, expect, it } from 'vitest'
import {
  addColumn,
  canAddColumnType,
  createColumn,
  createDocument,
  createHeaderField,
  createRow,
  duplicateDocument,
  findDurationColumn,
  moveColumn,
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

describe('moveColumn', () => {
  it('swaps a column with its neighbour', () => {
    const document = createDocument('Ablauf')
    const titles = document.columns.map((column) => column.title)

    moveColumn(document, 0, 1)

    expect(document.columns.map((column) => column.title)).toEqual([
      titles[1],
      titles[0],
      titles[2],
    ])
  })

  it('does nothing at either end', () => {
    const document = createDocument('Ablauf')
    const before = document.columns.map((column) => column.id)

    moveColumn(document, 0, -1)
    moveColumn(document, document.columns.length - 1, 1)

    expect(document.columns.map((column) => column.id)).toEqual(before)
  })
})

describe('duplicateDocument', () => {
  it('copies the cell contents', () => {
    const source = createDocument('Ablauf')
    const durationColumn = findDurationColumn(source.columns)!
    source.rows[0].cells[durationColumn.id] = '15'

    const copy = duplicateDocument(source, 'Ablauf (Kopie)')
    const copiedDuration = findDurationColumn(copy.columns)!

    expect(copy.title).toBe('Ablauf (Kopie)')
    expect(copy.rows[0].cells[copiedDuration.id]).toBe('15')
  })

  it('shares no ids with the original', () => {
    const source = createDocument('Ablauf')
    source.headerFields.push(createHeaderField('Ort'))
    const copy = duplicateDocument(source, 'Kopie')

    expect(copy.id).not.toBe(source.id)
    expect(copy.rows[0].id).not.toBe(source.rows[0].id)
    expect(copy.headerFields[0].id).not.toBe(source.headerFields[0].id)
    for (const column of copy.columns) {
      expect(source.columns.some((original) => original.id === column.id)).toBe(false)
    }
  })

  it('leaves the original untouched when the copy is edited', () => {
    const source = createDocument('Ablauf')
    const copy = duplicateDocument(source, 'Kopie')
    const copiedColumn = copy.columns[0]

    copy.rows[0].cells[copiedColumn.id] = 'geändert'

    expect(Object.values(source.rows[0].cells)).toEqual(['', '', ''])
  })
})

describe('createRow', () => {
  it('gives the new row a cell for every column', () => {
    const document = createDocument('Ablauf')
    const row = createRow(document.columns)
    expect(Object.keys(row.cells).sort()).toEqual(document.columns.map((c) => c.id).sort())
  })
})
