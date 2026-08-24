import { describe, expect, it } from 'vitest'
import { createColumn, createDocument } from './document'
import { createList, listValues, removeList } from './lists'
import { emptyStore } from './storage'

describe('removeList', () => {
  it('clears the list off every column that used it', () => {
    const store = emptyStore()
    const list = createList('Räume')
    store.lists.push(list)

    const document = createDocument('Ablauf')
    const column = createColumn('Ort', 'select')
    column.listId = list.id
    document.columns.push(column)
    store.documents.push(document)

    removeList(store, list.id)

    expect(store.lists).toHaveLength(0)
    expect(column.listId).toBeUndefined()
  })

  it('leaves columns pointing at other lists alone', () => {
    const store = emptyStore()
    const kept = createList('Räume')
    const removed = createList('Personen')
    store.lists.push(kept, removed)

    const document = createDocument('Ablauf')
    const column = createColumn('Ort', 'select')
    column.listId = kept.id
    document.columns.push(column)
    store.documents.push(document)

    removeList(store, removed.id)

    expect(column.listId).toBe(kept.id)
  })
})

describe('listValues', () => {
  it('returns the values of the named list', () => {
    const list = createList('Räume')
    list.values.push('Saal')
    expect(listValues([list], list.id)).toEqual(['Saal'])
  })

  it('returns nothing for an unknown or missing list', () => {
    expect(listValues([], 'gone')).toEqual([])
    expect(listValues([], undefined)).toEqual([])
  })
})
