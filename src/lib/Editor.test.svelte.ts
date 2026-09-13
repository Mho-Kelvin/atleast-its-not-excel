import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import Editor from './Editor.svelte'
import { createDocument } from './document'

/**
 * `plan` is bound through a getter/setter pair, not passed as a plain value:
 * undo and redo replace the whole document, and only the accessor pair
 * carries that reassignment back out to the test.
 */
function renderEditor(isTemplate = false) {
  let plan = $state(createDocument('Ablauf'))
  render(Editor, {
    props: {
      get plan() {
        return plan
      },
      set plan(value: typeof plan) {
        plan = value
      },
      lists: [],
      startTimes: [],
      isTemplate,
      onback: () => {},
      onsaveastemplate,
    },
  })
  return () => plan
}

function textCell(plan: ReturnType<typeof createDocument>): HTMLTextAreaElement {
  const row = plan.rows[0]
  const column = plan.columns.find((entry) => entry.type === 'text')!
  const cell = document.querySelector(`td[data-row-id="${row.id}"][data-column-id="${column.id}"]`)!
  return cell.querySelector('textarea') as HTMLTextAreaElement
}

const onsaveastemplate = vi.fn()

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

describe('the Beginn line', () => {
  it('is dropped from print once its checkbox is cleared', async () => {
    const getPlan = renderEditor()
    const printIt = screen.getByLabelText('Beginn drucken') as HTMLInputElement
    expect(printIt.checked).toBe(true)
    expect(document.querySelector('p.start')?.classList).not.toContain('print-hidden')

    await fireEvent.click(printIt)
    expect(getPlan().hideStartTimeInPrint).toBe(true)
    expect(document.querySelector('p.start')?.classList).toContain('print-hidden')

    await fireEvent.click(printIt)
    expect(getPlan().hideStartTimeInPrint).toBe(false)
    expect(document.querySelector('p.start')?.classList).not.toContain('print-hidden')
  })
})

describe('the Querformat checkbox', () => {
  it('flips the document and the page style between portrait and landscape', async () => {
    const getPlan = renderEditor()
    const landscape = screen.getByLabelText('Querformat') as HTMLInputElement
    expect(landscape.checked).toBe(false)
    expect(document.head.textContent).not.toContain('A4 landscape')

    await fireEvent.click(landscape)
    expect(getPlan().landscape).toBe(true)
    expect(document.head.textContent).toContain('A4 landscape')

    await fireEvent.click(landscape)
    expect(getPlan().landscape).toBe(false)
    expect(document.head.textContent).not.toContain('A4 landscape')
  })
})

describe('undo and redo buttons', () => {
  it('are disabled until there is something to undo or redo', async () => {
    renderEditor()
    expect(button('Rückgängig').disabled).toBe(true)
    expect(button('Wiederholen').disabled).toBe(true)

    await fireEvent.input(screen.getByLabelText('Titel'), { target: { value: 'Fest' } })
    expect(button('Rückgängig').disabled).toBe(false)
    expect(button('Wiederholen').disabled).toBe(true)

    await fireEvent.click(button('Rückgängig'))
    expect(button('Wiederholen').disabled).toBe(false)
  })
})

describe('a template in the editor', () => {
  it('says so, and does not offer to save itself as one again', () => {
    renderEditor(true)

    expect(screen.getByText('Vorlage')).toBeTruthy()
    expect((screen.getByLabelText('Titel') as HTMLInputElement).placeholder).toBe('Vorlagenname')
    expect(screen.queryByRole('button', { name: 'Als Vorlage speichern' })).toBeNull()
  })

  it('is a document again when the flag is off', async () => {
    renderEditor()

    expect(screen.queryByText('Vorlage')).toBeNull()
    expect((screen.getByLabelText('Titel') as HTMLInputElement).placeholder).toBe('Ohne Titel')

    await fireEvent.click(button('Als Vorlage speichern'))
    expect(onsaveastemplate).toHaveBeenCalledOnce()
  })
})

describe('cell formatting', () => {
  it('disables the format group until a cell is focused', async () => {
    const getPlan = renderEditor()
    expect(button('Fett').disabled).toBe(true)

    textCell(getPlan()).focus()
    await Promise.resolve()

    expect(button('Fett').disabled).toBe(false)
  })

  it('clears the focused cell on a click that lands on no cell', async () => {
    const getPlan = renderEditor()
    textCell(getPlan()).focus()
    await Promise.resolve()
    expect(button('Fett').disabled).toBe(false)

    await fireEvent.click(document.querySelector('.sheet')!)
    expect(button('Fett').disabled).toBe(true)
  })

  it('sets bold on the focused cell through the toolbar, and undo removes it again', async () => {
    const getPlan = renderEditor()
    const columnId = getPlan().columns.find((entry) => entry.type === 'text')!.id
    textCell(getPlan()).focus()
    await Promise.resolve()

    await fireEvent.click(button('Fett'))
    expect(getPlan().rows[0].styles?.[columnId]).toMatchObject({ bold: true })

    await fireEvent.click(button('Rückgängig'))
    expect(getPlan().rows[0].styles?.[columnId]).toBeUndefined()
  })

  it('toggles bold with Ctrl+B in the focused textarea', async () => {
    const getPlan = renderEditor()
    const columnId = getPlan().columns.find((entry) => entry.type === 'text')!.id
    const field = textCell(getPlan())
    field.focus()
    await Promise.resolve()

    await fireEvent.keyDown(field, { key: 'b', ctrlKey: true })
    expect(getPlan().rows[0].styles?.[columnId]).toMatchObject({ bold: true })
  })

  it('removes the style entry through the reset button', async () => {
    const getPlan = renderEditor()
    textCell(getPlan()).focus()
    await Promise.resolve()

    await fireEvent.click(button('Fett'))
    await fireEvent.click(button('Formatierung zurücksetzen'))

    expect(getPlan().rows[0].styles).toBeUndefined()
  })
})
