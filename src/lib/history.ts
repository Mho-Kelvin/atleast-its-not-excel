const LIMIT = 50

export interface History {
  past: string[]
  future: string[]
}

export function createHistory(): History {
  return { past: [], future: [] }
}

// NOTE: whole-document JSON snapshots, move to diffs only if a real
// document ever lags.
export function record(history: History, snapshot: string): void {
  history.past.push(snapshot)
  if (history.past.length > LIMIT) history.past.shift()
  history.future.length = 0
}

export function undo(history: History, current: string): string | null {
  const previous = history.past.pop()
  if (previous === undefined) return null
  history.future.push(current)
  return previous
}

export function redo(history: History, current: string): string | null {
  const next = history.future.pop()
  if (next === undefined) return null
  history.past.push(current)
  return next
}

export function clear(history: History): void {
  history.past.length = 0
  history.future.length = 0
}
