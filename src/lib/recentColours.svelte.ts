/**
 * The last few off-palette colours a user picked, shared between the editor
 * toolbar and every column panel: the panel sits three components below App
 * through `ScheduleTable`, which already sits at the line cap, so a shared
 * module costs less than threading a prop the whole way down for it alone.
 * App seeds `list` from `store.recentColours` once and writes it back on
 * every change, which is what makes it persist.
 */
export const recentColours = $state<{ list: string[] }>({ list: [] })
