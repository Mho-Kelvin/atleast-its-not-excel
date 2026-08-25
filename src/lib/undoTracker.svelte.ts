import { createHistory, record, redo, undo } from './history'
import type { ScheduleDocument } from './types'

/** updatedAt is pinned out of the key: we set it ourselves, and a key that saw it
    would make the effect retrigger itself forever. */
function changeKey(document: ScheduleDocument): string {
  return JSON.stringify({ ...document, updatedAt: 0 })
}

/**
 * Watches one document and pushes a snapshot onto the history whenever it
 * changes. Create it after any effect that edits the same document in the same
 * tick, so that edit lands in the snapshot instead of costing a second undo step.
 *
 * `suspended` holds recording off while a drag is in flight, which rewrites the
 * order on every pointer move; one drag then costs one undo step.
 */
export function createUndoTracker(document: () => ScheduleDocument, suspended: () => boolean) {
  const history = createHistory()
  let lastKey = ''
  let lastSnapshot = ''
  let applyingHistory = false

  $effect(() => {
    const current = document()
    if (suspended()) return

    const key = changeKey(current)
    if (key === lastKey) return

    if (lastSnapshot !== '' && !applyingHistory) record(history, lastSnapshot)
    applyingHistory = false
    lastKey = key
    lastSnapshot = JSON.stringify(current)
    current.updatedAt = Date.now()
  })

  /** A restored snapshot must not be recorded as a fresh edit of its own. */
  function take(snapshot: string | null): string | null {
    if (snapshot !== null) applyingHistory = true
    return snapshot
  }

  return {
    get lastSnapshot(): string {
      return lastSnapshot
    },
    undoFrom(current: string): string | null {
      return take(undo(history, current))
    },
    redoFrom(current: string): string | null {
      return take(redo(history, current))
    },
  }
}
