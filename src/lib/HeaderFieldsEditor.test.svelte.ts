import { fireEvent, render, screen } from '@testing-library/svelte'
import { SHADOW_PLACEHOLDER_ITEM_ID } from 'svelte-dnd-action'
import { describe, expect, it } from 'vitest'
import HeaderFieldsEditor from './HeaderFieldsEditor.svelte'
import { createDocument, createHeaderField } from './document'

function renderEditor(fields = [createHeaderField('Ort')]) {
  const source = createDocument('Ablauf')
  source.headerFields = fields
  const plan = $state(source)
  render(HeaderFieldsEditor, { props: { plan } })
  return plan
}

describe('HeaderFieldsEditor', () => {
  it('leaves the trailing draft without a delete button, so only real fields can go', () => {
    renderEditor([createHeaderField('Ort'), createHeaderField('')])

    expect(screen.getAllByTitle(/löschen/)).toHaveLength(1)
  })

  it('writes the label and the value back to the document', async () => {
    const plan = renderEditor()

    await fireEvent.input(screen.getByLabelText('Bezeichnung'), { target: { value: 'Datum' } })
    await fireEvent.input(screen.getByLabelText('Inhalt'), { target: { value: '24.08.2026' } })

    expect(plan.headerFields[0]).toMatchObject({ label: 'Datum', value: '24.08.2026' })
  })

  it('holds the value in a growing textarea, newline included', async () => {
    const plan = renderEditor()

    const value = screen.getByLabelText('Inhalt')
    expect(value.tagName).toBe('TEXTAREA')

    // No keydown handler here, unlike CellField: Enter must stay a plain
    // newline, never a step to the next field.
    expect(await fireEvent.keyDown(value, { key: 'Enter' })).toBe(true)

    await fireEvent.input(value, { target: { value: 'Saal A\nEingang Nord' } })

    expect(plan.headerFields[0].value).toBe('Saal A\nEingang Nord')
  })

  it('marks an unlabelled field so print can hide the blank label', () => {
    const named = createHeaderField('Ort')
    const unnamed = createHeaderField('')
    unnamed.value = 'Nebeneingang'
    renderEditor([named, unnamed])

    const labels = screen.getAllByLabelText('Bezeichnung')
    expect(labels[0].classList.contains('unlabelled')).toBe(false)
    expect(labels[1].classList.contains('unlabelled')).toBe(true)
  })

  it('removes a field', async () => {
    const plan = renderEditor()

    // The button names the field it deletes, so it can be told from its neighbours.
    await fireEvent.click(screen.getByTitle('Feld „Ort“ löschen'))

    expect(plan.headerFields).toHaveLength(0)
  })

  it('writes a dropped order back without the library placeholder', async () => {
    const first = createHeaderField('Ort')
    const second = createHeaderField('Datum')
    const plan = renderEditor([first, second])

    const zone = document.querySelector('section')!
    await fireEvent(
      zone,
      new CustomEvent('finalize', {
        detail: {
          items: [second, { id: SHADOW_PLACEHOLDER_ITEM_ID }, first],
          info: { id: second.id },
        },
      }),
    )

    expect(plan.headerFields).toEqual([second, first])
  })

  it('marks a field nobody filled in, so print can drop it', () => {
    const filled = createHeaderField('Ort')
    filled.value = 'Saal'
    renderEditor([createHeaderField(''), filled])

    const fields = document.querySelectorAll('.field')
    expect(fields[0].classList.contains('empty')).toBe(true)
    expect(fields[1].classList.contains('empty')).toBe(false)
  })
})
