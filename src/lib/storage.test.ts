import { beforeEach, describe, expect, it } from 'vitest'
import { createDocument } from './document'
import { emptyStore, loadStore, saveStore } from './storage'

const STORAGE_KEY = 'tobias-tool/v1'
const BROKEN_KEY = 'tobias-tool/v1-broken'

beforeEach(() => {
  localStorage.clear()
})

describe('loadStore', () => {
  it('starts empty when nothing has been saved', () => {
    expect(loadStore()).toEqual(emptyStore())
  })

  it('reads back what was saved', () => {
    const store = emptyStore()
    store.documents.push(createDocument('Ablauf'))
    store.lists.push({ id: 'l1', name: 'Räume', values: ['Saal', 'Foyer'] })
    saveStore(store)

    expect(loadStore()).toEqual(store)
  })

  it('keeps unreadable data under a second key instead of dropping it', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')

    expect(loadStore()).toEqual(emptyStore())
    expect(localStorage.getItem(BROKEN_KEY)).toBe('{not json')
  })

  it('rejects data of the wrong shape', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents: 'nope', lists: [] }))

    expect(loadStore()).toEqual(emptyStore())
    expect(localStorage.getItem(BROKEN_KEY)).not.toBeNull()
  })

  it('gives a store written before the start times an empty list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents: [], lists: [] }))

    expect(loadStore().startTimes).toEqual([])
  })

  it('reads start times written as bare strings', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ documents: [], lists: [], startTimes: ['08:30'] }),
    )

    expect(loadStore().startTimes).toEqual([{ time: '08:30' }])
  })

  it('reads a column stored as the removed longText type as text', () => {
    const document = createDocument('Ablauf')
    ;(document.columns[1] as { type: string }).type = 'longText'
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents: [document], lists: [] }))

    expect(loadStore().documents[0].columns[1].type).toBe('text')
  })

  it('rejects a document that is missing fields', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents: [{ id: 'a' }], lists: [] }))

    expect(loadStore()).toEqual(emptyStore())
  })
})

describe('saveStore', () => {
  it('reports success', () => {
    expect(saveStore(emptyStore())).toBe(true)
  })
})
