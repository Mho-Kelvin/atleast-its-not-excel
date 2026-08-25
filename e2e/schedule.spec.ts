import { expect, test, type Page } from '@playwright/test'

function durationInput(rowNumber: number): string {
  return `tbody tr:nth-child(${rowNumber}) td[data-column-type="duration"] textarea`
}

/** The first text column of a row; the default document has more than one. */
function textInput(page: Page, rowNumber: number) {
  return page.locator(`tbody tr:nth-child(${rowNumber}) td[data-column-type="text"] textarea`).first()
}

async function openNewDocument(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await expect(page.locator('table')).toBeVisible()
}

test('a typed duration moves the next row down the clock', async ({ page }) => {
  await openNewDocument(page)

  // No row is added by hand: filling the draft row puts a fresh one below it.
  await page.fill(durationInput(1), '15')
  await page.fill(durationInput(2), '1h30')

  await expect(page.locator('tbody .time-column')).toHaveText(['09:00', '09:15', '10:45'])
})

test('an unreadable duration stops the clock instead of guessing', async ({ page }) => {
  await openNewDocument(page)

  await page.fill(durationInput(1), 'tbd')

  await expect(page.locator('tbody .time-column')).toHaveText(['09:00', ''])
  await expect(page.locator('textarea.cell-invalid')).toHaveCount(1)
})

test('filling a draft line makes a fresh one, in the header and in the table', async ({ page }) => {
  await openNewDocument(page)

  await expect(page.getByLabel('Bezeichnung')).toHaveCount(1)
  await page.getByLabel('Bezeichnung').fill('Ort')
  await expect(page.getByLabel('Bezeichnung')).toHaveCount(2)

  await expect(page.locator('tbody tr')).toHaveCount(1)
  await textInput(page, 1).fill('Begrüßung')
  await expect(page.locator('tbody tr')).toHaveCount(2)
})

test('filling the draft row costs one undo step, not two', async ({ page }) => {
  await openNewDocument(page)
  await textInput(page, 1).fill('Begrüßung')
  await expect(page.locator('tbody tr')).toHaveCount(2)

  await page.getByRole('button', { name: 'Rückgängig' }).click()

  await expect(textInput(page, 1)).toHaveValue('')
  await expect(page.locator('tbody tr')).toHaveCount(1)
})

test('Enter steps down into the row below', async ({ page }) => {
  await openNewDocument(page)

  await textInput(page, 1).fill('Begrüßung')
  await textInput(page, 1).press('Enter')

  await expect(textInput(page, 2)).toBeFocused()
})

test('print media hides the app chrome and keeps the table', async ({ page }) => {
  await openNewDocument(page)
  await page.fill(durationInput(1), '15')

  await page.emulateMedia({ media: 'print' })

  await expect(page.getByRole('button', { name: 'Drucken' })).toBeHidden()
  await expect(page.locator('tbody tr.draft')).toBeHidden()
  await expect(page.getByTitle('Spalte hinzufügen')).toBeHidden()
  await expect(page.getByTitle('Spalte verschieben').first()).toBeHidden()
  await expect(page.locator('table')).toBeVisible()
  await expect(page.locator('tbody .time-column').first()).toHaveText('09:00')

  // The header prints as bare text, without the editing chrome around it.
  await expect(page.locator('thead th').nth(2)).toHaveText('Dauer', { useInnerText: true })
})

test('an unnamed column prints as a blank header', async ({ page }) => {
  await openNewDocument(page)
  await page.getByTitle('Spalte hinzufügen').click()
  await expect(page.getByLabel('Spaltenname')).toBeVisible()

  await page.emulateMedia({ media: 'print' })

  await expect(page.locator('thead th').nth(5)).toHaveText('', { useInnerText: true })
})

test('a column switched off is gone from the print, the rest stays', async ({ page }) => {
  await openNewDocument(page)
  await page.fill(durationInput(1), '15')
  await textInput(page, 1).fill('Begrüßung')

  await page.getByRole('button', { name: 'Verantwortlich' }).click()
  await page.getByLabel('Spalte drucken').uncheck()
  // The time group's halves are switched independently: the duration goes, the
  // start time it feeds stays on the page.
  await page.locator('thead .column-name').first().click()
  await page.getByLabel('Dauer drucken').uncheck()

  await page.emulateMedia({ media: 'print' })

  await expect(page.locator('thead th:has-text("Verantwortlich")')).toBeHidden()
  await expect(page.locator('td[data-column-type="duration"]').first()).toBeHidden()
  await expect(page.locator('thead .time-column')).toBeVisible()
  await expect(page.locator('tbody .time-column').first()).toHaveText('09:00')
  await expect(textInput(page, 1)).toBeVisible()
})

test('the page renders onto A4 as a PDF', async ({ page }) => {
  await openNewDocument(page)
  await page.fill(durationInput(1), '15')

  const pdf = await page.pdf({ format: 'A4', printBackground: true })

  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  expect(pdf.byteLength).toBeGreaterThan(1000)
})

test('a document survives a reload and is listed on the start screen', async ({ page }) => {
  await openNewDocument(page)
  await page.getByLabel('Titel').fill('Generalprobe')
  await page.fill(durationInput(1), '20')

  await page.reload()

  await page.getByRole('button', { name: 'Generalprobe' }).click()
  await expect(page.locator(durationInput(1))).toHaveValue('20')
})

test('undo and redo walk the document back and forward', async ({ page }) => {
  await openNewDocument(page)

  await textInput(page, 1).fill('Begrüßung')
  await textInput(page, 1).fill('Begrüßung und Einführung')

  await page.getByRole('button', { name: 'Rückgängig' }).click()
  await expect(textInput(page, 1)).toHaveValue('Begrüßung')

  await page.getByRole('button', { name: 'Wiederholen' }).click()
  await expect(textInput(page, 1)).toHaveValue('Begrüßung und Einführung')
})

test('a dropdown column offers the values of its list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Auswahllisten' }).click()
  await page.getByLabel('Name der Liste').fill('Räume')
  await page.getByRole('button', { name: 'Neue Liste' }).click()
  // Enter, not the button: the start-time card carries a button of the same name.
  await page.getByLabel('Wert hinzufügen: Räume').fill('Saal')
  await page.getByLabel('Wert hinzufügen: Räume').press('Enter')
  await page.getByRole('button', { name: 'Zurück' }).click()

  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await page.getByTitle('Spalte hinzufügen').click()
  await page.getByLabel('Spaltenname').fill('Ort')
  await page.getByLabel('Typ').selectOption('select')
  await page.getByLabel('Liste').selectOption({ label: 'Räume' })

  const cell = page.locator('tbody tr:nth-child(1) td[data-column-type="select"]')
  await cell.locator('select').selectOption('Saal')
  await expect(cell.locator('select')).toHaveValue('Saal')

  await cell.locator('select').selectOption('__custom__')
  await cell.locator('textarea').fill('Küche')
  await expect(cell.locator('textarea')).toHaveValue('Küche')
})

test('columns can be dragged into a new order', async ({ page }) => {
  await openNewDocument(page)

  const headings = page.locator('thead .column-name')
  await expect(headings).toHaveText(['Uhrzeit', 'Programmpunkt', 'Verantwortlich'])

  const handle = page.locator('thead th:nth-child(5) .drag-handle')
  const target = page.locator('thead th:nth-child(4)')
  const from = (await handle.boundingBox())!
  const to = (await target.boundingBox())!

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 })
  await page.screenshot({ path: 'test-results/column-drag-midway.png' })
  await page.mouse.up()

  await expect(headings).toHaveText(['Uhrzeit', 'Verantwortlich', 'Programmpunkt'])
})

test('dragging the start time moves the duration column with it', async ({ page }) => {
  await openNewDocument(page)
  await page.fill(durationInput(1), '15')

  const handle = page.locator('thead th:nth-child(2) .drag-handle')
  const target = page.locator('thead th:nth-child(5)')
  const from = (await handle.boundingBox())!
  const to = (await target.boundingBox())!

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 })
  await page.mouse.up()

  // The pair moved together and stayed adjacent, time first.
  const headings = page.locator('thead th')
  await expect(page.locator('thead .column-name').first()).not.toHaveText('Uhrzeit')
  await expect(page.locator('thead .time-column')).toHaveCount(1)
  await expect(headings.nth(3)).toContainText('Uhrzeit')
  await expect(headings.nth(4)).toHaveText('Dauer')
  await expect(page.locator('tbody .time-column')).toHaveText(['09:00', '09:15'])
})

test('deleting the start time takes the duration column with it', async ({ page }) => {
  await openNewDocument(page)

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('thead .column-name').first().click()
  await page.getByRole('button', { name: 'Spalte löschen' }).click()

  await expect(page.locator('thead .column-name')).toHaveText([
    'Programmpunkt',
    'Verantwortlich',
  ])
  await expect(page.locator('.time-column')).toHaveCount(0)
  await expect(page.locator('td[data-column-type="duration"]')).toHaveCount(0)
})

test('one column drag costs one undo step', async ({ page }) => {
  await openNewDocument(page)

  const headings = page.locator('thead .column-name')
  const handle = page.locator('thead th:nth-child(5) .drag-handle')
  const target = page.locator('thead th:nth-child(4)')
  const from = (await handle.boundingBox())!
  const to = (await target.boundingBox())!

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 })
  await page.mouse.up()
  await expect(headings).toHaveText(['Uhrzeit', 'Verantwortlich', 'Programmpunkt'])

  await page.getByRole('button', { name: 'Rückgängig' }).click()

  await expect(headings).toHaveText(['Uhrzeit', 'Programmpunkt', 'Verantwortlich'])
})

test('rows can be dragged into a new order', async ({ page }) => {
  await openNewDocument(page)

  await textInput(page, 1).fill('Erste')
  await textInput(page, 2).fill('Zweite')

  const handle = page.locator('tbody tr:nth-child(1) .drag-handle')
  const target = page.locator('tbody tr:nth-child(2)')
  const from = (await handle.boundingBox())!
  const to = (await target.boundingBox())!

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height, { steps: 10 })
  await page.mouse.up()

  await expect(textInput(page, 1)).toHaveValue('Zweite')
  await expect(textInput(page, 2)).toHaveValue('Erste')
})

test('a cell grows with its text instead of cropping it', async ({ page }) => {
  await openNewDocument(page)

  const cell = textInput(page, 1)
  const oneLine = (await cell.boundingBox())!.height

  await cell.fill('Ein ziemlich langer Text, der in dieser Spalte über mehrere Zeilen laufen muss')

  const grown = (await cell.boundingBox())!.height
  expect(grown).toBeGreaterThan(oneLine)
  await expect(cell).toHaveJSProperty('scrollHeight', Math.round(grown))
})

test('a dropdown shows its longest value in full', async ({ page }) => {
  // Narrow on purpose: with room to spare every layout looks fine, the crop
  // only shows up once the columns compete for the width.
  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Auswahllisten' }).click()
  await page.getByLabel('Name der Liste').fill('Räume')
  await page.getByRole('button', { name: 'Neue Liste' }).click()
  await page.getByLabel('Wert hinzufügen: Räume').fill('Honigkuchenpferd im großen Saal')
  await page.getByLabel('Wert hinzufügen: Räume').press('Enter')
  await page.getByRole('button', { name: 'Zurück' }).click()

  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await page.getByTitle('Spalte hinzufügen').click()
  await page.getByLabel('Spaltenname').fill('Ort')
  await page.getByLabel('Typ').selectOption('select')
  await page.getByLabel('Liste').selectOption({ label: 'Räume' })

  const dropdown = page.locator('tbody tr:nth-child(1) td[data-column-type="select"] select')
  await dropdown.selectOption('Honigkuchenpferd im großen Saal')

  // A select crops its text without ever reporting an overflow, so the box is
  // measured against the text it is meant to show.
  const { box, text } = await dropdown.evaluate((node: HTMLSelectElement) => {
    const style = getComputedStyle(node)
    const pen = document.createElement('canvas').getContext('2d')!
    pen.font = `${style.fontSize} ${style.fontFamily}`
    return { box: node.clientWidth, text: pen.measureText(node.value).width }
  })
  expect(box).toBeGreaterThan(text)
})

test('a header keeps its handle, name and mark on one line', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 })
  await openNewDocument(page)

  const header = page.locator('thead th', { hasText: 'Programmpunkt' })
  const handle = header.locator('.drag-handle')
  const name = header.locator('.column-name')

  const handleBox = (await handle.boundingBox())!
  const nameBox = (await name.boundingBox())!
  expect(Math.abs(handleBox.y - nameBox.y)).toBeLessThan(handleBox.height)
  expect(nameBox.height).toBeLessThan(handleBox.height * 2)
})
