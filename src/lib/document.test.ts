import { SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action'
import { describe, expect, it } from 'vitest'
import type { Row } from './types'
import {
  addColumn,
  createColumn,
  createDocument,
  createHeaderField,
  createRow,
  duplicateDocument,
  ensureDrafts,
  findDurationColumn,
  removeColumn,
  setCellStyle,
} from './document'

describe('createDocument', () => {
  it('starts with one duration column and one empty row', () => {
    const document = createDocument('Ablauf')
    expect(findDurationColumn(document.columns)?.title).toBe('Dauer')
    expect(document.rows).toHaveLength(1)
    expect(Object.values(document.rows[0].cells)).toEqual(['', '', ''])
  })
})

describe('ensureDrafts', () => {
  it('offers an empty header field and keeps the empty row a document starts with', () => {
    const document = createDocument('Ablauf')

    ensureDrafts(document)

    expect(document.headerFields).toHaveLength(1)
    expect(document.headerFields[0]).toMatchObject({ label: '', value: '' })
    expect(document.rows).toHaveLength(1)
  })

  it('adds nothing while the last row and the last field are still empty', () => {
    const document = createDocument('Ablauf')
    ensureDrafts(document)

    ensureDrafts(document)
    ensureDrafts(document)

    expect(document.headerFields).toHaveLength(1)
    expect(document.rows).toHaveLength(1)
  })

  it('puts a fresh draft below the one that was filled in', () => {
    const document = createDocument('Ablauf')
    ensureDrafts(document)
    document.headerFields[0].value = 'Saal'
    document.rows[0].cells[document.columns[1].id] = 'Begrüßung'

    ensureDrafts(document)

    expect(document.headerFields).toHaveLength(2)
    expect(document.headerFields[1]).toMatchObject({ label: '', value: '' })
    expect(document.rows).toHaveLength(2)
    expect(Object.keys(document.rows[1].cells)).toEqual(document.columns.map((it) => it.id))
  })

  it('counts a field holding only a label as filled in', () => {
    const document = createDocument('Ablauf')
    document.headerFields = [createHeaderField('Ort')]

    ensureDrafts(document)

    expect(document.headerFields).toHaveLength(2)
  })

  it('leaves the rows alone while the drag placeholder sits at the end', () => {
    const document = createDocument('Ablauf')
    document.rows[0].cells[document.columns[1].id] = 'Begrüßung'
    document.rows.push({ id: SHADOW_PLACEHOLDER_ITEM_ID } as Row)

    ensureDrafts(document)

    expect(document.rows).toHaveLength(2)
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

  it('drops the removed column out of the row styles too', () => {
    const document = createDocument('Ablauf')
    const column = createColumn('Ort', 'text')
    addColumn(document, column)
    setCellStyle(document.rows[0], column.id, { bold: true })

    removeColumn(document, column.id)

    expect(document.rows[0].styles?.[column.id]).toBeUndefined()
    expect(document.rows[0].styles).toBeUndefined()
  })
})

describe('setCellStyle', () => {
  it('stores a style on the row', () => {
    const document = createDocument('Ablauf')
    const columnId = document.columns[0].id

    setCellStyle(document.rows[0], columnId, { bold: true })

    expect(document.rows[0].styles).toEqual({ [columnId]: { bold: true } })
  })

  it('drops the entry and the styles object once it is undefined', () => {
    const document = createDocument('Ablauf')
    const columnId = document.columns[0].id
    setCellStyle(document.rows[0], columnId, { bold: true })

    setCellStyle(document.rows[0], columnId, undefined)

    expect(document.rows[0].styles).toBeUndefined()
  })

  it('drops the entry when the style is empty', () => {
    const document = createDocument('Ablauf')
    const columnId = document.columns[0].id
    setCellStyle(document.rows[0], columnId, { bold: true })

    setCellStyle(document.rows[0], columnId, {})

    expect(document.rows[0].styles).toBeUndefined()
  })

  it('leaves another column style alone', () => {
    const document = createDocument('Ablauf')
    const [firstId, secondId] = document.columns.map((column) => column.id)
    setCellStyle(document.rows[0], firstId, { bold: true })
    setCellStyle(document.rows[0], secondId, { italic: true })

    setCellStyle(document.rows[0], firstId, undefined)

    expect(document.rows[0].styles).toEqual({ [secondId]: { italic: true } })
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

  it('carries the print settings over', () => {
    const source = createDocument('Ablauf')
    source.hideTimeInPrint = true
    source.columns[1].hideInPrint = true

    const copy = duplicateDocument(source, 'Kopie')

    expect(copy.hideTimeInPrint).toBe(true)
    expect(copy.columns[1].hideInPrint).toBe(true)
    expect(copy.columns[2].hideInPrint).toBeUndefined()
  })

  it('copies the landscape flag', () => {
    const source = createDocument('Ablauf')
    source.landscape = true

    const copy = duplicateDocument(source, 'Kopie')

    expect(copy.landscape).toBe(true)
  })

  it('remaps row styles onto the copied column ids and copies the time style', () => {
    const source = createDocument('Ablauf')
    const columnId = source.columns[0].id
    setCellStyle(source.rows[0], columnId, { bold: true })
    source.timeStyle = { colour: '#a81f30' }

    const copy = duplicateDocument(source, 'Kopie')

    expect(copy.rows[0].styles).toEqual({ [copy.columns[0].id]: { bold: true } })
    expect(copy.timeStyle).toEqual({ colour: '#a81f30' })
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
