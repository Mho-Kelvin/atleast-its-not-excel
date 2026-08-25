import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ListManager from './ListManager.svelte'
import { createColumn, createDocument } from './document'
import { createList, createStartTime } from './lists'
import { emptyStore } from './storage'
import type { Store } from './types'

afterEach(() => {
  vi.restoreAllMocks()
})

function renderManager(initial: Store = emptyStore()) {
  const store = $state(initial)
  const onclose = vi.fn()
  render(ListManager, { props: { store, open: true, onclose } })
  return { store, onclose }
}

/** The last one is the draft, which is where a new entry is typed. */
function valueFields(listName = 'Räume'): HTMLInputElement[] {
  return screen.getAllByLabelText(`Wert: ${listName}`) as HTMLInputElement[]
}

function timeFields(): HTMLInputElement[] {
  return screen.getAllByLabelText('Uhrzeit') as HTMLInputElement[]
}

function nameFields(): HTMLInputElement[] {
  return screen.getAllByLabelText('Bezeichnung (optional)') as HTMLInputElement[]
}

function storeWithList(name = 'Räume') {
  const store = emptyStore()
  store.lists.push(createList(name))
  return store
}

describe('ListManager', () => {
  it('says so when there are no lists', () => {
    renderManager()
    expect(screen.getByText('Noch keine Listen.')).toBeTruthy()
  })

  it('creates a named list and clears the field', async () => {
    const { store } = renderManager()

    await fireEvent.input(screen.getByLabelText('Name der Liste'), {
      target: { value: 'Räume' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Neue Liste' }))

    expect(store.lists.map((list) => list.name)).toEqual(['Räume'])
  })

  it('ignores an empty list name', async () => {
    const { store } = renderManager()

    await fireEvent.click(screen.getByRole('button', { name: 'Neue Liste' }))

    expect(store.lists).toHaveLength(0)
  })

  it('turns the draft into a value and offers a fresh draft below it', async () => {
    const { store } = renderManager(storeWithList())
    expect(valueFields()).toHaveLength(1)

    await fireEvent.input(valueFields()[0], { target: { value: 'Saal' } })

    expect(store.lists[0].values).toEqual(['Saal', ''])
    expect(valueFields()).toHaveLength(2)
  })

  it('edits a value in place instead of removing and adding it', async () => {
    const initial = storeWithList()
    initial.lists[0].values.push('Sal')
    const { store } = renderManager(initial)

    await fireEvent.input(valueFields()[0], { target: { value: 'Saal' } })

    expect(store.lists[0].values[0]).toBe('Saal')
  })

  it('flags a value that already appears in the same list', async () => {
    const initial = storeWithList()
    initial.lists[0].values.push('Saal', 'Foyer')
    renderManager(initial)

    await fireEvent.input(valueFields()[1], { target: { value: 'Saal' } })

    const flagged = valueFields().filter((field) => field.getAttribute('aria-invalid') === 'true')
    expect(flagged.map((field) => field.value)).toEqual(['Saal', 'Saal'])
  })

  it('offers no delete on the draft, only on the entries above it', () => {
    const initial = storeWithList()
    initial.lists[0].values.push('Saal', 'Foyer')
    renderManager(initial)

    // Three value fields, two of them real, plus the start-time draft above.
    expect(valueFields()).toHaveLength(3)
    expect(screen.getAllByRole('button', { name: 'Wert löschen' })).toHaveLength(2)
  })

  it('removes a single value', async () => {
    const initial = storeWithList()
    initial.lists[0].values.push('Saal', 'Foyer')
    const { store } = renderManager(initial)

    await fireEvent.click(screen.getAllByRole('button', { name: 'Wert löschen' })[0])

    expect(store.lists[0].values).toEqual(['Foyer', ''])
  })

  it('keeps an entry emptied in the middle, out of sight of the dropdowns', async () => {
    const initial = storeWithList()
    initial.lists[0].values.push('Saal', 'Foyer')
    const { store } = renderManager(initial)

    await fireEvent.input(valueFields()[0], { target: { value: '' } })

    expect(store.lists[0].values).toEqual(['', 'Foyer', ''])
  })

  it('deletes a list only after the confirmation, and frees the columns using it', async () => {
    const initial = storeWithList()
    const plan = createDocument('Ablauf')
    const column = createColumn('Ort', 'select')
    column.listId = initial.lists[0].id
    plan.columns.push(column)
    initial.documents.push(plan)

    const { store } = renderManager(initial)

    // The lists dialog is a dialog of its own, so the confirmation is picked out
    // by the question it asks, and looked up again on every open.
    const confirmation = () =>
      within(screen.getByRole('dialog', { name: /verlieren ihre Auswahl/ }))

    await fireEvent.click(screen.getByRole('button', { name: 'Liste löschen' }))
    await fireEvent.click(confirmation().getByRole('button', { name: 'Abbrechen' }))
    expect(store.lists).toHaveLength(1)

    await fireEvent.click(screen.getByRole('button', { name: 'Liste löschen' }))
    await fireEvent.click(confirmation().getByRole('button', { name: 'Liste löschen' }))
    expect(store.lists).toHaveLength(0)

    const freed = store.documents[0].columns.find((entry) => entry.title === 'Ort')!
    expect(freed.listId).toBeUndefined()
  })

  it('edits a start time and its name in place', async () => {
    const initial = emptyStore()
    initial.startTimes.push(createStartTime('08:30', 'Empfang'))
    const { store } = renderManager(initial)

    await fireEvent.input(timeFields()[0], { target: { value: '09:15' } })
    await fireEvent.input(nameFields()[0], { target: { value: 'Ankunft' } })

    expect(store.startTimes[0]).toMatchObject({ time: '09:15', name: 'Ankunft' })
  })

  it('makes the start-time draft real once either field is filled in', async () => {
    const { store } = renderManager()
    expect(timeFields()).toHaveLength(1)

    await fireEvent.input(nameFields()[0], { target: { value: 'Empfang' } })

    expect(store.startTimes).toHaveLength(2)
    expect(timeFields()).toHaveLength(2)
  })

  it('flags a repeated time only when the name matches too', async () => {
    const initial = emptyStore()
    initial.startTimes.push(createStartTime('09:00', 'Empfang'), createStartTime('09:00', 'Beginn'))
    renderManager(initial)

    const flagged = () => timeFields().filter((it) => it.getAttribute('aria-invalid') === 'true')
    expect(flagged()).toHaveLength(0)

    await fireEvent.input(nameFields()[1], { target: { value: 'Empfang' } })

    expect(flagged()).toHaveLength(2)
  })

  it('flags a start time that was named but never given a time', async () => {
    renderManager()

    await fireEvent.input(nameFields()[0], { target: { value: 'Empfang' } })

    const flagged = timeFields().filter((it) => it.getAttribute('aria-invalid') === 'true')
    expect(flagged).toHaveLength(1)
    expect(flagged[0].title).toBe('Ohne Uhrzeit')
  })

  it('takes times only, and never offers to delete the start time list', () => {
    renderManager()

    expect(timeFields()[0].type).toBe('time')
    expect(screen.queryByRole('button', { name: 'Liste löschen' })).toBeNull()
  })

  it('removes a single start time', async () => {
    const initial = emptyStore()
    initial.startTimes.push(createStartTime('08:30'), createStartTime('10:00'))
    const { store } = renderManager(initial)

    await fireEvent.click(screen.getAllByRole('button', { name: 'Wert löschen' })[0])

    expect(store.startTimes.map((entry) => entry.time)).toEqual(['10:00', ''])
  })

  it('closes when asked', async () => {
    const { onclose } = renderManager()

    await fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))

    expect(onclose).toHaveBeenCalledOnce()
  })

  it('closes on a click outside the box', async () => {
    const { onclose } = renderManager()

    // The backdrop is part of the dialog element, so the click lands on it.
    await fireEvent.click(screen.getByRole('dialog'), { clientX: -20, clientY: -20 })

    expect(onclose).toHaveBeenCalledOnce()
  })

  it('stays open for a click on the box itself', async () => {
    const { onclose } = renderManager()

    await fireEvent.click(screen.getByRole('dialog'), { clientX: 0, clientY: 0 })
    await fireEvent.click(screen.getByLabelText('Name der Liste'))

    expect(onclose).not.toHaveBeenCalled()
  })

  it('stays shut until it is opened', () => {
    const store = $state(emptyStore())
    render(ListManager, { props: { store, open: false, onclose: vi.fn() } })

    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
