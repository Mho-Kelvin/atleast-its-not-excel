import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ScheduleTable from './ScheduleTable.svelte'
import { createDocument, createRow, findDurationColumn } from './document'
import { createList } from './lists'
import type { SelectList } from './types'

afterEach(() => {
  vi.restoreAllMocks()
})

function renderTable(lists: SelectList[] = []) {
  const plan = $state(createDocument('Ablauf'))
  render(ScheduleTable, { props: { plan, lists } })
  return plan
}

function headerNames(): string[] {
  return screen.getAllByTitle('Spalte bearbeiten').map((button) => button.textContent?.trim() ?? '')
}

async function openSettings(name: string): Promise<void> {
  const button = screen
    .getAllByTitle('Spalte bearbeiten')
    .find((it) => it.textContent?.trim() === name)
  if (!button) throw new Error(`no column header named ${name}`)
  await fireEvent.click(button)
}

/** Opens the panel, asks for the deletion and answers the confirmation. */
async function deleteColumn(name: string, confirmed: boolean): Promise<void> {
  await openSettings(name)
  await fireEvent.click(screen.getByRole('button', { name: 'Spalte löschen' }))

  const dialog = within(screen.getByRole('dialog'))
  const answer = confirmed ? 'Spalte löschen' : 'Abbrechen'
  await fireEvent.click(dialog.getByRole('button', { name: answer }))
}

async function dropdownColumn(values: string[]) {
  const list = createList('Räume')
  list.values = values
  const plan = renderTable([list])
  const column = plan.columns.find((it) => it.title === 'Verantwortlich')!
  column.type = 'select'
  column.listId = list.id
  await Promise.resolve()
  return plan
}

function selectCells(): HTMLSelectElement[] {
  return [
    ...document.querySelectorAll('td[data-column-type="select"] select'),
  ] as HTMLSelectElement[]
}

function selectCell(): HTMLSelectElement {
  return selectCells()[0]
}

function textCell(): HTMLTextAreaElement {
  return document.querySelector('td[data-column-type="select"] textarea') as HTMLTextAreaElement
}

describe('column headers', () => {
  it('adds an unnamed column at the end and opens its settings', async () => {
    const plan = renderTable()

    await fireEvent.click(screen.getByTitle('Spalte hinzufügen'))

    expect(plan.columns.at(-1)!.title).toBe('')
    expect(plan.columns.at(-1)!.type).toBe('text')
    expect(headerNames()).toEqual(['Uhrzeit', 'Programmpunkt', 'Verantwortlich', 'Spaltenname'])
    expect(screen.getByLabelText('Spaltenname')).toBeTruthy()
  })

  it('gives every row a cell for the new column', async () => {
    const plan = renderTable()

    await fireEvent.click(screen.getByTitle('Spalte hinzufügen'))

    const added = plan.columns.at(-1)!
    expect(plan.rows.every((row) => added.id in row.cells)).toBe(true)
  })

  it('renames the column as it is typed', async () => {
    const plan = renderTable()
    await fireEvent.click(screen.getByTitle('Spalte hinzufügen'))

    await fireEvent.input(screen.getByLabelText('Spaltenname'), { target: { value: 'Ort' } })

    expect(plan.columns.at(-1)!.title).toBe('Ort')
    expect(headerNames()).toEqual(['Uhrzeit', 'Programmpunkt', 'Verantwortlich', 'Ort'])
  })

  it('refuses a second duration column and says why', async () => {
    const plan = renderTable()
    await fireEvent.click(screen.getByTitle('Spalte hinzufügen'))

    const type = screen.getByLabelText('Typ') as HTMLSelectElement
    const duration = [...type.options].find((option) => option.value === 'duration')!
    expect(duration.disabled).toBe(true)
    expect(screen.getByText('Es kann nur eine Dauer-Spalte geben.')).toBeTruthy()
    expect(plan.columns.filter((column) => column.type === 'duration')).toHaveLength(1)
  })

  it('lets a column become a duration column once the first one is gone', async () => {
    const plan = renderTable()

    await deleteColumn('Uhrzeit', true)
    await openSettings('Programmpunkt')
    await fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'duration' } })

    expect(findDurationColumn(plan.columns)?.title).toBe('Programmpunkt')
  })

  it('offers the user lists once a column is a dropdown', async () => {
    const list = createList('Räume')
    const plan = renderTable([list])

    await openSettings('Verantwortlich')
    await fireEvent.change(screen.getByLabelText('Typ'), { target: { value: 'select' } })
    await fireEvent.change(screen.getByLabelText('Liste'), { target: { value: list.id } })

    expect(plan.columns.find((column) => column.title === 'Verantwortlich')?.listId).toBe(list.id)
  })

  it('turns a dropdown cell into a text box once the custom entry is picked', async () => {
    const plan = await dropdownColumn(['Saal', 'Foyer'])
    const column = plan.columns.find((it) => it.title === 'Verantwortlich')!
    const dropdown = selectCell()
    expect([...dropdown.options].map((option) => option.text)).toEqual([
      '',
      'Saal',
      'Foyer',
      'Eigener Wert …',
    ])

    await fireEvent.change(dropdown, { target: { value: '__custom__' } })
    await fireEvent.input(textCell(), { target: { value: 'Küche' } })

    expect(plan.rows[0].cells[column.id]).toBe('Küche')
    expect(selectCells()).toHaveLength(plan.rows.length - 1)
  })

  it('hands the dropdown back when the custom text is emptied', async () => {
    const plan = await dropdownColumn(['Saal'])

    await fireEvent.change(selectCell(), { target: { value: '__custom__' } })
    await fireEvent.input(textCell(), { target: { value: '' } })
    await fireEvent.blur(textCell())

    expect(selectCells()).toHaveLength(plan.rows.length)
  })

  it('shows a stored value that is no longer on the list as text', async () => {
    const plan = await dropdownColumn(['Saal'])
    const column = plan.columns.find((it) => it.title === 'Verantwortlich')!

    plan.rows[0].cells[column.id] = 'Küche'
    await Promise.resolve()

    expect(textCell().value).toBe('Küche')
  })

  it('deletes a column with its cells once confirmed', async () => {
    const plan = renderTable()
    const doomed = plan.columns.find((column) => column.title === 'Verantwortlich')!

    await deleteColumn('Verantwortlich', true)

    expect(headerNames()).toEqual(['Uhrzeit', 'Programmpunkt'])
    expect(plan.rows.every((row) => !(doomed.id in row.cells))).toBe(true)
  })

  it('keeps the column when the confirmation is declined', async () => {
    const plan = renderTable()

    await deleteColumn('Verantwortlich', false)

    expect(plan.columns).toHaveLength(3)
  })

  it('closes the settings on Escape', async () => {
    renderTable()
    await fireEvent.click(screen.getByTitle('Spalte hinzufügen'))
    expect(screen.queryByLabelText('Typ')).toBeTruthy()

    await fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByLabelText('Typ')).toBeNull()
  })

  it('renders the start-time column directly in front of the duration column', () => {
    const plan = renderTable()
    const headings = [...document.querySelectorAll('thead th')].map(
      (cell) => cell.textContent?.trim() ?? '',
    )

    expect(plan.columns[0].type).toBe('duration')
    expect(headings[1]).toContain('Uhrzeit')
    expect(headings[2]).toBe('Dauer')
  })
})

describe('rows', () => {
  it('deletes a row through its icon button, and offers none on the draft', async () => {
    const plan = renderTable()
    plan.rows[0].cells[plan.columns[1].id] = 'Einlass'
    plan.rows.push(createRow(plan.columns))
    await Promise.resolve()

    // Two rows, one of them the empty draft at the end.
    const buttons = screen.getAllByRole('button', { name: 'Zeile löschen' })
    expect(buttons).toHaveLength(1)

    await fireEvent.click(buttons[0])

    expect(plan.rows.some((row) => row.cells[plan.columns[1].id] === 'Einlass')).toBe(false)
  })

  it('tells the keyboard how to move a row or a column', () => {
    renderTable()

    const help = document.getElementById('drag-help')
    expect(help?.textContent).toContain('Pfeiltasten')

    for (const handle of screen.getAllByLabelText(/verschieben/)) {
      expect(handle.getAttribute('aria-describedby')).toBe('drag-help')
    }
  })
})

describe('the time group', () => {
  it('puts the controls on the start-time cell, not on the duration cell', () => {
    renderTable()

    expect(headerNames()).toEqual(['Uhrzeit', 'Programmpunkt', 'Verantwortlich'])
    expect(document.querySelectorAll('thead .drag-handle')).toHaveLength(3)
  })

  it('edits the duration column through the start-time settings', async () => {
    const plan = renderTable()

    await openSettings('Uhrzeit')

    expect((screen.getByLabelText('Name Dauer-Spalte') as HTMLInputElement).value).toBe('Dauer')
    await fireEvent.input(screen.getByLabelText('Name Dauer-Spalte'), {
      target: { value: 'Länge' },
    })
    expect(findDurationColumn(plan.columns)?.title).toBe('Länge')
    expect(headerNames()).toEqual(['Uhrzeit', 'Programmpunkt', 'Verantwortlich'])
  })

  it('renames the start-time cell without touching the duration column', async () => {
    const plan = renderTable()

    await openSettings('Uhrzeit')
    await fireEvent.input(screen.getByLabelText('Name Uhrzeit-Spalte'), {
      target: { value: 'Beginn' },
    })

    expect(plan.timeTitle).toBe('Beginn')
    expect(findDurationColumn(plan.columns)?.title).toBe('Dauer')
    expect(headerNames()).toEqual(['Beginn', 'Programmpunkt', 'Verantwortlich'])
  })

  it('deletes the pair together', async () => {
    const plan = renderTable()

    await deleteColumn('Uhrzeit', true)

    expect(findDurationColumn(plan.columns)).toBeUndefined()
    expect(document.querySelector('.time-column')).toBeNull()
    expect(headerNames()).toEqual(['Programmpunkt', 'Verantwortlich'])
  })

  it('draws a faint divider inside the group and a normal one around it', () => {
    renderTable()

    expect(document.querySelector('thead .time-column')?.classList).toContain('group-start')
    expect(document.querySelectorAll('.group-end')).toHaveLength(2)
  })
})

describe('print visibility', () => {
  it('prints every column until one is switched off', () => {
    const plan = renderTable()

    expect(plan.columns.every((column) => column.hideInPrint === undefined)).toBe(true)
    expect(plan.hideTimeInPrint).toBeUndefined()
    expect(document.querySelectorAll('.print-hidden')).toHaveLength(0)
  })

  it('marks the header and every cell of a column switched off', async () => {
    const plan = renderTable()

    await openSettings('Verantwortlich')
    await fireEvent.click(screen.getByLabelText('Spalte drucken'))

    const column = plan.columns.find((it) => it.title === 'Verantwortlich')!
    expect(column.hideInPrint).toBe(true)
    expect(document.querySelectorAll('tbody td.print-hidden')).toHaveLength(plan.rows.length)

    const heading = document.querySelector('thead th.print-hidden')
    expect(heading?.textContent).toContain('Verantwortlich')
    expect(heading?.querySelector('.print-mark')).toBeTruthy()
  })

  it('switches a column back on', async () => {
    const plan = renderTable()

    await openSettings('Verantwortlich')
    await fireEvent.click(screen.getByLabelText('Spalte drucken'))
    await fireEvent.click(screen.getByLabelText('Spalte drucken'))

    expect(plan.columns.find((it) => it.title === 'Verantwortlich')!.hideInPrint).toBe(false)
    expect(document.querySelectorAll('.print-hidden')).toHaveLength(0)
  })

  it('hides the start time without touching the duration column', async () => {
    const plan = renderTable()

    await openSettings('Uhrzeit')
    await fireEvent.click(screen.getByLabelText('Uhrzeit drucken'))

    expect(plan.hideTimeInPrint).toBe(true)
    expect(findDurationColumn(plan.columns)!.hideInPrint).toBeUndefined()
    expect(document.querySelector('thead .time-column')?.classList).toContain('print-hidden')
    expect(document.querySelector('thead .group-end')?.classList).not.toContain('print-hidden')
  })

  it('hides the duration column without touching the start time', async () => {
    const plan = renderTable()

    await openSettings('Uhrzeit')
    await fireEvent.click(screen.getByLabelText('Dauer drucken'))

    expect(findDurationColumn(plan.columns)!.hideInPrint).toBe(true)
    expect(plan.hideTimeInPrint).toBeUndefined()
    expect(document.querySelector('thead .time-column')?.classList).not.toContain('print-hidden')
    expect(document.querySelector('thead .group-end')?.classList).toContain('print-hidden')
  })

  it('offers a plain column one toggle, not the pair', async () => {
    renderTable()

    await openSettings('Programmpunkt')

    expect(screen.getByLabelText('Spalte drucken')).toBeTruthy()
    expect(screen.queryByLabelText('Uhrzeit drucken')).toBeNull()
    expect(screen.queryByLabelText('Dauer drucken')).toBeNull()
  })
})

describe('cell fields', () => {
  function fields(): HTMLTextAreaElement[] {
    return [...document.querySelectorAll('tbody textarea')] as HTMLTextAreaElement[]
  }

  it('edits every cell in the same growing box', async () => {
    const plan = renderTable()
    const editable = plan.columns.filter((column) => column.type !== 'select')

    expect(fields()).toHaveLength(plan.rows.length * editable.length)
    expect(document.querySelector('tbody input')).toBeNull()
  })

  it('mirrors the value into the wrapper that gives the box its height', async () => {
    renderTable()

    await fireEvent.input(fields()[0], { target: { value: 'Zwei\nZeilen' } })

    expect(fields()[0].closest('.field')?.getAttribute('data-value')).toBe('Zwei\nZeilen')
  })

  it('steps to the cell below on Enter and leaves Shift+Enter to the text', async () => {
    const plan = renderTable()
    plan.rows.push(createRow(plan.columns))
    await Promise.resolve()

    const perRow = plan.columns.filter((column) => column.type !== 'select').length
    const first = fields()[0]
    const below = fields()[perRow]
    first.focus()

    await fireEvent.keyDown(first, { key: 'Enter', shiftKey: true })
    expect(document.activeElement).toBe(first)

    await fireEvent.keyDown(first, { key: 'Enter' })
    expect(document.activeElement).toBe(below)
  })

  it('does nothing on Enter in the last row, where there is nothing below', async () => {
    renderTable()
    const last = fields().at(-1)!
    last.focus()

    await fireEvent.keyDown(last, { key: 'Enter' })

    expect(document.activeElement).toBe(last)
  })
})
