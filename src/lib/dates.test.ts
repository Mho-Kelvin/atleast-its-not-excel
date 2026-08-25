import { describe, expect, it } from 'vitest'
import { formatChanged } from './dates'

const now = new Date('2026-08-25T09:00:00').getTime()

function at(iso: string): number {
  return new Date(iso).getTime()
}

describe('formatChanged', () => {
  it('names today and yesterday', () => {
    expect(formatChanged(at('2026-08-25T08:00:00'), now)).toBe('heute')
    expect(formatChanged(at('2026-08-24T23:30:00'), now)).toBe('gestern')
  })

  it('counts calendar days, not elapsed hours', () => {
    // Two hours earlier, but on the far side of midnight.
    expect(formatChanged(at('2026-08-24T23:00:00'), at('2026-08-25T01:00:00'))).toBe('gestern')
  })

  it('counts up to six days back', () => {
    expect(formatChanged(at('2026-08-22T09:00:00'), now)).toBe('vor 3 Tagen')
    expect(formatChanged(at('2026-08-19T09:00:00'), now)).toBe('vor 6 Tagen')
  })

  it('falls back to the date once it is a week old', () => {
    expect(formatChanged(at('2026-08-18T09:00:00'), now)).toBe('18.08.2026')
  })

  it('falls back to the date for a timestamp in the future', () => {
    expect(formatChanged(at('2026-08-26T09:00:00'), now)).toBe('26.08.2026')
  })
})
