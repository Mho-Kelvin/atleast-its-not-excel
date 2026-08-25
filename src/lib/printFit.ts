import { counts, strings } from './strings'

/** How far the table may shrink before cells start being dropped instead. */
export const MIN_SCALE = 0.8

export interface PrintFit {
  /** Zoom the table prints at, never above 1. */
  scale: number
  /** Slot ids left off the paper to make the rest fit. */
  hidden: string[]
  /** True when the last cell standing still runs past the page. */
  overflows: boolean
}

export const PRINTS_AS_IS: PrintFit = { scale: 1, hidden: [], overflows: false }

export interface Measured {
  required: number
  available: number
}

/** The same answer while it is still about cell positions rather than slot ids. */
export interface PagePlan {
  scale: number
  hidden: number[]
  overflows: boolean
}

/**
 * Shrinks the table until it fits the page, and once shrinking alone stops being
 * enough, drops cells off the right and starts over. `droppable` holds the
 * positions that may go, left to right, so a cell the user switched off by hand
 * is not among them. The last one standing is never dropped: a table of nothing
 * is worse than a table that overruns.
 *
 * Zoom scales the whole box, so what a cell needs shrinks in step with it and
 * one measurement per attempt is enough.
 */
export function fitToPage(
  droppable: readonly number[],
  measure: (hidden: number[]) => Measured,
): PagePlan {
  const hidden: number[] = []
  const left = [...droppable]

  for (;;) {
    const { required, available } = measure(hidden)
    // No layout to read: jsdom, or a table that is not on the page yet.
    if (available <= 0) return { scale: 1, hidden, overflows: false }
    if (required <= available) return { scale: 1, hidden, overflows: false }

    const scale = available / required
    if (scale >= MIN_SCALE) return { scale, hidden, overflows: false }
    if (left.length <= 1) return { scale: MIN_SCALE, hidden, overflows: true }

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
