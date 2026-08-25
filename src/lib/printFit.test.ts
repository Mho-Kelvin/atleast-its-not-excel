import { describe, expect, it } from 'vitest'
import { fitToPage, printFitNotice, MIN_SCALE } from './printFit'

const PAGE = 700

/** Stands in for the probe: every cell costs its width, a hidden one costs nothing. */
function measurer(widths: number[], available = PAGE) {
  return (hidden: number[]) => {
    let required = 0
    widths.forEach((width, position) => {
      if (!hidden.includes(position)) required += width
    })
    return { required, available }
  }
}

function positions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
}

describe('fitToPage', () => {
  it('leaves a table that already fits alone', () => {
    const fit = fitToPage(positions(4), measurer([100, 100, 100, 100]))

    expect(fit).toEqual({ scale: 1, hidden: [], overflows: false })
  })

  it('shrinks a table that is a little too wide', () => {
    const fit = fitToPage(positions(4), measurer([200, 200, 200, 200]))

    expect(fit.scale).toBeCloseTo(700 / 800)
    expect(fit.hidden).toEqual([])
  })

  it('gives a cell up rather than shrink past the floor, and prints the rest full size', () => {
    // 900 wide would need 0.77, under the floor. Without it the table fits as it is.
    const fit = fitToPage(positions(3), measurer([300, 300, 300]))

    expect(fit.hidden).toEqual([2])
    expect(fit.scale).toBe(1)
  })

  it('stops dropping as soon as shrinking the rest is enough', () => {
    // 1000 needs 0.70, under the floor; the remaining 800 needs 0.875, over it.
    const fit = fitToPage(positions(5), measurer([200, 200, 200, 200, 200]))

    expect(fit.hidden).toEqual([4])
    expect(fit.scale).toBeCloseTo(700 / 800)
    expect(fit.scale).toBeGreaterThanOrEqual(MIN_SCALE)
  })

  it('keeps dropping from the right while one is not enough', () => {
    const fit = fitToPage(positions(4), measurer([400, 400, 400, 400]))

    expect(fit.hidden).toEqual([3, 2])
    expect(fit.overflows).toBe(false)
  })

  it('never drops the last cell standing, and says so when it still runs over', () => {
    const fit = fitToPage(positions(3), measurer([4000, 4000, 4000]))

    expect(fit.hidden).toEqual([2, 1])
    expect(fit.scale).toBe(MIN_SCALE)
    expect(fit.overflows).toBe(true)
  })

  it('leaves the cells the user switched off out of the sweep', () => {
    // Position 2 is hidden by hand: too wide to drop from, and never dropped.
    const fit = fitToPage([0, 1, 3], measurer([300, 300, 0, 300]))

    expect(fit.hidden).toEqual([3])
  })

  it('reports a fit when there is no layout to read', () => {
    const fit = fitToPage(positions(4), measurer([300, 300, 300, 300], 0))

    expect(fit).toEqual({ scale: 1, hidden: [], overflows: false })
  })
})

describe('printFitNotice', () => {
  it('says nothing when the table prints as it stands', () => {
    expect(printFitNotice({ scale: 1, hidden: [], overflows: false })).toBe('')
  })

  it('rounds down, so it never claims more room than it took', () => {
    expect(printFitNotice({ scale: 0.889, hidden: [], overflows: false })).toBe(
      'Auf 88% verkleinert',
    )
  })

  it('counts the columns it gave up, and declines the word', () => {
    expect(printFitNotice({ scale: 0.8, hidden: ['a'], overflows: false })).toBe(
      'Auf 80% verkleinert, 1 Spalte ausgeblendet',
    )
    expect(printFitNotice({ scale: 0.8, hidden: ['a', 'b'], overflows: false })).toBe(
      'Auf 80% verkleinert, 2 Spalten ausgeblendet',
    )
  })

  it('mentions only the columns when dropping one bought back the full size', () => {
    expect(printFitNotice({ scale: 1, hidden: ['a'], overflows: false })).toBe(
      '1 Spalte ausgeblendet',
    )
  })

  it('admits it when nothing left to give was enough', () => {
    expect(printFitNotice({ scale: 0.8, hidden: ['a', 'b'], overflows: true })).toBe(
      'Passt nicht auf A4',
    )
  })
})
