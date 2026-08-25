import type { StartTime } from './types'

const TIME_OF_DAY = /^(\d{1,2}):([0-5]\d)$/
const MINUTES_PER_DAY = 24 * 60

/** Reads "09:00" as minutes since midnight, or null if it is not a time of day. */
export function parseTimeOfDay(input: string): number | null {
  const match = TIME_OF_DAY.exec(input.trim())
  if (!match) return null
  const hours = Number(match[1])
  if (hours > 23) return null
  return hours * 60 + Number(match[2])
}

/** Renders minutes since midnight as "09:00", wrapping past midnight. */
export function formatTimeOfDay(minutes: number): string {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
  const hours = Math.floor(wrapped / 60)
  return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

/** A named start time reads as "Empfang (09:00)", an unnamed one as the bare time. */
export function formatStartTime(entry: StartTime): string {
  return entry.name ? `${entry.name} (${entry.time})` : entry.time
}

/**
 * Start time per row, given the document start and one duration per row.
 * A row whose duration is unknown counts as zero minutes, so the rows below it
 * keep a time; the unreadable cell itself is flagged in the table.
 */
export function computeStartTimes(
  documentStart: number,
  durations: readonly (number | null)[],
): number[] {
  const startTimes: number[] = []
  let running = documentStart

  for (const duration of durations) {
    startTimes.push(running)
    running += duration ?? 0
  }

  return startTimes
}
