import { describe, expect, it } from 'vitest'
import { addColumn, createColumn, createDocument } from './document'
import { createList, createStartTime } from './lists'
import { emptyStore } from './storage'
import {
  backupEnvelope,
  documentEnvelope,
  fileName,
  importInto,
  listsEnvelope,
  templateEnvelope,
} from './transfer'
import type { ScheduleDocument, SelectList, Store } from './types'

function storeWith(lists: SelectList[] = []): Store {
  const store = emptyStore()
  store.lists = lists
  return store
}

/** A document whose one select column points at the given list. */
function documentUsing(title: string, list: SelectList): ScheduleDocument {
  const document = createDocument(title)
  const column = createColumn('Raum', 'select')
  column.listId = list.id
  addColumn(document, column)
  return document
}

describe('envelopes', () => {
  it('carries a single document and nothing else', () => {
    const raeume = createList('Räume')
    const envelope = documentEnvelope(documentUsing('Ablauf', raeume))

    expect(envelope.documents).toHaveLength(1)
    expect(envelope.templates).toEqual([])
    expect(envelope.lists).toEqual([])
    expect(envelope.startTimes).toEqual([])
  })

  it('carries the lists a template points at, and no others', () => {
    const raeume = createList('Räume')
    const unused = createList('Technik')
    const envelope = templateEnvelope(documentUsing('Vorlage', raeume), [raeume, unused])

    expect(envelope.templates).toHaveLength(1)
    expect(envelope.lists).toEqual([raeume])
  })

  it('carries every list and start time from the lists dialog', () => {
    const store = storeWith([createList('Räume')])
    store.startTimes = [createStartTime('09:00')]
    const envelope = listsEnvelope(store)

    expect(envelope.lists).toHaveLength(1)
    expect(envelope.startTimes).toHaveLength(1)
    expect(envelope.documents).toEqual([])
  })

  it('carries all four drawers in a backup', () => {
    const store = storeWith([createList('Räume')])
    store.documents = [createDocument('Ablauf')]
    store.templates = [createDocument('Vorlage')]
    store.startTimes = [createStartTime('09:00')]
    const envelope = backupEnvelope(store)

    expect(envelope.documents).toHaveLength(1)
    expect(envelope.templates).toHaveLength(1)
    expect(envelope.lists).toHaveLength(1)
    expect(envelope.startTimes).toHaveLength(1)
  })
})

describe('fileName', () => {
  const on = new Date('2026-08-28T12:00:00Z')

  it('uses the title and the date', () => {
    expect(fileName('Sommerfest 2026', on)).toBe('Sommerfest-2026-2026-08-28.json')
  })

  it('keeps umlauts and drops what a filesystem would not take', () => {
    expect(fileName('Ablauf/Übergabe: 1', on)).toBe('Ablauf-Übergabe-1-2026-08-28.json')
  })

  it('falls back when the title is blank', () => {
    expect(fileName('   ', on)).toBe('Ohne-Titel-2026-08-28.json')
  })
})

describe('importInto', () => {
  it('refuses text that is not JSON', () => {
    const store = emptyStore()
    expect(importInto(store, 'nope')).toEqual({ ok: false })
    expect(store.documents).toEqual([])
  })

  it('refuses a file from somewhere else', () => {
    const store = emptyStore()
    expect(importInto(store, JSON.stringify({ documents: [createDocument('Ablauf')] }))).toEqual({
      ok: false,
    })
    expect(store.documents).toEqual([])
  })

  it('merges a document into a store that already has one', () => {
    const store = emptyStore()
    store.documents = [createDocument('Vorhanden')]
    const result = importInto(store, JSON.stringify(documentEnvelope(createDocument('Neu'))))

    expect(result).toEqual({
      ok: true,
      counts: { documents: 1, templates: 0, lists: 0, startTimes: 0 },
    })
    expect(store.documents.map((entry) => entry.title)).toEqual(['Vorhanden', 'Neu'])
  })

  it('keeps the stored updatedAt', () => {
    const store = emptyStore()
    const source = createDocument('Alt')
    source.updatedAt = 1000
    importInto(store, JSON.stringify(documentEnvelope(source)))

    expect(store.documents[0].updatedAt).toBe(1000)
  })

  it('gives a colliding document a fresh id rather than replacing it', () => {
    const store = emptyStore()
    const source = createDocument('Ablauf')
    store.documents = [source]
    importInto(store, JSON.stringify(documentEnvelope(source)))

    expect(store.documents).toHaveLength(2)
    expect(store.documents[1].id).not.toBe(source.id)
  })

  it('skips a list it already holds, so the columns keep pointing at it', () => {
    const raeume = createList('Räume')
    const store = storeWith([raeume])
    const template = documentUsing('Vorlage', raeume)
    const result = importInto(store, JSON.stringify(templateEnvelope(template, [raeume])))

    expect(result).toEqual({
      ok: true,
      counts: { documents: 0, templates: 1, lists: 0, startTimes: 0 },
    })
    expect(store.lists).toHaveLength(1)
    expect(store.templates[0].columns.at(-1)?.listId).toBe(raeume.id)
  })

  it('clears a list id nothing points at any more', () => {
    const raeume = createList('Räume')
    const store = emptyStore()
    importInto(store, JSON.stringify(documentEnvelope(documentUsing('Ablauf', raeume))))

    expect(store.lists).toEqual([])
    expect(store.documents[0].columns.at(-1)?.listId).toBeUndefined()
  })

  it('drops a broken entry and imports the rest', () => {
    const store = emptyStore()
    const envelope = documentEnvelope(createDocument('Gut'))
    envelope.documents.push({ id: 'kaputt' } as unknown as ScheduleDocument)
    const result = importInto(store, JSON.stringify(envelope))

    expect(result).toEqual({
      ok: true,
      counts: { documents: 1, templates: 0, lists: 0, startTimes: 0 },
    })
    expect(store.documents.map((entry) => entry.title)).toEqual(['Gut'])
  })

  it('rewrites the retired longText type on the way in', () => {
    const store = emptyStore()
    const document = createDocument('Ablauf')
    document.columns[1].type = 'longText' as never
    importInto(store, JSON.stringify(documentEnvelope(document)))

    expect(store.documents[0].columns[1].type).toBe('text')
  })

  it('leaves the draft start time out', () => {
    const store = emptyStore()
    const source = storeWith()
    source.startTimes = [createStartTime('09:00'), createStartTime()]
    const result = importInto(store, JSON.stringify(listsEnvelope(source)))

    expect(result.ok && result.counts.startTimes).toBe(1)
    expect(store.startTimes).toHaveLength(1)
  })
})
