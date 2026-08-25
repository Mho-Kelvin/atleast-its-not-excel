import { SvelteSet } from 'svelte/reactivity'
import { CUSTOM_VALUE, listValues } from './lists'
import type { Column, Row, SelectList } from './types'

/**
 * The cells of `select` columns the user switched to free text. A value that is
 * not on the list counts as one too, so a document written before the list
 * changed still shows what it holds.
 */
export function createCustomCells(lists: () => SelectList[]) {
  const chosen = new SvelteSet<string>()

  function key(row: Row, column: Column): string {
    return `${row.id}:${column.id}`
  }

  return {
    is(row: Row, column: Column, value: string): boolean {
      if (chosen.has(key(row, column))) return true
      return value !== '' && !listValues(lists(), column.listId).includes(value)
    },
    choose(row: Row, column: Column, value: string): void {
      if (value === CUSTOM_VALUE) {
        chosen.add(key(row, column))
        row.cells[column.id] = ''
        return
      }
      row.cells[column.id] = value
    },
    /** Emptying the text box hands the dropdown back. */
    leave(row: Row, column: Column): void {
      if ((row.cells[column.id] ?? '') === '') chosen.delete(key(row, column))
    },
  }
}
