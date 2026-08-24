import type { Column, ColumnType, Row, ScheduleDocument } from './types'

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
