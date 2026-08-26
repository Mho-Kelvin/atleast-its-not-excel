import { describe, expect, it } from 'vitest'
import { createColumn, createDocument } from './document'
import {
  createList,
  createStartTime,
  ensureListDrafts,
  isDuplicateStartTime,
  isDuplicateValue,
  isStartTimeMissing,
  listValues,
  removeList,
  startTimeOptions,
} from './lists'
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

  it('clears the list off a template too, not just the documents', () => {
    const store = emptyStore()
    const list = createList('Räume')
    store.lists.push(list)

    const template = createDocument('Vorlage')
    const column = createColumn('Ort', 'select')
    column.listId = list.id
    template.columns.push(column)
    store.templates.push(template)

    removeList(store, list.id)

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
  it('returns the values of the named list, alphabetically', () => {
    const list = createList('Räume')
    list.values.push('Saal', 'Foyer')
    expect(listValues([list], list.id)).toEqual(['Foyer', 'Saal'])
  })

  it('leaves the draft and any emptied entry out', () => {
    const list = createList('Räume')
    list.values.push('Saal', '', '')
    expect(listValues([list], list.id)).toEqual(['Saal'])
  })

  it('returns nothing for an unknown or missing list', () => {
    expect(listValues([], 'gone')).toEqual([])
    expect(listValues([], undefined)).toEqual([])
  })
})

describe('ensureListDrafts', () => {
  it('offers an empty entry in every list and in the start times', () => {
    const store = emptyStore()
    store.lists.push(createList('Räume'))

    ensureListDrafts(store)

    expect(store.lists[0].values).toEqual([''])
    expect(store.startTimes).toEqual([{ id: expect.any(String), time: '', name: '' }])
  })

  it('adds nothing while the last entry is still empty', () => {
    const store = emptyStore()
    store.lists.push(createList('Räume'))

    ensureListDrafts(store)
    ensureListDrafts(store)
    ensureListDrafts(store)

    expect(store.lists[0].values).toEqual([''])
    expect(store.startTimes).toHaveLength(1)
  })

  it('puts a fresh draft below the one that was filled in', () => {
    const store = emptyStore()
    store.lists.push(createList('Räume'))
    ensureListDrafts(store)
    store.lists[0].values[0] = 'Saal'
    store.startTimes[0].time = '09:00'

    ensureListDrafts(store)

    expect(store.lists[0].values).toEqual(['Saal', ''])
    expect(store.startTimes).toHaveLength(2)
    expect(store.startTimes[1].time).toBe('')
  })

  it('counts a start time holding only a name as filled in', () => {
    const store = emptyStore()
    ensureListDrafts(store)
    store.startTimes[0].name = 'Empfang'

    ensureListDrafts(store)

    expect(store.startTimes).toHaveLength(2)
  })

  it('leaves an entry emptied in the middle alone', () => {
    const store = emptyStore()
    const list = createList('Räume')
    list.values.push('', 'Foyer', '')
    store.lists.push(list)

    ensureListDrafts(store)

    expect(list.values).toEqual(['', 'Foyer', ''])
  })
})

describe('isDuplicateValue', () => {
  it('flags both entries holding the same value', () => {
    const values = ['Saal', 'Foyer', 'Saal']
    expect(isDuplicateValue(values, 0)).toBe(true)
    expect(isDuplicateValue(values, 2)).toBe(true)
    expect(isDuplicateValue(values, 1)).toBe(false)
  })

  it('never flags an empty entry', () => {
    expect(isDuplicateValue(['', 'Saal', ''], 0)).toBe(false)
  })
})

describe('isStartTimeMissing', () => {
  it('flags a named entry that carries no time', () => {
    expect(isStartTimeMissing(createStartTime('', 'Empfang'))).toBe(true)
  })

  it('leaves the draft and a complete entry alone', () => {
    expect(isStartTimeMissing(createStartTime(''))).toBe(false)
    expect(isStartTimeMissing(createStartTime('09:00', 'Empfang'))).toBe(false)
  })
})

describe('isDuplicateStartTime', () => {
  it('flags a repeated time only when the name matches too', () => {
    const named = [createStartTime('09:00', 'Empfang'), createStartTime('09:00', 'Beginn')]
    expect(isDuplicateStartTime(named, 0)).toBe(false)

    const same = [createStartTime('09:00', 'Empfang'), createStartTime('09:00', 'Empfang')]
    expect(isDuplicateStartTime(same, 0)).toBe(true)
    expect(isDuplicateStartTime(same, 1)).toBe(true)
  })

  it('treats two bare times as the same entry', () => {
    const entries = [createStartTime('09:00'), createStartTime('09:00')]
    expect(isDuplicateStartTime(entries, 1)).toBe(true)
  })

  it('never flags the draft', () => {
    const entries = [createStartTime(''), createStartTime('')]
    expect(isDuplicateStartTime(entries, 0)).toBe(false)
  })
})

describe('startTimeOptions', () => {
  it('sorts named entries by name and puts the bare times last', () => {
    const entries = [
      createStartTime('07:30'),
      createStartTime('12:00', 'Mittag'),
      createStartTime('06:00'),
      createStartTime('18:00', 'Abschluss'),
    ]

    expect(startTimeOptions(entries).map((entry) => entry.time)).toEqual([
      '18:00',
      '12:00',
      '06:00',
      '07:30',
    ])
  })

  it('drops entries without a time', () => {
    const entries = [
      createStartTime(''),
      createStartTime('', 'Angefangen'),
      createStartTime('09:00'),
    ]

    expect(startTimeOptions(entries)).toHaveLength(1)
  })

  it('leaves the entries it was given alone', () => {
    const entries = [createStartTime('12:00'), createStartTime('06:00')]

    startTimeOptions(entries)

    expect(entries.map((entry) => entry.time)).toEqual(['12:00', '06:00'])
  })
})
