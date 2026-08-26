import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Editor from './Editor.svelte'
import { createDocument } from './document'

function renderEditor() {
  const plan = $state(createDocument('Ablauf'))
  render(Editor, { props: { plan, lists: [], startTimes: [], onback: () => {} } })
  return plan
}

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
