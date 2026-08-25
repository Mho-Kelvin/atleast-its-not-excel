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
const CONTROLS = 'textarea, select'

function probeContainer(): HTMLElement {
  const probe = document.createElement('div')
  probe.className = 'print-probe'
  probe.setAttribute('aria-hidden', 'true')
  return probe
}

/**
 * Print draws a control as its text. `cloneNode` is no help here: it copies a
 * textarea's markup and a select's `selected` attribute, neither of which is the
 * value on screen, so the values are taken from the live table. Source and copy
 * still match one for one at this point, which is what lines the two lists up.
 */
function flattenControls(source: HTMLElement, copy: HTMLElement): void {
  const originals = source.querySelectorAll(CONTROLS)
  const copies = copy.querySelectorAll(CONTROLS)

  originals.forEach((control, index) => {
    const clone = copies[index]
    if (control instanceof HTMLSelectElement) {
      // A select never wraps, so its value sets a floor for the column's width.
      const value = document.createElement('span')
      value.className = 'probe-value'
      value.textContent = control.selectedOptions[0]?.text ?? ''
      clone.replaceWith(value)
      return
    }
    // The cell's own ::after already carries the text and wraps it the way the
    // textarea does, so dropping the field leaves the width unchanged.
    clone.remove()
  })
}

function measureOnce(table: HTMLTableElement, hidden: readonly number[]): Measured {
  const probe = probeContainer()
  const copy = table.cloneNode(true) as HTMLTableElement

  flattenControls(table, copy)
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
  const plan = fitToPage(droppable, (hidden) => measureOnce(table, hidden))
  const hidden: string[] = []
  for (const position of plan.hidden) {
    const id = ids[position]
    if (id !== undefined) hidden.push(id)
  }
  return { scale: plan.scale, hidden, overflows: plan.overflows }
}
