import type { SelectList, Store } from './types'

export function createList(name: string): SelectList {
  return { id: crypto.randomUUID(), name, values: [] }
}

/** Never a list value: the dropdown entry that turns the cell into a text box. */
export const CUSTOM_VALUE = '__custom__'

/**
 * Deleting a list also clears it off every column that pointed at it, in every
 * document. A column left holding a dead list id would show an empty dropdown
 * with no way to tell why.
 */
export function removeList(store: Store, listId: string): void {
  store.lists = store.lists.filter((list) => list.id !== listId)
  for (const document of store.documents) {
    for (const column of document.columns) {
      if (column.listId === listId) column.listId = undefined
    }
  }
}

export function listValues(lists: readonly SelectList[], listId: string | undefined): string[] {
  return lists.find((list) => list.id === listId)?.values ?? []
}
