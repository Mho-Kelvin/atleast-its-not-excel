import type { AriaStrings } from 'svelte-dnd-action'

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

  columns: 'Spalten',
  addColumn: 'Spalte hinzufügen',
  removeColumn: 'Spalte löschen',
  columnTitleLabel: 'Spaltenname',
  columnTypeLabel: 'Typ',
  columnListLabel: 'Liste',
  noListChosen: 'Keine Liste',
  moveColumnUp: 'Spalte nach vorn',
  moveColumnDown: 'Spalte nach hinten',
  durationColumnTaken: 'Es kann nur eine Dauer-Spalte geben.',
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

/** What the drag-and-drop library reads out to screen readers. English by default. */
export const dragAriaStrings: AriaStrings = {
  dragStarted: ({ position, count }) => `Zeile aufgenommen, Position ${position} von ${count}.`,
  movedToPosition: ({ position, count }) => `Position ${position} von ${count}.`,
  movedToZoneStart: () => 'An den Anfang verschoben.',
  movedToZoneEnd: () => 'An das Ende verschoben.',
  dropped: ({ position, count }) => `Abgelegt auf Position ${position} von ${count}.`,
  zoneActiveInstruction:
    'Mit den Pfeiltasten verschieben, mit Leertaste oder Enter ablegen, mit Escape abbrechen.',
}
