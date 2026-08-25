export type ColumnType = 'text' | 'select' | 'duration'

export interface Column {
  id: string
  title: string
  type: ColumnType
  /** Only set on 'select' columns: which user-managed list the cell picks from. */
  listId?: string
  /** Absent means the column prints, so documents stored before this existed keep printing. */
  hideInPrint?: boolean
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

export interface StartTime {
  id: string
  time: string
  /** Optional label, shown in front of the time. */
  name?: string
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
  /**
   * Which start-time entry was picked. Only needed to tell two entries on the
   * same time apart; the time above is what everything else reads.
   */
  startTimeId?: string
  columns: Column[]
  rows: Row[]
  /** The start-time cell is not a column, so its name and print flag live here. */
  timeTitle?: string
  hideTimeInPrint?: boolean
  updatedAt: number
}

export interface Store {
  documents: ScheduleDocument[]
  lists: SelectList[]
  /** The times the start-time field offers. Fixed: it is never attached to a column, never deleted. */
  startTimes: StartTime[]
}
