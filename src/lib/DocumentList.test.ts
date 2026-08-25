import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DocumentList from './DocumentList.svelte'
import { createDocument } from './document'

function documentNamed(title: string, updatedAt: number) {
  const entry = createDocument(title)
  entry.updatedAt = updatedAt
  return entry
}

function renderList(documents = [documentNamed('Ablauf', 1000)]) {
  const handlers = {
    onopen: vi.fn(),
    oncreate: vi.fn(),
    onduplicate: vi.fn(),
    ondelete: vi.fn(),
    onmanagelists: vi.fn(),
  }
  render(DocumentList, { props: { documents, ...handlers } })
  return handlers
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DocumentList', () => {
  it('lists the most recently changed document first', () => {
    renderList([documentNamed('Älter', 1000), documentNamed('Neuer', 2000)])

    const titles = screen.getAllByRole('button', { name: /Älter|Neuer/ })
    expect(titles.map((button) => button.textContent?.trim())).toEqual(['Neuer', 'Älter'])
  })

  it('says so when there is nothing yet', () => {
    renderList([])
    expect(screen.getByText('Noch keine Dokumente.')).toBeTruthy()
  })

  it('opens a document by its title', async () => {
    const handlers = renderList([documentNamed('Ablauf', 1000)])

    await fireEvent.click(screen.getByRole('button', { name: 'Ablauf' }))

    expect(handlers.onopen).toHaveBeenCalledOnce()
  })

  it('deletes only after the confirmation is accepted', async () => {
    const handlers = renderList()

    await fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    const dialog = within(screen.getByRole('dialog'))
    await fireEvent.click(dialog.getByRole('button', { name: 'Abbrechen' }))
    expect(handlers.ondelete).not.toHaveBeenCalled()

    await fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    await fireEvent.click(dialog.getByRole('button', { name: 'Löschen' }))
    expect(handlers.ondelete).toHaveBeenCalledOnce()
  })

  it('falls back to the placeholder for an untitled document', () => {
    renderList([documentNamed('', 1000)])
    expect(screen.getByRole('button', { name: 'Ohne Titel' })).toBeTruthy()
  })
})
