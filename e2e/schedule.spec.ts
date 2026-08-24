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
  await expect(page.getByRole('heading', { name: 'Spalten' })).toBeHidden()
  await expect(page.locator('table')).toBeVisible()
  await expect(page.locator('tbody .time-column').first()).toHaveText('09:00')
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
  await page.getByPlaceholder('Spaltenname').fill('Ort')
  await page.getByLabel('Typ').last().selectOption('select')
  await page.getByRole('button', { name: 'Spalte hinzufügen' }).click()
  await page.getByLabel('Liste').selectOption({ label: 'Räume' })

  const cell = page.locator('tbody tr:nth-child(1) td[data-column-type="select"] select')
  await cell.selectOption('Saal')
  await expect(cell).toHaveValue('Saal')
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
