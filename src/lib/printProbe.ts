import { fitToPage, type Measured, type PrintFit } from './printFit'

/**
 * Measures what the table needs on paper by laying a copy of it out at the width
 * of an A4 page.
 *
 * The copy stays in the live document on purpose. A scoped `td.svelte-hash`
 * outranks the bare `td` of a global stylesheet, so the components' own rules are
 * what governs the cells in print as well; a copy that keeps them measures the
 * same table the printer gets. `.print-probe` in print.css only repeats the
 * handful of overrides those components declare for print.
 */
const CONTROLS = 'textarea'

function probeContainer(): HTMLElement {
  const probe = document.createElement('div')
  probe.className = 'print-probe'
  probe.setAttribute('aria-hidden', 'true')
  return probe
}

/**
 * Print draws a textarea as its text. `cloneNode` is no help here: it copies a
 * textarea's markup, not its value, so dropping the clone and leaving the
 * cell's own `::after` is what carries the text into the measurement.
 */
function flattenControls(copy: HTMLElement): void {
  // The cell's own ::after already carries the text and wraps it the way the
  // textarea does, so dropping the field leaves the width unchanged.
  for (const node of copy.querySelectorAll(CONTROLS)) node.remove()
}

function measureOnce(
  table: HTMLTableElement,
  hidden: readonly number[],
  wrapHeaders: boolean,
): Measured {
  const probe = probeContainer()
  const copy = table.cloneNode(true) as HTMLTableElement

  // The same custom property the printed table reads, so the copy is measured
  // wrapping exactly where the paper would. The clone brings the live table's
  // value along, which is last run's answer, not this attempt's.
  copy.style.setProperty('--header-wrap', wrapHeaders ? 'normal' : 'nowrap')
  flattenControls(copy)
  for (const node of copy.querySelectorAll('.no-print')) node.remove()
  // Last run's guesses, which this run is free to take back.
  for (const node of copy.querySelectorAll('.print-auto-hidden')) {
    node.classList.remove('print-auto-hidden')
  }
  for (const position of hidden) {
    for (const row of copy.rows) row.cells[position]?.classList.add('print-hidden')
  }

  probe.append(copy)
  document.body.append(probe)
  const measured = { required: probe.scrollWidth, available: probe.clientWidth }
  probe.remove()
  return measured
}

/**
 * `ids` names the cells the table prints, in order, so a position in the answer
 * can be handed back as the slot it belongs to. `droppable` are the positions
 * that may be given up.
 */
export function fitTableToPage(
  table: HTMLTableElement,
  ids: readonly string[],
  droppable: readonly number[],
): PrintFit {
  const plan = fitToPage(droppable, (hidden, wrapHeaders) =>
    measureOnce(table, hidden, wrapHeaders),
  )
  const hidden: string[] = []
  for (const position of plan.hidden) {
    const id = ids[position]
    if (id !== undefined) hidden.push(id)
  }
  return {
    scale: plan.scale,
    hidden,
    wrapHeaders: plan.wrapHeaders,
    overflows: plan.overflows,
  }
}
