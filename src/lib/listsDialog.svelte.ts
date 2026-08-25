/**
 * Whether the lists dialog is up, held outside the component tree: the column
 * settings panel opens it from three levels below the App, and threading a
 * prop through the table for one button is worse than one module of state.
 */
export const listsDialog = $state<{ open: boolean; focusListId: string | null }>({
  open: false,
  focusListId: null,
})

export function openLists(focusListId: string | null = null): void {
  listsDialog.focusListId = focusListId
  listsDialog.open = true
}

export function closeLists(): void {
  listsDialog.open = false
  listsDialog.focusListId = null
}
