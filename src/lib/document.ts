import type { Column, ColumnType, HeaderField, Row, ScheduleDocument } from './types'

function newId(): string {
  return crypto.randomUUID()
}

export function createColumn(title: string, type: ColumnType): Column {
  return { id: newId(), title, type }
}

export function createRow(columns: readonly Column[]): Row {
  const cells: Record<string, string> = {}
  for (const column of columns) cells[column.id] = ''
  return { id: newId(), cells }
}

export function createDocument(title: string): ScheduleDocument {
  const columns = [
    createColumn('Dauer', 'duration'),
    createColumn('Programmpunkt', 'text'),
    createColumn('Verantwortlich', 'text'),
  ]
  return {
    id: newId(),
    title,
    headerFields: [],
    startTime: '09:00',
    columns,
    rows: [createRow(columns)],
    updatedAt: Date.now(),
  }
}

export function findDurationColumn(columns: readonly Column[]): Column | undefined {
  return columns.find((column) => column.type === 'duration')
}

/**
 * A document carries at most one duration column, because the start-time
 * cascade has to have a single unambiguous source.
 */
export function canAddColumnType(columns: readonly Column[], type: ColumnType): boolean {
  if (type !== 'duration') return true
  return findDurationColumn(columns) === undefined
}

export function addColumn(document: ScheduleDocument, column: Column): void {
  document.columns.push(column)
  for (const row of document.rows) row.cells[column.id] = ''
}

export function removeColumn(document: ScheduleDocument, columnId: string): void {
  document.columns = document.columns.filter((column) => column.id !== columnId)
  for (const row of document.rows) delete row.cells[columnId]
}

/** Moves a column by one position. Out-of-range moves are a no-op. */
export function moveColumn(document: ScheduleDocument, index: number, offset: number): void {
  const target = index + offset
  if (target < 0 || target >= document.columns.length) return
  const [column] = document.columns.splice(index, 1)
  document.columns.splice(target, 0, column)
}

export function createHeaderField(label = ''): HeaderField {
  return { id: newId(), label, value: '' }
}

/**
 * A copy with fresh ids throughout, so editing the copy cannot reach back into
 * the original through a shared column id.
 */
export function duplicateDocument(source: ScheduleDocument, title: string): ScheduleDocument {
  const newColumnIds = new Map<string, string>()
  const columns = source.columns.map((column) => {
    const id = newId()
    newColumnIds.set(column.id, id)
    return { ...column, id }
  })

  const rows = source.rows.map((row) => {
    const cells: Record<string, string> = {}
    for (const [oldColumnId, value] of Object.entries(row.cells)) {
      const newColumnId = newColumnIds.get(oldColumnId)
      if (newColumnId !== undefined) cells[newColumnId] = value
    }
    return { id: newId(), cells }
  })

  return {
    id: newId(),
    title,
    headerFields: source.headerFields.map((field) => ({ ...field, id: newId() })),
    startTime: source.startTime,
    columns,
    rows,
    updatedAt: Date.now(),
  }
}
