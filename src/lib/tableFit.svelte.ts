import { PRINTS_AS_IS, type PrintFit } from './printFit'
import { fitTableToPage } from './printProbe'

/** Long enough that measuring costs one reflow per pause, not one per keystroke. */
const MEASURE_DELAY = 300

/**
 * Keeps one table's answer to the page: how far it has to shrink, and which
 * cells had to come off it.
 *
 * `changed` is the document's `updatedAt`, which is the one signal that says the
 * document was edited, and which the undo tracker holds still while a drag is in
 * flight, so the table is not measured again on every frame of one.
 */
export function createTableFit(
  table: () => HTMLTableElement | undefined,
  changed: () => number,
  cells: () => { ids: string[]; droppable: number[] },
) {
  let fit = $state<PrintFit>(PRINTS_AS_IS)

  $effect(() => {
    const written = `${changed()}`
    const settle = setTimeout(() => {
      const node = table()
      if (node === undefined || written === '') return
      const { ids, droppable } = cells()
      fit = fitTableToPage(node, ids, droppable)
    }, MEASURE_DELAY)
    return () => clearTimeout(settle)
  })

  return {
    get value(): PrintFit {
      return fit
    },
    get hidden(): readonly string[] {
      return fit.hidden
    },
  }
}
