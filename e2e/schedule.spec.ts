import { expect, test } from '@playwright/test'

const durationCell = 'tbody tr:nth-child(%d) td[data-column-type="duration"] input'

function durationInput(rowNumber: number): string {
  return durationCell.replace('%d', String(rowNumber))
}

test('a typed duration moves the next row down the clock', async ({ page }) => {
  await page.goto('/')

  await page.fill(durationInput(1), '15')
  await page.getByRole('button', { name: 'Zeile hinzufügen' }).click()
  await page.fill(durationInput(2), '1h30')
  await page.getByRole('button', { name: 'Zeile hinzufügen' }).click()

  const times = page.locator('tbody .time-column')
  await expect(times).toHaveText(['09:00', '09:15', '10:45'])
})

test('an unreadable duration stops the clock instead of guessing', async ({ page }) => {
  await page.goto('/')

  await page.fill(durationInput(1), 'tbd')
  await page.getByRole('button', { name: 'Zeile hinzufügen' }).click()

  const times = page.locator('tbody .time-column')
  await expect(times).toHaveText(['09:00', ''])
  await expect(page.locator('input.cell-invalid')).toHaveCount(1)
})

test('print media hides the app chrome and keeps the table', async ({ page }) => {
  await page.goto('/')
  await page.fill(durationInput(1), '15')

  await page.emulateMedia({ media: 'print' })

  await expect(page.getByRole('button', { name: 'Drucken' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Zeile hinzufügen' })).toBeHidden()
  await expect(page.locator('table')).toBeVisible()
  await expect(page.locator('tbody .time-column').first()).toHaveText('09:00')
})

test('the page renders onto A4 as a PDF', async ({ page }) => {
  await page.goto('/')
  await page.fill(durationInput(1), '15')

  const pdf = await page.pdf({ format: 'A4', printBackground: true })

  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')
  expect(pdf.byteLength).toBeGreaterThan(1000)
})
