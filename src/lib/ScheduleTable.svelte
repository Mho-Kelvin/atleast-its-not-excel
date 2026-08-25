<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import { dragHandle, dragHandleZone, type DndEvent } from 'svelte-dnd-action'
  import CellField from './CellField.svelte'
  import ColumnSettingsPanel from './ColumnSettingsPanel.svelte'
  import PrintMark from './PrintMark.svelte'
  import { addColumn, createColumn, findDurationColumn, isRowEmpty } from './document'
  import {
    columnAnnouncement,
    freezeColumnWidths,
    releaseColumnWidths,
    rowAnnouncement,
  } from './dragging'
  import { parseDuration } from './duration'
  import { CUSTOM_VALUE, listValues } from './lists'
  import { computeStartTimes, formatTimeOfDay, parseTimeOfDay } from './schedule'
  import {
    columnsFromDndItems,
    headerSlots,
    isDragPlaceholder,
    rowsFromDndItems,
    HANDLE_SLOT,
    TIME_SLOT,
    TRAILING_SLOT,
    type HeaderSlot,
  } from './slots'
  import { dragAnnouncements, strings } from './strings'
  import type { Column, Row, ScheduleDocument, SelectList } from './types'

  let {
    plan = $bindable(),
    lists,
    ondragstatechange,
  }: {
    plan: ScheduleDocument
    lists: SelectList[]
    ondragstatechange?: (dragging: boolean) => void
  } = $props()

  const durationColumn = $derived(findDurationColumn(plan.columns))
  const timeTitle = $derived(plan.timeTitle ?? strings.startTimeColumn)
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

  /** Cells the user switched to free text. A value off the list counts too, so a
      document written before the list changed still shows what it holds. */
  const customCells = new SvelteSet<string>()

  function cellKey(row: Row, column: Column): string {
    return `${row.id}:${column.id}`
  }

  function isCustomCell(row: Row, column: Column, value: string): boolean {
    if (customCells.has(cellKey(row, column))) return true
    return value !== '' && !listValues(lists, column.listId).includes(value)
  }

  function chooseValue(row: Row, column: Column, chosen: string): void {
    if (chosen === CUSTOM_VALUE) {
      customCells.add(cellKey(row, column))
      row.cells[column.id] = ''
      return
    }
    row.cells[column.id] = chosen
  }

  /** An emptied free-text cell hands the dropdown back, so there is no extra button for it. */
  function leaveCustom(row: Row, column: Column): void {
    if ((row.cells[column.id] ?? '') === '') customCells.delete(cellKey(row, column))
  }

  // headerSlots always parks the start-time cell next to the duration column,
  // which would snap it back on every frame of a drag that grabbed it. While a
  // drag is in flight the library's own item order is what gets rendered.
  let slotsInFlight = $state<HeaderSlot[] | null>(null)
  const slots = $derived(slotsInFlight ?? headerSlots(plan.columns))

  let headerRow: HTMLTableRowElement
  let announcement = $state('')
  let dragging = false
  let openColumnId = $state<string | null>(null)

  function setDragging(active: boolean): void {
    if (dragging === active) return
    dragging = active
    ondragstatechange?.(active)
  }

  function announce(text: string | null): void {
    if (text !== null) announcement = text
  }

  function onRowsReordered(event: CustomEvent<DndEvent<Row>>): void {
    setDragging(true)
    plan.rows = event.detail.items
    announce(rowAnnouncement(event, dragAnnouncements.rowMoved))
  }

  function onRowsDropped(event: CustomEvent<DndEvent<Row>>): void {
    plan.rows = rowsFromDndItems(event.detail.items)
    announce(rowAnnouncement(event, dragAnnouncements.rowDropped))
    setDragging(false)
  }

  function onColumnsReordered(event: CustomEvent<DndEvent<HeaderSlot>>): void {
    setDragging(true)
    slotsInFlight = event.detail.items
    plan.columns = columnsFromDndItems(event.detail.items, event.detail.info.id)
    announce(columnAnnouncement(event, dragAnnouncements.columnMoved, timeTitle))
  }

  function onColumnsDropped(event: CustomEvent<DndEvent<HeaderSlot>>): void {
    plan.columns = columnsFromDndItems(event.detail.items, event.detail.info.id)
    announce(columnAnnouncement(event, dragAnnouncements.columnDropped, timeTitle))
    slotsInFlight = null
    releaseColumnWidths(headerRow)
    setDragging(false)
  }

  function asColumn(slot: HeaderSlot): Column {
    return slot as Column
  }

  function addColumnAtEnd(): void {
    const column = createColumn('', 'text')
    addColumn(plan, column)
    openColumnId = column.id
  }

  /** Clicking anywhere outside the open panel closes it, as a popover would. */
  function onDocumentPointerDown(event: PointerEvent): void {
    if (openColumnId === null) return
    const target = event.target as HTMLElement | null
    if (target?.closest('.column-settings')) return
    openColumnId = null
  }

  function onWindowKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') openColumnId = null
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />
<svelte:document onpointerdown={onDocumentPointerDown} />

<span class="announcer no-print" aria-live="polite">{announcement}</span>

<table>
  <thead>
    <tr
      bind:this={headerRow}
      use:dragHandleZone={{
        items: slots,
        type: 'columns',
        flipDurationMs: 0,
        autoAriaDisabled: true,
      }}
      onconsider={onColumnsReordered}
      onfinalize={onColumnsDropped}
    >
      {#each slots as slot (slot.id)}
        {#if slot.id === HANDLE_SLOT.id}
          <th class="no-print handle-column"></th>
        {:else if isDragPlaceholder(slot)}
          <th class="no-print"></th>
        {:else if slot.id === TIME_SLOT.id}
          <!-- The start time carries the controls for the whole time group:
               grabbing or deleting it takes the duration column with it. -->
          <th class="time-column group-start" class:print-hidden={plan.hideTimeInPrint}>
            {@render settings(durationColumn!, timeTitle, true)}
          </th>
        {:else if slot.id === TRAILING_SLOT.id}
          <th class="no-print">
            <button
              type="button"
              class="add-column"
              title={strings.addColumn}
              onclick={addColumnAtEnd}
            >
              +
            </button>
          </th>
        {:else if asColumn(slot).type === 'duration'}
          {@const column = asColumn(slot)}
          <th class="group-end" class:print-hidden={column.hideInPrint}
            >{column.title}<PrintMark hidden={column.hideInPrint} /></th
          >
        {:else}
          {@const column = asColumn(slot)}
          <th class:print-hidden={column.hideInPrint}
            >{@render settings(column, column.title, false)}</th
          >
        {/if}
      {/each}
    </tr>
  </thead>
  <tbody
    use:dragHandleZone={{
      items: plan.rows,
      type: 'rows',
      flipDurationMs: 0,
      autoAriaDisabled: true,
    }}
    onconsider={onRowsReordered}
    onfinalize={onRowsDropped}
  >
    {#each plan.rows as row, rowIndex (row.id)}
      {#if isDragPlaceholder(row)}
        <tr class="no-print"></tr>
      {:else}
        <!-- The last empty row is the draft: typing in it makes it a real row and
           a fresh draft appears below, so nothing on paper is ever blank. -->
        {@const draft = rowIndex === plan.rows.length - 1 && isRowEmpty(row)}
        <tr class:draft>
          {#each slots as slot (slot.id)}
            {#if isDragPlaceholder(slot)}
              <td class="no-print"></td>
            {:else if slot.id === HANDLE_SLOT.id}
              <td class="no-print handle-column">
                <span
                  use:dragHandle
                  class="drag-handle"
                  title={strings.dragRow}
                  aria-label={strings.dragRow}>⠿</span
                >
              </td>
            {:else if slot.id === TIME_SLOT.id}
              <td class="time-column group-start" class:print-hidden={plan.hideTimeInPrint}>
                {startTimes[rowIndex] === undefined ? '' : formatTimeOfDay(startTimes[rowIndex])}
              </td>
            {:else if slot.id === TRAILING_SLOT.id}
              <td class="no-print">
                {#if !draft}
                  <button type="button" onclick={() => plan.rows.splice(rowIndex, 1)}>
                    {strings.removeRow}
                  </button>
                {/if}
              </td>
            {:else}
              {@const column = asColumn(slot)}
              <td
                data-column-type={column.type}
                class:group-end={column.type === 'duration'}
                class:print-hidden={column.hideInPrint}
              >
                {#if column.type === 'select' && !isCustomCell(row, column, row.cells[column.id] ?? '')}
                  <select
                    value={row.cells[column.id] ?? ''}
                    onchange={(event) => chooseValue(row, column, event.currentTarget.value)}
                  >
                    <option value=""></option>
                    {#each listValues(lists, column.listId) as value (value)}
                      <option {value}>{value}</option>
                    {/each}
                    <option value={CUSTOM_VALUE}>{strings.customValue}</option>
                  </select>
                {:else}
                  <CellField
                    bind:value={row.cells[column.id]}
                    invalid={column.type === 'duration' &&
                      isUnreadableDuration(row.cells[column.id] ?? '')}
                    autofocus={column.type === 'select'}
                    onblur={column.type === 'select' ? () => leaveCustom(row, column) : undefined}
                  />
                {/if}
              </td>
            {/if}
          {/each}
        </tr>
      {/if}
    {/each}
  </tbody>
</table>

{#snippet settings(column: Column, label: string, timeGroup: boolean)}
  <ColumnSettingsPanel
    bind:plan
    {column}
    {label}
    {timeGroup}
    {lists}
    open={openColumnId === column.id}
    ontoggle={() => (openColumnId = openColumnId === column.id ? null : column.id)}
    onclosed={() => (openColumnId = null)}
    ongrab={() => freezeColumnWidths(headerRow, () => dragging)}
  />
{/snippet}

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

  /* The start time and the duration it is computed from are one group. The
     divider between them stays faint so they read as connected, on paper too.
     Both sides need it: collapsed borders take the stronger of the two. */
  .group-start {
    border-right: 1px dashed #bbb;
  }

  .group-end {
    border-left: 1px dashed #bbb;
  }

  .handle-column {
    width: 2ch;
  }

  .drag-handle {
    cursor: grab;
    color: #888;
    user-select: none;
  }

  /* Handle, name and print mark stay on one line: the column widens for a long
     name instead of breaking the header into stacked pieces. Paper gets the
     normal wrapping back, where there is no handle and no width to spare. */
  th {
    position: relative;
    white-space: nowrap;
  }

  .announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .add-column {
    font-size: 1.1em;
    line-height: 1;
    padding: 0.1rem 0.4rem;
  }

  /* A percentage-wide select contributes no width to the auto table layout, so
     its longest value ends up clipped. Sizing it to its content widens the
     column instead, which is the whole point of the dropdown. */
  td select {
    width: auto;
    border: none;
    padding: 0;
    background: transparent;
    font: inherit;
    color: inherit;
  }

  td select:focus {
    outline: 2px solid #4a6da7;
  }

  @media print {
    /* The draft row is an offer to type, not a line of the schedule. */
    .draft {
      display: none;
    }
  }
</style>
