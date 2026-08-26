import { fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TemplatePicker from './TemplatePicker.svelte'
import { createDocument } from './document'
import type { ScheduleDocument } from './types'

function templateNamed(title: string, updatedAt: number) {
  const entry = createDocument(title)
  entry.updatedAt = updatedAt
  return entry
}

function renderPicker(templates: ScheduleDocument[] = [], open = true) {
  const handlers = { onchoose: vi.fn(), onclose: vi.fn() }
  render(TemplatePicker, { props: { open, templates, ...handlers } })
  return handlers
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TemplatePicker', () => {
  it('leaves no dialog behind while it is closed', () => {
    renderPicker([templateNamed('Standard', 1000)], false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('offers a blank document even with nothing saved', async () => {
    const handlers = renderPicker()

    expect(screen.getByText('Noch keine Vorlagen.')).toBeTruthy()
    await fireEvent.click(screen.getByRole('button', { name: 'Leeres Dokument' }))

    expect(handlers.onchoose).toHaveBeenCalledWith(null)
  })

  it('lists the templates newest first, under the blank one', () => {
    renderPicker([templateNamed('Ältere', 1000), templateNamed('Neuere', 2000)])

    const choices = screen.getAllByRole('button', { name: /Dokument|Ältere|Neuere/ })
    expect(choices.map((choice) => choice.querySelector('.title')?.textContent?.trim())).toEqual([
      'Leeres Dokument',
      'Neuere',
      'Ältere',
    ])
  })

  it('hands back the id of the template that was picked', async () => {
    const chosen = templateNamed('Standard', 1000)
    const handlers = renderPicker([templateNamed('Anderes', 2000), chosen])

    await fireEvent.click(screen.getByRole('button', { name: /Standard/ }))

    expect(handlers.onchoose).toHaveBeenCalledWith(chosen.id)
  })

  it('closes on the close button', async () => {
    const handlers = renderPicker()

    await fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))

    expect(handlers.onclose).toHaveBeenCalledOnce()
    expect(handlers.onchoose).not.toHaveBeenCalled()
  })
})
