import { beforeEach, describe, expect, it } from 'vitest'
import { createDocument } from './document'
import { emptyStore, loadStore, saveStore } from './storage'

const STORAGE_KEY = 'atleast-its-not-excel/v1'
const BROKEN_KEY = 'atleast-its-not-excel/v1-broken'
const LEGACY_STORAGE_KEY = 'tobias-tool/v1'

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

  it('reads a store left under the key the app used before it was renamed', () => {
    const store = emptyStore()
    store.documents.push(createDocument('Ablauf'))
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(store))

    expect(loadStore()).toEqual(store)
  })

  it('prefers the current key over the old one', () => {
    const current = emptyStore()
    current.documents.push(createDocument('Neu'))
    const legacy = emptyStore()
    legacy.documents.push(createDocument('Alt'))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy))

    expect(loadStore()).toEqual(current)
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

    expect(loadStore().startTimes).toEqual([{ id: expect.any(String), time: '08:30', name: '' }])
  })

  it('gives a start time stored without an id one of its own', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        documents: [],
        lists: [],
        startTimes: [{ time: '08:30', name: 'Empfang' }],
      }),
    )

    const [entry] = loadStore().startTimes
    expect(entry).toEqual({ id: expect.any(String), time: '08:30', name: 'Empfang' })
  })

  it('leaves an id that is already stored alone', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ documents: [], lists: [], startTimes: [{ id: 'kept', time: '08:30' }] }),
    )

    expect(loadStore().startTimes[0].id).toBe('kept')
  })

  it('reads a column stored as the removed longText type as text', () => {
    const document = createDocument('Ablauf')
    ;(document.columns[1] as { type: string }).type = 'longText'
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents: [document], lists: [] }))

    expect(loadStore().documents[0].columns[1].type).toBe('text')
  })

  it('gives a store written before the templates an empty list', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents: [], lists: [] }))

    expect(loadStore().templates).toEqual([])
  })

  it('drops a broken template without binning the documents beside it', () => {
    const document = createDocument('Ablauf')
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ documents: [document], templates: [{ id: 'a' }], lists: [] }),
    )

    const store = loadStore()
    expect(store.templates).toEqual([])
    expect(store.documents).toHaveLength(1)
  })

  it('reads a template column stored as the removed longText type as text', () => {
    const template = createDocument('Vorlage')
    ;(template.columns[1] as { type: string }).type = 'longText'
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ documents: [], templates: [template], lists: [] }),
    )

    expect(loadStore().templates[0].columns[1].type).toBe('text')
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
