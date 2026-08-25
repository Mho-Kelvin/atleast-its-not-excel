import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from './ConfirmDialog.svelte'

function renderDialog(open = true) {
  const onconfirm = vi.fn()
  const oncancel = vi.fn()
  render(ConfirmDialog, {
    props: { open, message: 'Wirklich löschen?', confirmLabel: 'Löschen', onconfirm, oncancel },
  })
  return { onconfirm, oncancel }
}

describe('ConfirmDialog', () => {
  it('stays shut until it is asked to open', () => {
    renderDialog(false)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('names itself after the question it asks', () => {
    renderDialog()

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-message')
    expect(screen.getByText('Wirklich löschen?')).toBeTruthy()
  })

  it('confirms and cancels through their own buttons', async () => {
    const { onconfirm, oncancel } = renderDialog()

    await fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(oncancel).toHaveBeenCalledOnce()
    expect(onconfirm).not.toHaveBeenCalled()

    await fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    expect(onconfirm).toHaveBeenCalledOnce()
  })

  // Escape reaches the dialog as the platform's own cancel event, not a keydown.
  it('cancels when the browser dismisses it', async () => {
    const { oncancel } = renderDialog()

    await fireEvent(screen.getByRole('dialog'), new Event('cancel'))

    expect(oncancel).toHaveBeenCalledOnce()
  })
})
