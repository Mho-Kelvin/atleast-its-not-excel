import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.svelte'
import { createDocument } from './lib/document'

const STORAGE_KEY = 'tobias-tool/v1'

function seed(startTimes: { time: string; name?: string }[], startTime: string): void {
  const document = createDocument('Ablauf')
  document.startTime = startTime
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ documents: [document], lists: [], startTimes }))
}

async function openDocument(): Promise<void> {
  render(App)
  await fireEvent.click(screen.getByText('Ablauf'))
}

function storedStartTime(): string {
  const store = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  return store.documents[0].startTime
}

function startTimeField(): HTMLElement {
  return screen.getByLabelText('Beginn')
}

beforeEach(() => {
  localStorage.clear()
})

describe('start time', () => {
  it('offers the stored times plus the custom entry, and nothing else to pick from', async () => {
    seed([{ time: '08:00', name: 'Empfang' }, { time: '09:00' }], '09:00')
    await openDocument()

    const field = startTimeField() as HTMLSelectElement
    expect(field.tagName).toBe('SELECT')
    expect([...field.options].map((option) => option.textContent?.trim())).toEqual([
      '',
      'Empfang (08:00)',
      '09:00',
      'Eigener Wert …',
    ])
    expect(field.value).toBe('09:00')
    expect(screen.queryByLabelText('Liste')).toBeNull()
  })

  it('stores the picked value', async () => {
    seed([{ time: '08:00', name: 'Empfang' }, { time: '09:00' }], '09:00')
    await openDocument()

    await fireEvent.change(startTimeField(), { target: { value: '08:00' } })

    expect(storedStartTime()).toBe('08:00')
  })

  it('swaps in a text box for a value of its own', async () => {
    seed([{ time: '08:00', name: 'Empfang' }, { time: '09:00' }], '09:00')
    await openDocument()

    await fireEvent.change(startTimeField(), { target: { value: '__custom__' } })

    const field = startTimeField() as HTMLInputElement
    expect(field.type).toBe('time')
    await fireEvent.input(field, { target: { value: '07:45' } })
    expect(storedStartTime()).toBe('07:45')
  })

  it('hands the dropdown back when the text box is emptied', async () => {
    seed([{ time: '08:00', name: 'Empfang' }, { time: '09:00' }], '09:00')
    await openDocument()

    await fireEvent.change(startTimeField(), { target: { value: '__custom__' } })
    await fireEvent.blur(startTimeField())

    expect(startTimeField().tagName).toBe('SELECT')
  })

  it('shows a stored value that is not on the list as text', async () => {
    seed([{ time: '08:00' }, { time: '09:00' }], '07:15')
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
