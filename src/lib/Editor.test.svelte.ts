import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import Editor from './Editor.svelte'
import { createDocument } from './document'

function renderEditor(isTemplate = false) {
  const plan = $state(createDocument('Ablauf'))
  render(Editor, {
    props: { plan, lists: [], startTimes: [], isTemplate, onback: () => {}, onsaveastemplate },
  })
  return plan
}

const onsaveastemplate = vi.fn()

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

describe('the Beginn line', () => {
  it('is dropped from print once its checkbox is cleared', async () => {
    const plan = renderEditor()
    const printIt = screen.getByLabelText('Beginn drucken') as HTMLInputElement
    expect(printIt.checked).toBe(true)
    expect(document.querySelector('p.start')?.classList).not.toContain('print-hidden')

    await fireEvent.click(printIt)
    expect(plan.hideStartTimeInPrint).toBe(true)
    expect(document.querySelector('p.start')?.classList).toContain('print-hidden')

    await fireEvent.click(printIt)
    expect(plan.hideStartTimeInPrint).toBe(false)
    expect(document.querySelector('p.start')?.classList).not.toContain('print-hidden')
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
