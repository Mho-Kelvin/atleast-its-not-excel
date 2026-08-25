import { expect, test, type Page } from '@playwright/test'

function durationInput(rowNumber: number): string {
  return `tbody tr:nth-child(${rowNumber}) td[data-column-type="duration"] input`
}

/** The first text column of a row; the default document has more than one. */
function textInput(page: Page, rowNumber: number) {
  return page.locator(`tbody tr:nth-child(${rowNumber}) td[data-column-type="text"] input`).first()
}

async function openNewDocument(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await expect(page.locator('table')).toBeVisible()
}

test('a typed duration moves the next row down the clock', async ({ page }) => {
  await openNewDocument(page)

  await page.fill(durationInput(1), '15')
  await page.getByRole('button', { name: 'Zeile hinzufügen' }).click()
  await page.fill(durationInput(2), '1h30')
  await page.getByRole('button', { name: 'Zeile hinzufügen' }).click()

  await expect(page.locator('tbody .time-column')).toHaveText(['09:00', '09:15', '10:45'])
})

test('an unreadable duration stops the clock instead of guessing', async ({ page }) => {
  await openNewDocument(page)

  await page.fill(durationInput(1), 'tbd')
  await page.getByRole('button', { name: 'Zeile hinzufügen' }).click()

  await expect(page.locator('tbody .time-column')).toHaveText(['09:00', ''])
  await expect(page.locator('input.cell-invalid')).toHaveCount(1)
})

test('print media hides the app chrome and keeps the table', async ({ page }) => {
  await openNewDocument(page)
  await page.fill(durationInput(1), '15')

  await page.emulateMedia({ media: 'print' })

  await expect(page.getByRole('button', { name: 'Drucken' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Zeile hinzufügen' })).toBeHidden()
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
  await page.getByLabel('Wert hinzufügen: Räume').fill('Saal')
  await page.getByRole('button', { name: 'Wert hinzufügen' }).click()
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
  await cell.locator('input').fill('Küche')
  await expect(cell.locator('input')).toHaveValue('Küche')
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
  await expect(page.locator('tbody .time-column')).toHaveText(['09:00'])
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
  await page.getByRole('button', { name: 'Zeile hinzufügen' }).click()
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
