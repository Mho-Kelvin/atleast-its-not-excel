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
  addColumn: 'Spalte hinzufügen',
  removeColumn: 'Spalte löschen',
  print: 'Drucken',
  columnTypes: {
    text: 'Text',
    longText: 'Mehrzeiliger Text',
    select: 'Auswahlliste',
    duration: 'Dauer',
  },
} as const
