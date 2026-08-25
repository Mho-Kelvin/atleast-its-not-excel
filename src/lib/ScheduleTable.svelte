<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import { dragHandleZone, type DndEvent } from 'svelte-dnd-action'
  import ColumnSettingsPanel from './ColumnSettingsPanel.svelte'
  import Icon from './Icon.svelte'
  import PrintMark from './PrintMark.svelte'
  import TableRow from './TableRow.svelte'
  import { addColumn, createColumn, findDurationColumn, isRowEmpty } from './document'
  import {
    columnAnnouncement,
    freezeColumnWidths,
    releaseColumnWidths,
    rowAnnouncement,
  } from './dragging'
  import { parseDuration } from './duration'
  import { CUSTOM_VALUE, listValues } from './lists'
  import { computeStartTimes, parseTimeOfDay } from './schedule'
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

  let scroller: HTMLDivElement
  let moreLeft = $state(false)
  let moreRight = $state(false)

  /* The usual pure-CSS scroll shadows sit in the container's background, where
     the table's opaque cells cover them, so the edges are measured instead. */
  function measureEdges(): void {
    if (!scroller) return
    const furthest = scroller.scrollWidth - scroller.clientWidth
    moreLeft = scroller.scrollLeft > 1
    moreRight = scroller.scrollLeft < furthest - 1
  }

  function startAtLeftEdge(node: HTMLDivElement): void {
    node.scrollLeft = 0
  }
  // Read on purpose: adding a column or a row changes how far the table reaches
  // without the container ever resizing.
  $effect(() => {
    const shape = `${plan.columns.length}:${plan.rows.length}`
    if (shape !== '') measureEdges()
  })

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

<svelte:window onkeydown={onWindowKeydown} onresize={measureEdges} />
<svelte:document onpointerdown={onDocumentPointerDown} />

<span class="announcer no-print" aria-live="polite">{announcement}</span>
<span id="drag-help" hidden>{strings.dragHelp}</span>

<!-- The table scrolls inside its own box on a narrow screen; the page itself
     never does. The edges fade while there is more table on that side. -->
<div class="frame" class:more-left={moreLeft} class:more-right={moreRight}>
  <div class="scroller" bind:this={scroller} use:startAtLeftEdge onscroll={measureEdges}>
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
              <th class="time-column group-start" class:print-hidden={plan.hideTimeInPrint}>
                {@render settings(durationColumn!, timeTitle, true)}
              </th>
            {:else if slot.id === TRAILING_SLOT.id}
              <th class="no-print">
                <button
                  type="button"
                  class="add-column"
                  title={strings.addColumn}
                  aria-label={strings.addColumn}
                  onclick={addColumnAtEnd}
                >
                  <Icon name="add" size={16} />
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
            <TableRow
              {row}
              {slots}
              {lists}
              startTime={startTimes[rowIndex]}
              draft={rowIndex === plan.rows.length - 1 && isRowEmpty(row)}
              hideTimeInPrint={plan.hideTimeInPrint}
              {isCustomCell}
              onchoose={chooseValue}
              onleavecustom={leaveCustom}
              onremove={() => plan.rows.splice(rowIndex, 1)}
            />
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
</div>

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
  /* Below the breakpoint the table keeps its own width and scrolls inside this
     box, so a narrow window never scrolls the page sideways. */
  .frame {
    position: relative;
  }

  .scroller {
    overflow-x: auto;
  }

  /* Drawn over the table, not behind it: an opaque cell would swallow a
     background shadow. */
  .frame::before,
  .frame::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2rem;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration);
  }

  .frame::before {
    left: 0;
    background: linear-gradient(to right, rgb(31 58 99 / 0.22), transparent);
  }

  .frame::after {
    right: 0;
    background: linear-gradient(to left, rgb(31 58 99 / 0.22), transparent);
  }

  .frame.more-left::before,
  .frame.more-right::after {
    opacity: 1;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    border: 1px solid var(--rule);
    padding: 0.35rem 0.4rem;
    text-align: left;
    vertical-align: top;
    background: var(--paper-sunk);
    font-weight: 600;
    color: var(--ink);
  }

  .time-column {
    width: 6ch;
    white-space: nowrap;
  }

  /* The start time and the duration it is computed from are one group. The
     divider between them stays faint so they read as connected, on paper too.
     Both sides need it: collapsed borders take the stronger of the two. */
  .group-start {
    border-right: 1px dashed var(--rule);
  }

  /* Narrow like the time it feeds: the slack in the table belongs to the text
     columns, not to a cell holding "45". */
  .group-end {
    width: 7ch;
    border-left: 1px dashed var(--rule);
  }

  .handle-column {
    width: 2ch;
    padding-left: 0;
    padding-right: 0;
  }

  /* Handle, name and print mark stay on one line: the column widens for a long
     name instead of breaking the header into stacked pieces. Paper gets the
     normal wrapping back, where there is no handle and no width to spare. */
  th {
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
    margin: 0 auto;
    padding: var(--space-1) var(--space-2);
    border-color: transparent;
    background: none;
    color: var(--ink-muted);
  }

  .add-column:hover {
    background: var(--accent-sunk);
    border-color: transparent;
    color: var(--accent);
  }

  @media print {
    .scroller {
      overflow-x: visible;
    }

    .frame::before,
    .frame::after {
      display: none;
    }

    th {
      background: none;
    }
  }
</style>
