import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DocumentList from './DocumentList.svelte'
import { createDocument, ensureDrafts } from './document'
import type { ScheduleDocument } from './types'

function documentNamed(title: string, updatedAt: number) {
  const entry = createDocument(title)
  entry.updatedAt = updatedAt
  return entry
}

function renderList(
  documents = [documentNamed('Ablauf', 1000)],
  templates: ScheduleDocument[] = [],
) {
  const handlers = {
    onopen: vi.fn(),
    onopentemplate: vi.fn(),
    oncreate: vi.fn(),
    onduplicate: vi.fn(),
    onsaveastemplate: vi.fn(),
    ondelete: vi.fn(),
    ondeletetemplate: vi.fn(),
    onmanagelists: vi.fn(),
  }
  render(DocumentList, { props: { documents, templates, ...handlers } })
  return handlers
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DocumentList', () => {
  it('lists the most recently changed document first', () => {
    renderList([documentNamed('Älter', 1000), documentNamed('Neuer', 2000)])

    const cards = screen.getAllByRole('button', { name: /Älter|Neuer/ })
    const titles = cards.map((card) =>
      document.getElementById(card.getAttribute('aria-labelledby')!)?.textContent?.trim(),
    )
    expect(titles).toEqual(['Neuer', 'Älter'])
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

    // The dialog is mounted afresh each time it opens, so it is looked up again.
    await fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Abbrechen' }),
    )
    expect(handlers.ondelete).not.toHaveBeenCalled()

    await fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Löschen' }),
    )
    expect(handlers.ondelete).toHaveBeenCalledOnce()
  })

  it('counts the real rows, not the draft one at the end', () => {
    const entry = documentNamed('Ablauf', Date.now())
    entry.rows[0].cells[entry.columns[1].id] = 'Einlass'
    ensureDrafts(entry)
    renderList([entry])

    expect(screen.getByText('1 Zeile · 3 Spalten')).toBeTruthy()
  })

  it('says when a document was last changed in words', () => {
    const yesterday = Date.now() - 24 * 60 * 60 * 1000
    renderList([documentNamed('Ablauf', yesterday)])

    expect(screen.getByText('gestern')).toBeTruthy()
  })

  it('falls back to the placeholder for an untitled document', () => {
    renderList([documentNamed('', 1000)])
    expect(screen.getByRole('button', { name: 'Ohne Titel' })).toBeTruthy()
  })
})

describe('templates', () => {
  it('has no section at all until one is saved', () => {
    renderList()
    expect(screen.queryByText('Vorlagen')).toBeNull()
  })

  it('lists them under their own heading, newest first', () => {
    renderList(
      [documentNamed('Ablauf', 1000)],
      [documentNamed('Ältere Vorlage', 1000), documentNamed('Neuere Vorlage', 2000)],
    )

    expect(screen.getByText('Vorlagen')).toBeTruthy()
    const titles = screen
      .getAllByRole('button', { name: /Vorlage$/ })
      .map((card) => document.getElementById(card.getAttribute('aria-labelledby')!)?.textContent)
    expect(titles.map((title) => title?.trim())).toEqual(['Neuere Vorlage', 'Ältere Vorlage'])
  })

  it('opens a template in the editor rather than as a document', async () => {
    const template = documentNamed('Standard', 1000)
    const handlers = renderList([documentNamed('Ablauf', 1000)], [template])

    await fireEvent.click(screen.getByRole('button', { name: 'Standard' }))

    expect(handlers.onopentemplate).toHaveBeenCalledWith(template.id)
    expect(handlers.onopen).not.toHaveBeenCalled()
  })

  it('saves a document as a template from its card', async () => {
    const entry = documentNamed('Ablauf', 1000)
    const handlers = renderList([entry])

    await fireEvent.click(screen.getByRole('button', { name: 'Als Vorlage speichern' }))

    expect(handlers.onsaveastemplate).toHaveBeenCalledWith(entry.id)
  })

  it('offers neither duplicating nor saving on a template card', () => {
    renderList([], [documentNamed('Standard', 1000)])

    expect(screen.queryByRole('button', { name: 'Duplizieren' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Als Vorlage speichern' })).toBeNull()
  })

  it('deletes a template only after its own confirmation is accepted', async () => {
    const template = documentNamed('Standard', 1000)
    const handlers = renderList([documentNamed('Ablauf', 1000)], [template])

    await fireEvent.click(screen.getByRole('button', { name: 'Vorlage löschen' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Diese Vorlage endgültig löschen?')).toBeTruthy()

    await fireEvent.click(within(dialog).getByRole('button', { name: 'Vorlage löschen' }))

    expect(handlers.ondeletetemplate).toHaveBeenCalledWith(template.id)
    expect(handlers.ondelete).not.toHaveBeenCalled()
  })

  it('falls back to the template placeholder for an unnamed one', () => {
    renderList([], [documentNamed('', 1000)])
    expect(screen.getByRole('button', { name: 'Vorlagenname' })).toBeTruthy()
  })
})
