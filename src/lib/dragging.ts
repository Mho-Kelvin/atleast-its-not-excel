import type { DndEvent } from 'svelte-dnd-action'
import { columnsFromDndItems, TIME_SLOT, type HeaderSlot } from './slots'
import { strings } from './strings'
import type { Row } from './types'

/**
 * Lifting a header cell out of table flow makes auto layout re-solve every
 * column width each frame, so the header stops lining up with the body. The
 * widths are pinned for the length of the drag and released afterwards, which
 * leaves the printed table's automatic widths untouched.
 */
export function freezeColumnWidths(headerRow: HTMLTableRowElement, dragging: () => boolean): void {
  for (const cell of headerRow.children) {
    const element = cell as HTMLElement
    element.style.width = `${element.getBoundingClientRect().width}px`
  }
  // A press that never turns into a drag gets no finalize event, so the widths
  // would otherwise stay pinned.
  window.addEventListener(
    'pointerup',
    () => {
      if (!dragging()) releaseColumnWidths(headerRow)
    },
    { once: true },
  )
}

export function releaseColumnWidths(headerRow: HTMLTableRowElement): void {
  for (const cell of headerRow.children) (cell as HTMLElement).style.width = ''
}

/** Null when the dragged item is not in the list, which leaves the last announcement standing. */
export function rowAnnouncement(
  event: CustomEvent<DndEvent<Row>>,
  phrase: (position: number, count: number) => string,
): string | null {
  const index = event.detail.items.findIndex((row) => row.id === event.detail.info.id)
  if (index < 0) return null
  return phrase(index + 1, event.detail.items.length)
}

export function columnAnnouncement(
  event: CustomEvent<DndEvent<HeaderSlot>>,
  phrase: (name: string, position: number, count: number) => string,
  timeTitle: string,
): string | null {
  const dragged = event.detail.info.id
  const columns = columnsFromDndItems(event.detail.items, dragged)
  const index =
    dragged === TIME_SLOT.id
      ? columns.findIndex((column) => column.type === 'duration')
      : columns.findIndex((column) => column.id === dragged)
  if (index < 0) return null

  const name =
    dragged === TIME_SLOT.id ? timeTitle : columns[index].title.trim() || strings.columnTitleLabel

  return phrase(name, index + 1, columns.length)
}
