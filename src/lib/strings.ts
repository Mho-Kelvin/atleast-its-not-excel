/** Every user-visible string in the app. Nothing German belongs outside this file. */
export const strings = {
  appTitle: 'Ablaufplan',

  documentTitleLabel: 'Titel',
  documentTitlePlaceholder: 'Ohne Titel',
  startTimeLabel: 'Beginn',
  startTimeInvalid: 'Keine gültige Uhrzeit',
  startTimeColumn: 'Uhrzeit',
  durationInvalid: 'Dauer nicht lesbar',

  addRow: 'Zeile hinzufügen',
  removeRow: 'Zeile löschen',
  dragRow: 'Zeile verschieben',
  dragColumn: 'Spalte verschieben',
  print: 'Drucken',
  undo: 'Rückgängig',
  redo: 'Wiederholen',
  back: 'Zurück',

  documents: 'Dokumente',
  newDocument: 'Neues Dokument',
  openDocument: 'Öffnen',
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
  durationColumnTaken: 'Es kann nur eine Dauer-Spalte geben.',
  printColumn: 'Spalte drucken',
  printTime: 'Uhrzeit drucken',
  printDuration: 'Dauer drucken',
  notPrinted: 'Wird nicht gedruckt',
  confirmDeleteColumn: 'Diese Spalte mit allen Inhalten löschen?',

  lists: 'Auswahllisten',
  newList: 'Neue Liste',
  listNameLabel: 'Name der Liste',
  addValue: 'Wert hinzufügen',
  removeValue: 'Wert löschen',
  deleteList: 'Liste löschen',
  noLists: 'Noch keine Listen.',
  confirmDeleteList: 'Diese Liste löschen? Spalten, die sie nutzen, verlieren ihre Auswahl.',

  headerFields: 'Kopfzeile',
  addHeaderField: 'Feld hinzufügen',
  removeHeaderField: 'Feld löschen',
  headerFieldLabel: 'Bezeichnung',
  headerFieldValue: 'Inhalt',

  saveFailed: 'Speichern fehlgeschlagen. Der Speicher des Browsers ist voll.',

  columnTypes: {
    text: 'Text',
    longText: 'Mehrzeiliger Text',
    select: 'Auswahlliste',
    duration: 'Dauer',
  },
} as const

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
