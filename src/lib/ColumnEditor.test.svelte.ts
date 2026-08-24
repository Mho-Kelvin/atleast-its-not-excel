import { fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ColumnEditor from './ColumnEditor.svelte'
import { createDocument, findDurationColumn } from './document'
import { createList } from './lists'

afterEach(() => {
  vi.restoreAllMocks()
})

function renderEditor(lists = [createList('Räume')]) {
  const plan = $state(createDocument('Ablauf'))
  render(ColumnEditor, { props: { plan, lists } })
  return plan
}

/** The add form is the last title field on the page; the others belong to existing columns. */
function addForm() {
  const titleInputs = screen.getAllByLabelText('Spaltenname')
  const typeSelects = screen.getAllByLabelText('Typ')
  return {
    title: titleInputs[titleInputs.length - 1],
    type: typeSelects[typeSelects.length - 1] as HTMLSelectElement,
    button: screen.getByRole('button', { name: 'Spalte hinzufügen' }),
  }
}

describe('ColumnEditor', () => {
  it('adds a named column and clears the form', async () => {
    const plan = renderEditor()
    const form = addForm()

    await fireEvent.input(form.title, { target: { value: 'Ort' } })
    await fireEvent.click(form.button)

    const added = plan.columns[plan.columns.length - 1]
    expect(added.title).toBe('Ort')
    expect(plan.rows[0].cells[added.id]).toBe('')
    expect((addForm().title as HTMLInputElement).value).toBe('')
  })

  it('ignores an empty column name', async () => {
    const plan = renderEditor()
    const before = plan.columns.length

    await fireEvent.click(addForm().button)

    expect(plan.columns).toHaveLength(before)
  })

  it('refuses a second duration column in the add form', () => {
    renderEditor()
    const durationOption = [...addForm().type.options].find(
      (option) => option.value === 'duration',
    )!

    expect(durationOption.disabled).toBe(true)
    expect(screen.getByText('Es kann nur eine Dauer-Spalte geben.')).toBeTruthy()
  })

  it('lets the existing duration column keep its own type', () => {
    const plan = renderEditor()
    const durationIndex = plan.columns.findIndex((column) => column.type === 'duration')
    const durationSelect = screen.getAllByLabelText('Typ')[durationIndex] as HTMLSelectElement
    const ownOption = [...durationSelect.options].find((option) => option.value === 'duration')!

    expect(ownOption.disabled).toBe(false)
  })

  it('renames a column through its title field', async () => {
    const plan = renderEditor()

    await fireEvent.input(screen.getAllByLabelText('Spaltenname')[0], {
      target: { value: 'Zeitraum' },
    })

    expect(plan.columns[0].title).toBe('Zeitraum')
  })

  it('moves a column with the arrow buttons', async () => {
    const plan = renderEditor()
    const second = plan.columns[1].id

    await fireEvent.click(screen.getAllByTitle('Spalte nach vorn')[1])

    expect(plan.columns[0].id).toBe(second)
  })

  it('cannot move the first column further forward', () => {
    renderEditor()
    expect((screen.getAllByTitle('Spalte nach vorn')[0] as HTMLButtonElement).disabled).toBe(true)
  })

  it('removes a column only after the confirmation is accepted', async () => {
    const plan = renderEditor()
    const durationId = findDurationColumn(plan.columns)!.id
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)

    await fireEvent.click(screen.getAllByRole('button', { name: 'Spalte löschen' })[0])
    expect(findDurationColumn(plan.columns)).toBeDefined()

    confirm.mockReturnValue(true)
    await fireEvent.click(screen.getAllByRole('button', { name: 'Spalte löschen' })[0])
    expect(plan.columns.some((column) => column.id === durationId)).toBe(false)
    expect(durationId in plan.rows[0].cells).toBe(false)
  })

  it('offers the lists only on a select column and clears the choice when the type changes', async () => {
    const list = createList('Räume')
    const plan = renderEditor([list])

    expect(screen.queryByLabelText('Liste')).toBeNull()

    const typeSelect = screen.getAllByLabelText('Typ')[1]
    await fireEvent.change(typeSelect, { target: { value: 'select' } })

    await fireEvent.change(screen.getByLabelText('Liste'), { target: { value: list.id } })
    expect(plan.columns[1].listId).toBe(list.id)

    await fireEvent.change(typeSelect, { target: { value: 'text' } })
    expect(plan.columns[1].listId).toBeUndefined()
  })
})
