import { expect, test, type Page } from '@playwright/test'

function durationInput(rowNumber: number): string {
  return `tbody tr:nth-child(${rowNumber}) td[data-column-type="duration"] textarea`
}

/** The first text column of a row; the default document has more than one. */
function textInput(page: Page, rowNumber: number) {
  return page
    .locator(`tbody tr:nth-child(${rowNumber}) td[data-column-type="text"] textarea`)
    .first()
}

async function addColumn(page: Page, name: string): Promise<void> {
  await page.getByTitle('Spalte hinzufügen').click()
  await page.getByLabel('Spaltenname').fill(name)
  await page.keyboard.press('Escape')
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

test('an unreadable duration counts as zero and is flagged in its cell', async ({ page }) => {
  await openNewDocument(page)

  await page.fill(durationInput(1), 'tbd')

  await expect(page.locator('tbody .time-column')).toHaveText(['09:00', '09:00'])
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
  // No add button: the empty entry at the end of the list is the new one.
  await page.getByLabel('Wert: Räume').fill('Saal')
  await page.getByRole('button', { name: 'Schließen' }).click()

  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await page.getByTitle('Spalte hinzufügen').click()
  await page.getByLabel('Spaltenname').fill('Ort')
  await page.getByLabel('Typ').selectOption('select')
  await page.getByLabel('Liste', { exact: true }).selectOption({ label: 'Räume' })

  const cell = page.locator('tbody tr:nth-child(1) td[data-column-type="select"]')
  await cell.locator('select').selectOption('Saal')
  await expect(cell.locator('select')).toHaveValue('Saal')

  await cell.locator('select').selectOption('__custom__')
  await cell.locator('textarea').fill('Küche')
  await expect(cell.locator('textarea')).toHaveValue('Küche')
})

test('the lists dialog closes on a click beside it, not on one inside it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Auswahllisten' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()

  // The dialog's own padding is part of the element the backdrop click lands on.
  const box = (await dialog.boundingBox())!
  await page.mouse.click(box.x + 4, box.y + 4)
  await expect(dialog).toBeVisible()

  await page.mouse.click(5, 5)
  await expect(dialog).toBeHidden()
})

test('an edited list value reaches the cells that offer it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Auswahllisten' }).click()
  await page.getByLabel('Name der Liste').fill('Räume')
  await page.getByRole('button', { name: 'Neue Liste' }).click()
  await page.getByLabel('Wert: Räume').fill('Sal')
  await page.getByRole('button', { name: 'Schließen' }).click()

  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await page.getByTitle('Spalte hinzufügen').click()
  await page.getByLabel('Spaltenname').fill('Ort')
  await page.getByLabel('Typ').selectOption('select')
  await page.getByLabel('Liste', { exact: true }).selectOption({ label: 'Räume' })

  // The typo is corrected in place, not deleted and typed again.
  await page.getByTitle('Listen bearbeiten').click()
  await page.getByLabel('Wert: Räume').first().fill('Saal')
  await page.getByRole('button', { name: 'Schließen' }).click()

  const cell = page.locator('tbody tr:nth-child(1) td[data-column-type="select"] select')
  await expect(cell.locator('option')).toHaveText(['', 'Saal', 'Eigener Wert …'])
  await cell.selectOption('Saal')
  await expect(cell).toHaveValue('Saal')
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

  await page.locator('thead .column-name').first().click()
  await page.getByRole('button', { name: 'Spalte löschen' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Spalte löschen' }).click()

  await expect(page.locator('thead .column-name')).toHaveText(['Programmpunkt', 'Verantwortlich'])
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

test('a click low in a tall row still lands in the cell it was aimed at', async ({ page }) => {
  await openNewDocument(page)

  await textInput(page, 1).fill(
    'Ein ziemlich langer Text, der in dieser Spalte über mehrere Zeilen läuft',
  )
  const neighbour = page.locator('tbody tr:nth-child(1) td[data-column-type="text"]').nth(1)
  const box = (await neighbour.boundingBox())!
  expect(box.height).toBeGreaterThan(40)

  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 4)

  await expect(neighbour.locator('textarea')).toBeFocused()
})

test('a click low in a tall row reaches a dropdown too', async ({ page }) => {
  await openNewDocument(page)
  await page.getByTitle('Spalte hinzufügen').click()
  await page.getByLabel('Spaltenname').fill('Ort')
  await page.getByLabel('Typ').selectOption('select')
  await page.keyboard.press('Escape')

  await textInput(page, 1).fill(
    'Ein ziemlich langer Text, der in dieser Spalte über mehrere Zeilen läuft',
  )
  const cell = page.locator('tbody tr:nth-child(1) td[data-column-type="select"]')
  const box = (await cell.boundingBox())!
  expect(box.height).toBeGreaterThan(40)

  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 4)

  await expect(cell.locator('select')).toBeFocused()
})

test('a chosen value starts where a typed one does', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Auswahllisten' }).click()
  await page.getByLabel('Name der Liste').fill('Räume')
  await page.getByRole('button', { name: 'Neue Liste' }).click()
  await page.getByLabel('Wert: Räume').fill('Saal')
  await page.getByRole('button', { name: 'Schließen' }).click()

  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await page.getByTitle('Spalte hinzufügen').click()
  await page.getByLabel('Spaltenname').fill('Ort')
  await page.getByLabel('Typ').selectOption('select')
  await page.getByLabel('Liste', { exact: true }).selectOption({ label: 'Räume' })

  const row = page.locator('tbody tr:nth-child(1)')
  await row.locator('td[data-column-type="select"] select').selectOption('Saal')

  // Measured from each cell's own left edge: the columns sit at different
  // places in the table, the value inside them should not.
  const inset = (selector: string) =>
    row
      .locator(selector)
      .first()
      .evaluate((node: HTMLElement) => {
        const cell = node.closest('td')!.getBoundingClientRect()
        const style = getComputedStyle(node)
        const own = node.getBoundingClientRect().x - cell.x + parseFloat(style.paddingLeft)
        // A dropdown with its chrome on draws its value past its own box; print
        // takes the chrome away and the value moves back to the box.
        const chrome = node instanceof HTMLSelectElement && style.appearance === 'auto'
        return chrome ? own + 6 : own
      })

  const typed = await inset('td[data-column-type="text"] textarea')
  const chosen = await inset('td[data-column-type="select"] select')
  expect(Math.abs(chosen - typed)).toBeLessThan(1)

  await page.emulateMedia({ media: 'print' })

  const printedTyped = await inset('td[data-column-type="text"] textarea')
  const printedChosen = await inset('td[data-column-type="select"] select')
  expect(Math.abs(printedChosen - printedTyped)).toBeLessThan(1)
})

test('a dropdown shows its longest value in full', async ({ page }) => {
  // Narrow on purpose: with room to spare every layout looks fine, the crop
  // only shows up once the columns compete for the width.
  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Auswahllisten' }).click()
  await page.getByLabel('Name der Liste').fill('Räume')
  await page.getByRole('button', { name: 'Neue Liste' }).click()
  await page.getByLabel('Wert: Räume').fill('Honigkuchenpferd im großen Saal')
  await page.getByRole('button', { name: 'Schließen' }).click()

  await page.getByRole('button', { name: 'Neues Dokument' }).click()
  await page.getByTitle('Spalte hinzufügen').click()
  await page.getByLabel('Spaltenname').fill('Ort')
  await page.getByLabel('Typ').selectOption('select')
  await page.getByLabel('Liste', { exact: true }).selectOption({ label: 'Räume' })

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

test('a column can be moved with the keyboard alone', async ({ page }) => {
  await openNewDocument(page)

  const headings = page.locator('thead .column-name')
  await expect(headings).toHaveText(['Uhrzeit', 'Programmpunkt', 'Verantwortlich'])

  const handle = page.locator('thead th:nth-child(5) .drag-handle')
  await expect(handle).toHaveAttribute('aria-describedby', 'drag-help')

  await handle.focus()
  await page.keyboard.press(' ')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press(' ')

  await expect(headings).toHaveText(['Uhrzeit', 'Verantwortlich', 'Programmpunkt'])
})

test('the sheet holds its width while the table fits, then grows to a limit', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await openNewDocument(page)

  const sheetWidth = async () => (await page.locator('main').boundingBox())!.width
  const overflows = () =>
    page.locator('.scroller').evaluate((node) => node.scrollWidth > node.clientWidth + 1)

  expect(await sheetWidth()).toBe(960)
  await addColumn(page, 'Raum')
  expect(await sheetWidth()).toBe(960)
  expect(await overflows()).toBe(false)

  const widths: number[] = []
  for (let index = 1; index <= 12; index++) {
    await addColumn(page, `Spalte ${index}`)
    widths.push(await sheetWidth())
  }

  // Wider than the 60rem it started at, never wider than the 90rem cap, and
  // never narrower than it already was.
  expect(widths.some((width) => width > 960 && width < 1440)).toBe(true)
  expect(Math.max(...widths)).toBe(1440)
  expect(widths.every((width, index) => index === 0 || width >= widths[index - 1])).toBe(true)

  // Past the cap the table is back to scrolling inside its own box.
  expect(await overflows()).toBe(true)
})

test('a long column name wraps instead of widening the sheet further', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await openNewDocument(page)

  const name = page.locator('thead .column-name').nth(1)
  const oneLine = (await name.boundingBox())!.height
  await name.click()
  await page.getByLabel('Spaltenname').fill('Unterrichtsvorbereitungsphase')
  await page.keyboard.press('Escape')
  await expect(name).toHaveText('Unterrichtsvorbereitungsphase')

  const { box, text } = await name.evaluate((node: HTMLElement) => {
    const style = getComputedStyle(node)
    const pen = document.createElement('canvas').getContext('2d')!
    pen.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    return { box: node.clientWidth, text: pen.measureText(node.textContent!).width }
  })

  expect(box).toBeLessThan(text)
  expect((await name.boundingBox())!.height).toBeGreaterThan(oneLine)
  expect((await page.locator('main').boundingBox())!.width).toBe(960)
})

test('a table wider than its box says so at the edge it continues past', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 700 })
  await openNewDocument(page)

  const frame = page.locator('.frame')
  await expect(frame).not.toHaveClass(/more-right/)

  for (const name of ['Raum', 'Technik', 'Material', 'Bemerkung']) {
    await addColumn(page, name)
  }

  await frame.locator('.scroller').evaluate((node) => node.scrollTo({ left: 0 }))
  await expect(frame).toHaveClass(/more-right/)
  await expect(frame).not.toHaveClass(/more-left/)

  await frame.locator('.scroller').evaluate((node) => node.scrollTo({ left: node.scrollWidth }))
  await expect(frame).toHaveClass(/more-left/)
  await expect(frame).not.toHaveClass(/more-right/)
})
