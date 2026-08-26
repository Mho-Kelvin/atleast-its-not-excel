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
