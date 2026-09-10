/**
 * Which cell holds focus, read off the DOM: a focusin bubbling up through
 * `.sheet` is the only signal that says a cell was entered, and the `td`
 * already carries both ids as data attributes for `TableRow`'s own styling.
 * A focusin that lands on the sheet but on no such cell clears both ids.
 */
export function createFocusedCell() {
  let rowId = $state<string | null>(null)
  let columnId = $state<string | null>(null)

  function readCell(target: EventTarget | null): void {
    const cell = (target as HTMLElement | null)?.closest('td[data-row-id][data-column-id]')
    rowId = cell?.getAttribute('data-row-id') ?? null
    columnId = cell?.getAttribute('data-column-id') ?? null
  }

  // A click on the sheet that lands on no cell (e.g. the padding around the
  // table) does not always move focus, so focusin never fires to clear the
  // stale ids on its own.
  function onClick(event: MouseEvent): void {
    readCell(event.target)
  }

  return {
    get rowId(): string | null {
      return rowId
    },
    get columnId(): string | null {
      return columnId
    },
    onFocusIn: (event: FocusEvent) => readCell(event.target),
    onClick,
  }
}
