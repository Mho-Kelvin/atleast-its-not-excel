const RELATIVE = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' })
const ABSOLUTE = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' })

const DAY = 24 * 60 * 60 * 1000

/**
 * Days apart by calendar, not by elapsed hours: something written last night
 * should read "gestern" in the morning, whatever the clock says.
 */
function daysApart(from: number, to: number): number {
  const start = new Date(from)
  const end = new Date(to)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - start.getTime()) / DAY)
}

/** "heute", "gestern", "vor 3 Tagen", then the plain date. */
export function formatChanged(timestamp: number, now: number = Date.now()): string {
  const days = daysApart(timestamp, now)
  if (days < 0 || days > 6) return ABSOLUTE.format(timestamp)
  return RELATIVE.format(-days, 'day')
}
