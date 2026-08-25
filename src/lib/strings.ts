/** Every user-visible string in the app. Nothing German belongs outside this file. */
export const strings = {
  documentTitleLabel: 'Titel',
  documentTitlePlaceholder: 'Ohne Titel',
  startTimeLabel: 'Beginn',
  startTimeInvalid: 'Keine gültige Uhrzeit',
  startTimeColumn: 'Uhrzeit',
  durationInvalid: 'Dauer nicht lesbar',

  removeRow: 'Zeile löschen',
  dragRow: 'Zeile verschieben',
  dragColumn: 'Spalte verschieben',
  dragHelp: 'Zum Verschieben Leertaste drücken, dann Pfeiltasten. Escape bricht ab.',
  print: 'Drucken',
  undo: 'Rückgängig',
  redo: 'Wiederholen',
  back: 'Zurück',
  cancel: 'Abbrechen',
  close: 'Schließen',
  saved: 'Gespeichert',

  documents: 'Dokumente',
  newDocument: 'Neues Dokument',
  duplicateDocument: 'Duplizieren',
  deleteDocument: 'Löschen',
  copySuffix: '(Kopie)',
  noDocuments: 'Noch keine Dokumente.',
  lastChanged: 'Zuletzt geändert',
  confirmDeleteDocument: 'Dieses Dokument endgültig löschen?',

  addColumn: 'Spalte hinzufügen',
  removeColumn: 'Spalte löschen',
  columnSettings: 'Spalte bearbeiten',
  columnTitleLabel: 'Spaltenname',
  timeColumnTitleLabel: 'Name Uhrzeit-Spalte',
  durationColumnTitleLabel: 'Name Dauer-Spalte',
  columnTypeLabel: 'Typ',
  columnListLabel: 'Liste',
  noListChosen: 'Keine Liste',
  customValue: 'Eigener Wert …',
  durationColumnTaken: 'Es kann nur eine Dauer-Spalte geben.',
  printColumn: 'Spalte drucken',
  printTime: 'Uhrzeit drucken',
  printDuration: 'Dauer drucken',
  notPrinted: 'Wird nicht gedruckt',
  confirmDeleteColumn: 'Diese Spalte mit allen Inhalten löschen?',

  lists: 'Auswahllisten',
  editLists: 'Listen bearbeiten',
  startTimeList: 'Startzeiten',
  startTimeNameLabel: 'Bezeichnung (optional)',
  newList: 'Neue Liste',
  listNameLabel: 'Name der Liste',
  valueLabel: 'Wert',
  startTimeValueLabel: 'Uhrzeit',
  duplicateEntry: 'Kommt schon vor',
  startTimeMissing: 'Ohne Uhrzeit',
  removeValue: 'Wert löschen',
  deleteList: 'Liste löschen',
  noLists: 'Noch keine Listen.',
  confirmDeleteList: 'Diese Liste löschen? Spalten, die sie nutzen, verlieren ihre Auswahl.',

  removeHeaderField: 'Feld löschen',
  removeHeaderFieldNamed: (label: string) => `Feld „${label}“ löschen`,
  headerFieldLabel: 'Bezeichnung',
  headerFieldValue: 'Inhalt',

  saveFailed: 'Speichern fehlgeschlagen. Der Speicher des Browsers ist voll.',

  columnTypes: {
    text: 'Text',
    select: 'Auswahlliste',
    duration: 'Dauer',
  },
} as const

/** Counted things, which German declines. */
export const counts = {
  documentShape: (rows: number, columns: number) =>
    `${rows} ${rows === 1 ? 'Zeile' : 'Zeilen'} · ${columns} ${columns === 1 ? 'Spalte' : 'Spalten'}`,
}

/**
 * Spoken while dragging. The library's own announcements are switched off,
 * because it also overwrites the table's roles with list semantics and it
 * counts the fixed header cells as if they were columns.
 */
export const dragAnnouncements = {
  columnMoved: (name: string, position: number, count: number) =>
    `Spalte ${name}, Position ${position} von ${count}.`,
  columnDropped: (name: string, position: number, count: number) =>
    `Spalte ${name} abgelegt auf Position ${position} von ${count}.`,
  rowMoved: (position: number, count: number) => `Zeile, Position ${position} von ${count}.`,
  rowDropped: (position: number, count: number) =>
    `Zeile abgelegt auf Position ${position} von ${count}.`,
}
