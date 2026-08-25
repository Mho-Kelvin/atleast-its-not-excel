import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import ScheduleTable from './ScheduleTable.svelte'
import { createDocument, createRow, findDurationColumn } from './document'

function planWithDurations(...durations: string[]) {
  const plan = createDocument('Ablauf')
  const durationColumn = findDurationColumn(plan.columns)!
  plan.rows = durations.map((text) => {
    const row = createRow(plan.columns)
    row.cells[durationColumn.id] = text
    return row
  })
  return plan
}

function startTimeTexts(container: HTMLElement): string[] {
  return [...container.querySelectorAll('tbody .time-column')].map(
    (cell) => cell.textContent?.trim() ?? '',
  )
}

describe('ScheduleTable', () => {
  it('shows a start time per row, chained off the durations', () => {
    const plan = planWithDurations('15', '30', '10')
    const { container } = render(ScheduleTable, { props: { plan, lists: [] } })

    expect(startTimeTexts(container)).toEqual(['09:00', '09:15', '09:45'])
  })

  it('leaves every row below an unreadable duration without a start time', () => {
    const plan = planWithDurations('15', 'tbd', '10')
    const { container } = render(ScheduleTable, { props: { plan, lists: [] } })

    expect(startTimeTexts(container)).toEqual(['09:00', '09:15', ''])
  })

  it('marks the unreadable cell itself', () => {
    const plan = planWithDurations('15', 'tbd')
    const { container } = render(ScheduleTable, { props: { plan, lists: [] } })

    const flagged = container.querySelectorAll('textarea.cell-invalid')
    expect(flagged).toHaveLength(1)
    expect((flagged[0] as HTMLTextAreaElement).value).toBe('tbd')
  })

  it('renders no start-time column when the document has no duration column', () => {
    const plan = createDocument('Ablauf')
    plan.columns = plan.columns.filter((column) => column.type !== 'duration')
    const { container } = render(ScheduleTable, { props: { plan, lists: [] } })

    expect(container.querySelectorAll('.time-column')).toHaveLength(0)
  })
})
