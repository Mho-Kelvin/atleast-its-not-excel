import { fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ListManager from './ListManager.svelte'
import { createColumn, createDocument } from './document'
import { createList } from './lists'
import { emptyStore } from './storage'
import type { Store } from './types'

afterEach(() => {
  vi.restoreAllMocks()
})

function renderManager(initial: Store = emptyStore()) {
  const store = $state(initial)
  const onback = vi.fn()
  render(ListManager, { props: { store, onback } })
  return { store, onback }
}

async function addStartTime(time: string, name: string): Promise<void> {
  await fireEvent.input(screen.getByLabelText('Bezeichnung (optional)'), { target: { value: name } })
  await fireEvent.input(screen.getByLabelText('Wert hinzufügen: Startzeiten'), {
    target: { value: time },
  })
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

  it('adds values and refuses a duplicate', async () => {
    const { store } = renderManager(storeWithList())
    const field = screen.getByLabelText('Wert hinzufügen: Räume')
    // The start times carry an add button of their own, and come first.
    const addButton = screen.getAllByRole('button', { name: 'Wert hinzufügen' })[1]

    await fireEvent.input(field, { target: { value: 'Saal' } })
    await fireEvent.click(addButton)

    await fireEvent.input(screen.getByLabelText('Wert hinzufügen: Räume'), {
      target: { value: 'Saal' },
    })
    await fireEvent.click(addButton)

    expect(store.lists[0].values).toEqual(['Saal'])
  })

  it('removes a single value', async () => {
    const initial = storeWithList()
    initial.lists[0].values.push('Saal', 'Foyer')
    const { store } = renderManager(initial)

    await fireEvent.click(screen.getAllByRole('button', { name: 'Wert löschen' })[0])

    expect(store.lists[0].values).toEqual(['Foyer'])
  })

  it('deletes a list only after the confirmation, and frees the columns using it', async () => {
    const initial = storeWithList()
    const plan = createDocument('Ablauf')
    const column = createColumn('Ort', 'select')
    column.listId = initial.lists[0].id
    plan.columns.push(column)
    initial.documents.push(plan)

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { store } = renderManager(initial)

    await fireEvent.click(screen.getByRole('button', { name: 'Liste löschen' }))
    expect(store.lists).toHaveLength(1)

    confirm.mockReturnValue(true)
    await fireEvent.click(screen.getByRole('button', { name: 'Liste löschen' }))
    expect(store.lists).toHaveLength(0)

    const freed = store.documents[0].columns.find((entry) => entry.title === 'Ort')!
    expect(freed.listId).toBeUndefined()
  })

  it('keeps the start times sorted and refuses a duplicate time', async () => {
    const { store } = renderManager()
    const addButton = screen.getAllByRole('button', { name: 'Wert hinzufügen' })[0]

    await addStartTime('10:00', 'Mittag')
    await fireEvent.click(addButton)
    await addStartTime('08:30', '')
    await fireEvent.click(addButton)
    await addStartTime('10:00', 'Nochmal')
    await fireEvent.click(addButton)

    expect(store.startTimes).toEqual([{ time: '08:30' }, { time: '10:00', name: 'Mittag' }])
  })

  it('shows a named start time with the time in brackets', async () => {
    const initial = emptyStore()
    initial.startTimes.push({ time: '08:30' }, { time: '10:00', name: 'Mittag' })
    renderManager(initial)

    expect(screen.getByText('08:30')).toBeTruthy()
    expect(screen.getByText('Mittag (10:00)')).toBeTruthy()
  })

  it('takes times only, and never offers to delete the start time list', () => {
    renderManager()

    expect(screen.getByLabelText('Wert hinzufügen: Startzeiten').getAttribute('type')).toBe('time')
    expect(screen.queryByRole('button', { name: 'Liste löschen' })).toBeNull()
  })

  it('removes a single start time', async () => {
    const initial = emptyStore()
    initial.startTimes.push({ time: '08:30' }, { time: '10:00' })
    const { store } = renderManager(initial)

    await fireEvent.click(screen.getAllByRole('button', { name: 'Wert löschen' })[0])

    expect(store.startTimes).toEqual([{ time: '10:00' }])
  })

  it('goes back when asked', async () => {
    const { onback } = renderManager()

    await fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))

    expect(onback).toHaveBeenCalledOnce()
  })
})
