import { fireEvent, render, screen } from '@testing-library/svelte'
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
  it('adds an empty field', async () => {
    const plan = renderEditor([])

    await fireEvent.click(screen.getByRole('button', { name: 'Feld hinzufügen' }))

    expect(plan.headerFields).toHaveLength(1)
    expect(plan.headerFields[0].label).toBe('')
  })

  it('writes the label and the value back to the document', async () => {
    const plan = renderEditor()

    await fireEvent.input(screen.getByLabelText('Bezeichnung'), { target: { value: 'Datum' } })
    await fireEvent.input(screen.getByLabelText('Inhalt'), { target: { value: '24.08.2026' } })

    expect(plan.headerFields[0]).toMatchObject({ label: 'Datum', value: '24.08.2026' })
  })

  it('removes a field', async () => {
    const plan = renderEditor()

    await fireEvent.click(screen.getByTitle('Feld löschen'))

    expect(plan.headerFields).toHaveLength(0)
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
