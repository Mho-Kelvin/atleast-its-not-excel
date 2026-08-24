export type ColumnType = 'text' | 'longText' | 'select' | 'duration'

export interface Column {
  id: string
  title: string
  type: ColumnType
  /** Only set on 'select' columns: which user-managed list the cell picks from. */
  listId?: string
}

export interface Row {
  id: string
  /** Raw text per column id. Parsing happens on read, never on store. */
  cells: Record<string, string>
}

export interface SelectList {
  id: string
  name: string
  values: string[]
}

export interface HeaderField {
  id: string
  label: string
  value: string
}

export interface ScheduleDocument {
  id: string
  title: string
  headerFields: HeaderField[]
  /** Time of day the first row starts, as "09:00". */
  startTime: string
  columns: Column[]
  rows: Row[]
  updatedAt: number
}

export interface Store {
  documents: ScheduleDocument[]
  lists: SelectList[]
}
