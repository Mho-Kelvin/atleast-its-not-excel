import { describe, expect, it } from 'vitest'
import { fitToPage, printFitNotice, MIN_SCALE } from './printFit'

const PAGE = 700

/**
 * Stands in for the probe: every cell costs its width, a hidden one costs
 * nothing. `wrapped` is the same table with its headings broken across lines,
 * which is what a narrower cell means here.
 */
function measurer(widths: number[], available = PAGE, wrapped = widths) {
  return (hidden: number[], wrapHeaders: boolean) => {
    let required = 0
    const costs = wrapHeaders ? wrapped : widths
    costs.forEach((width, position) => {
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

    expect(fit).toEqual({ scale: 1, hidden: [], wrapHeaders: false, overflows: false })
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

    expect(fit).toEqual({ scale: 1, hidden: [], wrapHeaders: false, overflows: false })
  })

  it('leaves the headings on one line while shrinking alone is enough', () => {
    const fit = fitToPage(positions(4), measurer([200, 200, 200, 200], PAGE, [50, 50, 50, 50]))

    expect(fit.wrapHeaders).toBe(false)
    expect(fit.scale).toBeCloseTo(700 / 800)
  })

  it('breaks the headings once the floor is reached, and prints full size again', () => {
    // 900 needs 0.77, under the floor; wrapped it is 600 and fits as it stands.
    const fit = fitToPage(positions(3), measurer([300, 300, 300], PAGE, [200, 200, 200]))

    expect(fit.wrapHeaders).toBe(true)
    expect(fit.hidden).toEqual([])
    expect(fit.scale).toBe(1)
  })

  it('gives a cell up only after breaking the headings was not enough', () => {
    const fit = fitToPage(positions(3), measurer([400, 400, 400], PAGE, [300, 300, 300]))

    expect(fit.wrapHeaders).toBe(true)
    expect(fit.hidden).toEqual([2])
  })

  it('keeps the headings broken across every cell it drops', () => {
    const fit = fitToPage(
      positions(4),
      measurer([4000, 4000, 4000, 4000], PAGE, [400, 400, 400, 400]),
    )

    expect(fit.wrapHeaders).toBe(true)
    expect(fit.hidden).toEqual([3, 2])
  })
})

describe('printFitNotice', () => {
  it('says nothing when the table prints as it stands', () => {
    expect(printFitNotice({ scale: 1, hidden: [], wrapHeaders: false, overflows: false })).toBe('')
  })

  it('rounds down, so it never claims more room than it took', () => {
    expect(printFitNotice({ scale: 0.889, hidden: [], wrapHeaders: false, overflows: false })).toBe(
      'Auf 88% verkleinert',
    )
  })

  it('counts the columns it gave up, and declines the word', () => {
    expect(
      printFitNotice({ scale: 0.8, hidden: ['a'], wrapHeaders: false, overflows: false }),
    ).toBe('Auf 80% verkleinert, 1 Spalte ausgeblendet')
    expect(
      printFitNotice({ scale: 0.8, hidden: ['a', 'b'], wrapHeaders: false, overflows: false }),
    ).toBe('Auf 80% verkleinert, 2 Spalten ausgeblendet')
  })

  it('mentions only the columns when dropping one bought back the full size', () => {
    expect(printFitNotice({ scale: 1, hidden: ['a'], wrapHeaders: false, overflows: false })).toBe(
      '1 Spalte ausgeblendet',
    )
  })

  it('admits it when nothing left to give was enough', () => {
    expect(
      printFitNotice({ scale: 0.8, hidden: ['a', 'b'], wrapHeaders: false, overflows: true }),
    ).toBe('Passt nicht auf A4')
  })
})
