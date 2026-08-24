<script lang="ts">
  import { dragHandle, dragHandleZone, type DndEvent } from 'svelte-dnd-action'
  import { createRow, findDurationColumn } from './document'
  import { parseDuration } from './duration'
  import { listValues } from './lists'
  import { computeStartTimes, formatTimeOfDay, parseTimeOfDay } from './schedule'
  import { strings } from './strings'
  import type { Row, ScheduleDocument, SelectList } from './types'

  let { plan = $bindable(), lists }: { plan: ScheduleDocument; lists: SelectList[] } = $props()

  const durationColumn = $derived(findDurationColumn(plan.columns))
  const documentStart = $derived(parseTimeOfDay(plan.startTime))

  const startTimes = $derived.by(() => {
    const column = durationColumn
    if (!column || documentStart === null) return []
    const durations = plan.rows.map((row) => parseDuration(row.cells[column.id] ?? ''))
    return computeStartTimes(documentStart, durations)
  })

  function isUnreadableDuration(text: string): boolean {
    return text.trim() !== '' && parseDuration(text) === null
  }

  function addRow(): void {
    plan.rows.push(createRow(plan.columns))
  }

  function onCellKeydown(event: KeyboardEvent, rowIndex: number): void {
    if (event.key === 'Enter' && rowIndex === plan.rows.length - 1) {
      event.preventDefault()
      addRow()
    }
  }

  function onRowsReordered(event: CustomEvent<DndEvent<Row>>): void {
    plan.rows = event.detail.items
  }
</script>

<table>
  <thead>
    <tr>
      <th class="no-print handle-column"></th>
      {#if durationColumn}
        <th class="time-column">{strings.startTimeColumn}</th>
      {/if}
      {#each plan.columns as column (column.id)}
        <th>{column.title}</th>
      {/each}
      <th class="no-print"></th>
    </tr>
  </thead>
  <tbody
    use:dragHandleZone={{ items: plan.rows, flipDurationMs: 0 }}
    onconsider={onRowsReordered}
    onfinalize={onRowsReordered}
  >
    {#each plan.rows as row, rowIndex (row.id)}
      <tr>
        <td class="no-print handle-column">
          <span
            use:dragHandle
            class="drag-handle"
            title={strings.dragRow}
            aria-label={strings.dragRow}>⠿</span
          >
        </td>
        {#if durationColumn}
          <td class="time-column">
            {startTimes[rowIndex] === null || startTimes[rowIndex] === undefined
              ? ''
              : formatTimeOfDay(startTimes[rowIndex])}
          </td>
        {/if}
        {#each plan.columns as column (column.id)}
          <td data-column-type={column.type}>
            {#if column.type === 'longText'}
              <textarea rows="2" bind:value={row.cells[column.id]}></textarea>
            {:else if column.type === 'select'}
              <select bind:value={row.cells[column.id]}>
                <option value=""></option>
                {#each listValues(lists, column.listId) as value (value)}
                  <option {value}>{value}</option>
                {/each}
              </select>
            {:else}
              <input
                type="text"
                class:cell-invalid={column.type === 'duration' &&
                  isUnreadableDuration(row.cells[column.id] ?? '')}
                title={column.type === 'duration' &&
                isUnreadableDuration(row.cells[column.id] ?? '')
                  ? strings.durationInvalid
                  : ''}
                bind:value={row.cells[column.id]}
                onkeydown={(event) => onCellKeydown(event, rowIndex)}
              />
            {/if}
          </td>
        {/each}
        <td class="no-print">
          <button type="button" onclick={() => plan.rows.splice(rowIndex, 1)}>
            {strings.removeRow}
          </button>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<button type="button" class="no-print" onclick={addRow}>{strings.addRow}</button>

<style>
  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    border: 1px solid #999;
    padding: 0.2rem 0.3rem;
    text-align: left;
    vertical-align: top;
  }

  .time-column {
    width: 6ch;
    white-space: nowrap;
  }

  .handle-column {
    width: 2ch;
  }

  .drag-handle {
    cursor: grab;
    color: #888;
    user-select: none;
  }

  input,
  textarea,
  select {
    width: 100%;
    border: none;
    padding: 0;
    background: transparent;
    font: inherit;
    color: inherit;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid #4a6da7;
  }

  .cell-invalid {
    background: #ffe8e8;
  }
</style>
