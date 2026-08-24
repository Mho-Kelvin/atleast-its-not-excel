const HOUR_UNITS = new Set(['h', 'hr', 'hrs', 'hour', 'hours', 'std', 'stunde', 'stunden'])
const MINUTE_UNITS = new Set(['', 'm', 'min', 'mins', 'minute', 'minutes', 'minuten'])

const CLOCK_FORM = /^(\d+):([0-5]\d)$/
const NUMBER_AND_UNIT = /^(\d+)\s*([a-zäöü.]*)\s*/

/**
 * Returns the duration in minutes, or null if the input cannot be read.
 * Never guesses: an unreadable cell must stay unreadable rather than
 * become a wrong number on a printed schedule.
 */
export function parseDuration(input: string): number | null {
  const text = input.trim().toLowerCase()
  if (text === '') return null

  const clock = CLOCK_FORM.exec(text)
  if (clock) return Number(clock[1]) * 60 + Number(clock[2])

  let rest = text
  let hours: number | null = null
  let minutes: number | null = null

  while (rest !== '') {
    const token = NUMBER_AND_UNIT.exec(rest)
    if (!token) return null
    rest = rest.slice(token[0].length)

    const amount = Number(token[1])
    const unit = token[2].replace(/\.$/, '')

    if (HOUR_UNITS.has(unit)) {
      if (hours !== null) return null
      hours = amount
    } else if (MINUTE_UNITS.has(unit)) {
      if (minutes !== null) return null
      minutes = amount
    } else {
      return null
    }
  }

  if (hours === null && minutes === null) return null
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/** Renders minutes back as "90" / "1:30" style text for display next to the input. */
export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours} h`
  return `${hours}:${String(minutes).padStart(2, '0')} h`
}
