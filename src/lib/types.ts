export type ColumnType = 'text' | 'select' | 'duration'

/** Whole-cell formatting. Cell text stays a plain string, so inline runs can come later. */
export interface CellStyle {
  bold?: boolean
  italic?: boolean
  /** Hex like "#a81f30". */
  colour?: string
}

export interface Column {
  id: string
  title: string
  type: ColumnType
  /** Only set on 'select' columns: which user-managed list the cell picks from. */
  listId?: string
  /** Absent means the column prints, so documents stored before this existed keep printing. */
  hideInPrint?: boolean
  /** Preset for the column's cells, never the heading. */
  style?: CellStyle
}

export interface Row {
  id: string
  /** Raw text per column id. Parsing happens on read, never on store. */
  cells: Record<string, string>
  /** Per column id, overrides the column's style preset per property. */
  styles?: Record<string, CellStyle>
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
  /** Absent means the Beginn line prints, so documents stored before this existed keep printing. */
  hideStartTimeInPrint?: boolean
  columns: Column[]
  rows: Row[]
  /** The start-time cell is not a column, so its name and print flag live here. */
  timeTitle?: string
  hideTimeInPrint?: boolean
  /** The computed Uhrzeit cells. No per-row override: there is nothing to focus there. */
  timeStyle?: CellStyle
  /** Absent means portrait, so documents stored before this existed keep printing portrait. */
  landscape?: boolean
  updatedAt: number
}

/** What an import actually added, per drawer, for the message it reports. */
export interface ImportCounts {
  documents: number
  templates: number
  lists: number
  startTimes: number
}

export interface Store {
  documents: ScheduleDocument[]
  /** Saved documents a new one can start from. Copies, with no link back. */
  templates: ScheduleDocument[]
  lists: SelectList[]
  /** The times the start-time field offers. Fixed: it is never attached to a column, never deleted. */
  startTimes: StartTime[]
  /** Max 3, newest first, colours outside PALETTE only. Persisted, never exported. */
  recentColours: string[]
}
