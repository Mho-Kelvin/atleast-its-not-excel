import { counts, strings } from './strings'

/** How far the table may shrink before cells start being dropped instead. */
export const MIN_SCALE = 0.8

export interface PrintFit {
  /** Zoom the table prints at, never above 1. */
  scale: number
  /** Slot ids left off the paper to make the rest fit. */
  hidden: string[]
  /** Whether the column headings may break across lines. */
  wrapHeaders: boolean
  /** True when the last cell standing still runs past the page. */
  overflows: boolean
}

export const PRINTS_AS_IS: PrintFit = {
  scale: 1,
  hidden: [],
  wrapHeaders: false,
  overflows: false,
}

export interface Measured {
  required: number
  available: number
}

/** The same answer while it is still about cell positions rather than slot ids. */
export interface PagePlan {
  scale: number
  hidden: number[]
  wrapHeaders: boolean
  overflows: boolean
}

/**
 * Shrinks the table until it fits the page, and once shrinking alone stops being
 * enough, lets the headings break across lines, and only then drops cells off
 * the right and starts over. `droppable` holds the positions that may go, left
 * to right, so a cell the user switched off by hand is not among them. The last
 * one standing is never dropped: a table of nothing is worse than a table that
 * overruns.
 *
 * Wrapping comes before dropping because it costs a line of the heading and
 * nothing else, and it is never taken back once taken: a cell given up after it
 * would have been given up either way.
 *
 * Zoom scales the whole box, so what a cell needs shrinks in step with it and
 * one measurement per attempt is enough.
 */
export function fitToPage(
  droppable: readonly number[],
  measure: (hidden: number[], wrapHeaders: boolean) => Measured,
): PagePlan {
  const hidden: number[] = []
  const left = [...droppable]
  let wrapHeaders = false

  for (;;) {
    const { required, available } = measure(hidden, wrapHeaders)
    // No layout to read: jsdom, or a table that is not on the page yet.
    if (available <= 0) return { scale: 1, hidden, wrapHeaders, overflows: false }
    if (required <= available) return { scale: 1, hidden, wrapHeaders, overflows: false }

    const scale = available / required
    if (scale >= MIN_SCALE) return { scale, hidden, wrapHeaders, overflows: false }

    if (!wrapHeaders) {
      wrapHeaders = true
      continue
    }
    if (left.length <= 1) return { scale: MIN_SCALE, hidden, wrapHeaders, overflows: true }

    hidden.push(left.pop()!)
  }
}

/** The toolbar's line about what printing had to give up, empty when nothing was. */
export function printFitNotice(fit: PrintFit): string {
  if (fit.overflows) return strings.printDoesNotFit

  const percent = Math.floor(fit.scale * 100)
  const shrunk = percent < 100 ? strings.printScaled(percent) : ''
  const dropped = fit.hidden.length > 0 ? counts.hiddenColumns(fit.hidden.length) : ''

  if (shrunk !== '' && dropped !== '') return `${shrunk}, ${dropped}`
  return shrunk !== '' ? shrunk : dropped
}
