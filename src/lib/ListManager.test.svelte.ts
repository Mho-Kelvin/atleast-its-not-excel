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

    await fireEvent.input(field, { target: { value: 'Saal' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Wert hinzufügen' }))

    await fireEvent.input(screen.getByLabelText('Wert hinzufügen: Räume'), {
      target: { value: 'Saal' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Wert hinzufügen' }))

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

  it('goes back when asked', async () => {
    const { onback } = renderManager()

    await fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))

    expect(onback).toHaveBeenCalledOnce()
  })
})
