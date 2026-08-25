import { describe, expect, it } from 'vitest'
import { computeStartTimes, formatTimeOfDay, parseTimeOfDay } from './schedule'

describe('parseTimeOfDay', () => {
  it('reads a time of day', () => {
    expect(parseTimeOfDay('09:00')).toBe(540)
    expect(parseTimeOfDay('9:05')).toBe(545)
    expect(parseTimeOfDay('00:00')).toBe(0)
  })

  it('rejects anything else', () => {
    expect(parseTimeOfDay('24:00')).toBeNull()
    expect(parseTimeOfDay('09:60')).toBeNull()
    expect(parseTimeOfDay('900')).toBeNull()
    expect(parseTimeOfDay('')).toBeNull()
  })
})

describe('formatTimeOfDay', () => {
  it('pads and wraps past midnight', () => {
    expect(formatTimeOfDay(540)).toBe('09:00')
    expect(formatTimeOfDay(0)).toBe('00:00')
    expect(formatTimeOfDay(24 * 60 + 30)).toBe('00:30')
  })
})

describe('computeStartTimes', () => {
  it('chains each row onto the previous duration', () => {
    expect(computeStartTimes(540, [15, 30, 45])).toEqual([540, 555, 585])
  })

  it('gives the first row the document start even with no durations', () => {
    expect(computeStartTimes(540, [null])).toEqual([540])
  })

  it('counts an unknown duration as zero and keeps the chain going', () => {
    expect(computeStartTimes(540, [15, null, 30, 10])).toEqual([540, 555, 555, 585])
  })

  it('returns nothing for an empty table', () => {
    expect(computeStartTimes(540, [])).toEqual([])
  })
})
