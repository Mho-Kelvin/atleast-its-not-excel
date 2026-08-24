import { describe, expect, it } from 'vitest'
import { formatDuration, parseDuration } from './duration'

describe('parseDuration', () => {
  it('reads a bare number as minutes', () => {
    expect(parseDuration('15')).toBe(15)
    expect(parseDuration('0')).toBe(0)
    expect(parseDuration('  90  ')).toBe(90)
  })

  it('reads English minute suffixes', () => {
    expect(parseDuration('15m')).toBe(15)
    expect(parseDuration('15 min')).toBe(15)
    expect(parseDuration('15mins')).toBe(15)
    expect(parseDuration('15 minutes')).toBe(15)
  })

  it('reads German minute suffixes', () => {
    expect(parseDuration('15 Min')).toBe(15)
    expect(parseDuration('15 Min.')).toBe(15)
    expect(parseDuration('90 Minuten')).toBe(90)
  })

  it('reads hour suffixes in both languages', () => {
    expect(parseDuration('1h')).toBe(60)
    expect(parseDuration('2 hours')).toBe(120)
    expect(parseDuration('1 Std')).toBe(60)
    expect(parseDuration('2 Stunden')).toBe(120)
  })

  it('reads combined hours and minutes', () => {
    expect(parseDuration('1h30')).toBe(90)
    expect(parseDuration('1h 30min')).toBe(90)
    expect(parseDuration('1 Std 30 Min')).toBe(90)
  })

  it('reads the clock form', () => {
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('0:05')).toBe(5)
    expect(parseDuration('10:00')).toBe(600)
  })

  it('rejects anything it cannot read', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('tbd')).toBeNull()
    expect(parseDuration('offen')).toBeNull()
    expect(parseDuration('1,5h')).toBeNull()
    expect(parseDuration('15 Sekunden')).toBeNull()
    expect(parseDuration('1:75')).toBeNull()
  })

  it('rejects a repeated unit rather than adding it twice', () => {
    expect(parseDuration('1h 2h')).toBeNull()
    expect(parseDuration('30 15')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('renders minutes, whole hours and mixed values', () => {
    expect(formatDuration(15)).toBe('15 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(90)).toBe('1:30 h')
  })
})
