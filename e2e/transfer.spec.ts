import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

async function newDocumentTitled(page: Page, title: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await page.getByRole('button', { name: 'Leeres Dokument' }).click()
  await page.getByLabel('Titel').fill(title)
  await page.getByRole('button', { name: 'Zurück' }).click()
}

/**
 * The point of the feature is that a real browser writes a file a real browser
 * reads back. Only a run out here exercises the blob, the download and the file
 * picker at once; jsdom stands in for all three.
 */
test('a document exported to a file comes back through the picker', async ({ page }) => {
  await newDocumentTitled(page, 'Sommerfest')

  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Dokument exportieren' }).click()
  const download = await downloading

  expect(download.suggestedFilename()).toMatch(/^Sommerfest-\d{4}-\d{2}-\d{2}\.json$/)

  const path = (await download.path())!
  const written = JSON.parse(readFileSync(path, 'utf8'))
  expect(written.format).toBe('atleast-its-not-excel')
  expect(written.documents).toHaveLength(1)

  await page.locator('input[type="file"]').setInputFiles(path)

  await expect(page.getByText('1 Dokument importiert')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sommerfest' })).toHaveCount(2)
})
