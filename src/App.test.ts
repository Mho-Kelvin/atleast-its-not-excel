import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.svelte'
import { createDocument } from './lib/document'
import { createList } from './lib/lists'
import { emptyStore } from './lib/storage'
import { backupEnvelope, documentEnvelope } from './lib/transfer'
import type { StartTime } from './lib/types'

const STORAGE_KEY = 'atleast-its-not-excel/v1'

const EMPFANG: StartTime = { id: 'empfang', time: '08:00', name: 'Empfang' }
const NEUN: StartTime = { id: 'neun', time: '09:00' }

function seed(startTimes: StartTime[], startTime: string, startTimeId?: string): void {
  const document = createDocument('Ablauf')
  document.startTime = startTime
  document.startTimeId = startTimeId
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ documents: [document], lists: [], startTimes }),
  )
}

async function openDocument(): Promise<void> {
  render(App)
  await fireEvent.click(screen.getByText('Ablauf'))
}

function storedStartTime(): string {
  const store = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  return store.documents[0].startTime
}

function storedStartTimeId(): string | undefined {
  const store = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  return store.documents[0].startTimeId
}

function startTimeField(): HTMLElement {
  return screen.getByLabelText('Beginn')
}

beforeEach(() => {
  localStorage.clear()
})

describe('start time', () => {
  it('offers the stored times plus the custom entry, and nothing else to pick from', async () => {
    seed([EMPFANG, NEUN], '09:00')
    await openDocument()

    const field = startTimeField() as HTMLSelectElement
    expect(field.tagName).toBe('SELECT')
    expect([...field.options].map((option) => option.textContent?.trim())).toEqual([
      '',
      'Empfang (08:00)',
      '09:00',
      'Eigener Wert …',
    ])
    expect(field.value).toBe(NEUN.id)
    expect(screen.queryByLabelText('Liste')).toBeNull()
  })

  it('stores the picked value', async () => {
    seed([EMPFANG, NEUN], '09:00')
    await openDocument()

    await fireEvent.change(startTimeField(), { target: { value: EMPFANG.id } })

    expect(storedStartTime()).toBe('08:00')
    expect(storedStartTimeId()).toBe(EMPFANG.id)
  })

  it('remembers which of two entries on the same time was picked', async () => {
    const beginn: StartTime = { id: 'beginn', time: '09:00', name: 'Beginn' }
    const start: StartTime = { id: 'start', time: '09:00', name: 'Start' }
    seed([beginn, start], '09:00', start.id)
    await openDocument()

    expect((startTimeField() as HTMLSelectElement).value).toBe(start.id)
  })

  it('falls back to the first entry on that time when the picked one is gone', async () => {
    seed([EMPFANG, NEUN], '09:00', 'deleted')
    await openDocument()

    expect((startTimeField() as HTMLSelectElement).value).toBe(NEUN.id)
  })

  it('swaps in a text box for a value of its own', async () => {
    seed([EMPFANG, NEUN], '09:00')
    await openDocument()

    await fireEvent.change(startTimeField(), { target: { value: '__custom__' } })

    const field = startTimeField() as HTMLInputElement
    expect(field.type).toBe('time')
    await fireEvent.input(field, { target: { value: '07:45' } })
    expect(storedStartTime()).toBe('07:45')
  })

  it('hands the dropdown back when the text box is emptied', async () => {
    seed([EMPFANG, NEUN], '09:00')
    await openDocument()

    await fireEvent.change(startTimeField(), { target: { value: '__custom__' } })
    await fireEvent.blur(startTimeField())

    expect(startTimeField().tagName).toBe('SELECT')
  })

  it('shows a stored value that is not on the list as text', async () => {
    seed([EMPFANG, NEUN], '07:15')
    await openDocument()

    expect(startTimeField().tagName).toBe('INPUT')
    expect((startTimeField() as HTMLInputElement).value).toBe('07:15')
  })

  it('stays a plain text box while the list holds no times', async () => {
    seed([], '09:00')
    await openDocument()

    expect(startTimeField().tagName).toBe('INPUT')
  })
})

function storedStore() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
}

/** A document with something in it, so a copy has something to carry over. */
function seedFilled(title = 'Ablauf'): void {
  const document = createDocument(title)
  document.rows[0].cells[document.columns[1].id] = 'Einlass'
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ documents: [document], templates: [], lists: [], startTimes: [] }),
  )
}

describe('import', () => {
  async function pick(text: string): Promise<void> {
    const { container } = render(App)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    await fireEvent.change(input, {
      target: { files: [new File([text], 'datei.json', { type: 'application/json' })] },
    })
  }

  it('reports what came in and shows it on the home screen', async () => {
    seedFilled()
    await pick(JSON.stringify(documentEnvelope(createDocument('Importiert'))))

    expect(await screen.findByText('1 Dokument importiert')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Importiert' })).toBeTruthy()
    expect(storedStore().documents).toHaveLength(2)
  })

  it('counts every drawer a backup filled', async () => {
    const store = emptyStore()
    store.documents = [createDocument('Ablauf'), createDocument('Probe')]
    store.lists = [createList('Räume')]
    await pick(JSON.stringify(backupEnvelope(store)))

    expect(await screen.findByText('2 Dokumente, 1 Liste importiert')).toBeTruthy()
  })

  it('says so and changes nothing when the file is unreadable', async () => {
    seedFilled()
    await pick('kein JSON')

    const message = await screen.findByText('Datei nicht lesbar')
    expect(message.getAttribute('role')).toBe('alert')
    expect(storedStore().documents).toHaveLength(1)
  })
})

describe('templates', () => {
  it('saves a document as a template without touching the document', async () => {
    seedFilled()
    render(App)

    await fireEvent.click(screen.getByRole('button', { name: 'Als Vorlage speichern' }))

    const store = storedStore()
    expect(store.documents).toHaveLength(1)
    expect(store.templates).toHaveLength(1)
    expect(store.templates[0].title).toBe('Ablauf')
    expect(store.templates[0].id).not.toBe(store.documents[0].id)
    expect(screen.getByRole('heading', { name: 'Vorlagen' })).toBeTruthy()
  })

  it('starts a new document from a template, carrying its rows over', async () => {
    seedFilled()
    render(App)
    await fireEvent.click(screen.getByRole('button', { name: 'Als Vorlage speichern' }))

    await fireEvent.click(screen.getByRole('button', { name: 'Neues Dokument' }))
    // The cards behind the dialog carry the same name, so the choice is taken
    // from inside it.
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /Ablauf/ }),
    )

    const store = storedStore()
    expect(store.documents).toHaveLength(2)
    const created = store.documents[1]
    expect(created.title).toBe('Ablauf')
    expect(created.id).not.toBe(store.templates[0].id)
    expect(Object.values(created.rows[0].cells)).toContain('Einlass')
    // Fresh column ids: editing the copy must not reach back into the template.
    expect(created.columns[0].id).not.toBe(store.templates[0].columns[0].id)
    expect(screen.getByLabelText('Titel')).toBeTruthy()
  })

  it('starts a blank document when that is what was picked', async () => {
    seedFilled()
    render(App)

    await fireEvent.click(screen.getByRole('button', { name: 'Neues Dokument' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Leeres Dokument' }))

    const store = storedStore()
    expect(store.documents).toHaveLength(2)
    expect(store.documents[1].title).toBe('')
  })

  it('edits the template itself when a template card is opened', async () => {
    seedFilled()
    render(App)
    await fireEvent.click(screen.getByRole('button', { name: 'Als Vorlage speichern' }))

    // The heading marks the section; the card below it is the template's own.
    await fireEvent.click(screen.getAllByRole('button', { name: 'Ablauf' })[1])
    expect(screen.getByText('Vorlage')).toBeTruthy()
    await fireEvent.input(screen.getByLabelText('Titel'), { target: { value: 'Standard' } })

    const store = storedStore()
    expect(store.templates[0].title).toBe('Standard')
    expect(store.documents[0].title).toBe('Ablauf')
  })

  it('deletes a template from its card, and the section goes with the last one', async () => {
    seedFilled()
    render(App)
    await fireEvent.click(screen.getByRole('button', { name: 'Als Vorlage speichern' }))
    await fireEvent.click(screen.getAllByRole('button', { name: 'Ablauf' })[1])
    await fireEvent.click(screen.getByRole('button', { name: 'Zurück' }))

    await fireEvent.click(screen.getByRole('button', { name: 'Vorlage löschen' }))
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Vorlage löschen' }),
    )

    expect(storedStore().templates).toHaveLength(0)
    expect(screen.queryByText('Vorlagen')).toBeNull()
  })
})
