<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import { dragHandle, dragHandleZone, type DndEvent } from 'svelte-dnd-action'
  import {
    addColumn,
    columnsFromDndItems,
    createColumn,
    findDurationColumn,
    headerSlots,
    isDragPlaceholder,
    isRowEmpty,
    removeColumn,
    rowsFromDndItems,
    HANDLE_SLOT,
    TIME_SLOT,
    TRAILING_SLOT,
    type HeaderSlot,
  } from './document'
  import { parseDuration } from './duration'
  import { CUSTOM_VALUE, listValues } from './lists'
  import { computeStartTimes, formatTimeOfDay, parseTimeOfDay } from './schedule'
  import { dragAnnouncements, strings } from './strings'
  import type { Column, ColumnType, Row, ScheduleDocument, SelectList } from './types'

  let {
    plan = $bindable(),
    lists,
    ondragstatechange,
  }: {
    plan: ScheduleDocument
    lists: SelectList[]
    ondragstatechange?: (dragging: boolean) => void
  } = $props()

  const TYPES: ColumnType[] = ['text', 'longText', 'select', 'duration']

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

  function focusIfNew(node: HTMLTextAreaElement, active: boolean): void {
    if (active) node.focus()
  }

  /** Cells are multi-line boxes, so a newline needs Shift. Plain Enter steps to
      the same cell one row down; the draft row means there is always one there
      once this row holds text, so nothing has to be added first. */
  function onCellKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()

    const cell = (event.currentTarget as HTMLElement).closest('td')
    const below = cell?.closest('tr')?.nextElementSibling
    const field = below?.children[cell!.cellIndex]?.querySelector('textarea, select')
    if (field instanceof HTMLElement) field.focus()
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

  function onRowsReordered(event: CustomEvent<DndEvent<Row>>): void {
    setDragging(true)
    plan.rows = event.detail.items
    announceRow(event, dragAnnouncements.rowMoved)
  }

  function onRowsDropped(event: CustomEvent<DndEvent<Row>>): void {
    plan.rows = rowsFromDndItems(event.detail.items)
    announceRow(event, dragAnnouncements.rowDropped)
    setDragging(false)
  }

  function announceRow(
    event: CustomEvent<DndEvent<Row>>,
    phrase: (position: number, count: number) => string,
  ): void {
    const index = event.detail.items.findIndex((row) => row.id === event.detail.info.id)
    if (index < 0) return
    announcement = phrase(index + 1, event.detail.items.length)
  }

  function onColumnsReordered(event: CustomEvent<DndEvent<HeaderSlot>>): void {
    setDragging(true)
    slotsInFlight = event.detail.items
    plan.columns = columnsFromDndItems(event.detail.items, event.detail.info.id)
    announceColumn(event, dragAnnouncements.columnMoved)
  }

  function onColumnsDropped(event: CustomEvent<DndEvent<HeaderSlot>>): void {
    plan.columns = columnsFromDndItems(event.detail.items, event.detail.info.id)
    announceColumn(event, dragAnnouncements.columnDropped)
    slotsInFlight = null
    releaseColumnWidths()
    setDragging(false)
  }

  function announceColumn(
    event: CustomEvent<DndEvent<HeaderSlot>>,
    phrase: (name: string, position: number, count: number) => string,
  ): void {
    const dragged = event.detail.info.id
    const columns = columnsFromDndItems(event.detail.items, dragged)
    const index =
      dragged === TIME_SLOT.id
        ? columns.findIndex((column) => column.type === 'duration')
        : columns.findIndex((column) => column.id === dragged)
    if (index < 0) return

    const name = dragged === TIME_SLOT.id ? timeTitle : columnName(columns[index])
    announcement = phrase(name, index + 1, columns.length)
  }

  /**
   * Lifting a header cell out of table flow makes auto layout re-solve every
   * column width each frame, so the header stops lining up with the body. The
   * widths are pinned for the duration of the drag and released afterwards,
   * which leaves the printed table's automatic widths untouched.
   */
  function freezeColumnWidths(): void {
    for (const cell of headerRow.children) {
      const element = cell as HTMLElement
      element.style.width = `${element.getBoundingClientRect().width}px`
    }
    // A press that never turns into a drag gets no finalize event, so the
    // widths would otherwise stay pinned.
    window.addEventListener('pointerup', releaseUnlessDragging, { once: true })
  }

  function releaseUnlessDragging(): void {
    if (!dragging) releaseColumnWidths()
  }

  function releaseColumnWidths(): void {
    for (const cell of headerRow.children) (cell as HTMLElement).style.width = ''
  }

  function asColumn(slot: HeaderSlot): Column {
    return slot as Column
  }

  function columnName(column: Column): string {
    return column.title.trim() === '' ? strings.columnTitleLabel : column.title
  }

  /** A column may keep the duration type it already holds; only a second one is refused. */
  function canBecome(column: Column, type: ColumnType): boolean {
    if (type !== 'duration') return true
    return durationColumn === undefined || durationColumn.id === column.id
  }

  function changeType(column: Column, type: ColumnType): void {
    if (!canBecome(column, type)) return
    column.type = type
    if (type !== 'select') column.listId = undefined
  }

  function addColumnAtEnd(): void {
    const column = createColumn('', 'text')
    addColumn(plan, column)
    openColumnId = column.id
  }

  function confirmRemove(column: Column): void {
    if (!window.confirm(strings.confirmDeleteColumn)) return
    if (openColumnId === column.id) openColumnId = null
    removeColumn(plan, column.id)
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

  function focusOnOpen(node: HTMLInputElement): void {
    node.focus()
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
            {@render columnControls(durationColumn!, timeTitle, true)}
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
            >{column.title}{@render printMark(column.hideInPrint === true)}</th
          >
        {:else}
          {@const column = asColumn(slot)}
          <th class:print-hidden={column.hideInPrint}
            >{@render columnControls(column, column.title, false)}</th
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
              {#if column.type === 'select'}
                {#if isCustomCell(row, column, row.cells[column.id] ?? '')}
                  {@render cellField(row, column, true)}
                {:else}
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
                {/if}
              {:else}
                {@render cellField(row, column, false)}
              {/if}
            </td>
          {/if}
        {/each}
      </tr>
      {/if}
    {/each}
  </tbody>
</table>

<!-- Every editable cell is the same box: it grows with its own text instead of
     cropping it, and there is nothing to drag open. The wrapper holds a hidden
     copy of the value, which is what gives the grid cell its height. -->
{#snippet cellField(row: Row, column: Column, isNewCustomValue: boolean)}
  {@const value = row.cells[column.id] ?? ''}
  {@const invalid = column.type === 'duration' && isUnreadableDuration(value)}
  <span class="field" data-value={value}>
    <textarea
      rows="1"
      class:cell-invalid={invalid}
      title={invalid ? strings.durationInvalid : ''}
      use:focusIfNew={isNewCustomValue}
      bind:value={row.cells[column.id]}
      onblur={() => column.type === 'select' && leaveCustom(row, column)}
      onkeydown={onCellKeydown}
    ></textarea>
  </span>
{/snippet}

{#snippet printMark(hidden: boolean)}
  {#if hidden}<span class="print-mark no-print" role="img" aria-label={strings.notPrinted}
      title={strings.notPrinted}>⊘</span
    >{/if}
{/snippet}

<!-- timeGroup: the cell speaks for the start time and the duration column at
     once, so it carries a print toggle for each of them. -->
{#snippet columnControls(column: Column, label: string, timeGroup: boolean)}
  <!-- Not a <button>: the drag library refuses to start on any target carrying
       a .value property, so a real button never drags. -->
  <span
    use:dragHandle
    role="button"
    tabindex="0"
    class="drag-handle no-print"
    title={strings.dragColumn}
    aria-label={strings.dragColumn}
    onpointerdown={freezeColumnWidths}
    onkeydown={freezeColumnWidths}>⠿</span
  ><span class="column-settings">
    <button
      type="button"
      class="column-name"
      aria-expanded={openColumnId === column.id}
      title={strings.columnSettings}
      onclick={() => (openColumnId = openColumnId === column.id ? null : column.id)}
      >{label}{#if label.trim() === ''}<span class="placeholder no-print"
          >{strings.columnTitleLabel}</span
        >{/if}</button
    >{@render printMark(timeGroup ? plan.hideTimeInPrint === true : column.hideInPrint === true)}

    {#if openColumnId === column.id}
      <span class="panel no-print" class:from-right={column.id === plan.columns.at(-1)?.id}>
        <!-- Explicit for/id, not a wrapping <label>: a wrapped select pulls its
             own option text into its accessible name. -->
        {#if timeGroup}
          <label for="time-title-{column.id}">{strings.timeColumnTitleLabel}</label>
          <input
            id="time-title-{column.id}"
            type="text"
            use:focusOnOpen
            placeholder={strings.startTimeColumn}
            value={plan.timeTitle ?? ''}
            oninput={(event) => (plan.timeTitle = event.currentTarget.value)}
          />
          <label class="check">
            <input
              type="checkbox"
              checked={plan.hideTimeInPrint !== true}
              onchange={(event) => (plan.hideTimeInPrint = !event.currentTarget.checked)}
            />
            {strings.printTime}
          </label>

          <label for="column-title-{column.id}">{strings.durationColumnTitleLabel}</label>
          <input
            id="column-title-{column.id}"
            type="text"
            placeholder={strings.columnTypes.duration}
            bind:value={column.title}
          />
          <label class="check">
            <input
              type="checkbox"
              checked={column.hideInPrint !== true}
              onchange={(event) => (column.hideInPrint = !event.currentTarget.checked)}
            />
            {strings.printDuration}
          </label>
        {:else}
          <label for="column-title-{column.id}">{strings.columnTitleLabel}</label>
          <input
            id="column-title-{column.id}"
            type="text"
            use:focusOnOpen
            placeholder={strings.columnTitleLabel}
            bind:value={column.title}
          />
        {/if}

        <label for="column-type-{column.id}">{strings.columnTypeLabel}</label>
        <select
          id="column-type-{column.id}"
          value={column.type}
          onchange={(event) => changeType(column, event.currentTarget.value as ColumnType)}
        >
          {#each TYPES as type (type)}
            <option value={type} disabled={!canBecome(column, type)}>
              {strings.columnTypes[type]}
            </option>
          {/each}
        </select>

        {#if column.type === 'select'}
          <label for="column-list-{column.id}">{strings.columnListLabel}</label>
          <select id="column-list-{column.id}" bind:value={column.listId}>
            <option value={undefined}>{strings.noListChosen}</option>
            {#each lists as list (list.id)}
              <option value={list.id}>{list.name}</option>
            {/each}
          </select>
        {/if}

        {#if !canBecome(column, 'duration')}
          <span class="hint">{strings.durationColumnTaken}</span>
        {/if}

        {#if !timeGroup}
          <label class="check">
            <input
              type="checkbox"
              checked={column.hideInPrint !== true}
              onchange={(event) => (column.hideInPrint = !event.currentTarget.checked)}
            />
            {strings.printColumn}
          </label>
        {/if}

        <button type="button" onclick={() => confirmRemove(column)}>
          {strings.removeColumn}
        </button>
      </span>
    {/if}
  </span>
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

  .column-name {
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    font-weight: inherit;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  .placeholder {
    color: #999;
    font-weight: normal;
  }

  .panel {
    position: absolute;
    z-index: 1;
    top: 100%;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 14rem;
    padding: 0.6rem;
    border: 1px solid #999;
    background: #fff;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.2);
    font-weight: normal;
    text-align: left;
    white-space: normal;
  }

  /* The rightmost column sits at the table's edge, so its panel opens inwards. */
  .panel.from-right {
    left: auto;
    right: 0;
  }

  .panel label {
    font-size: 0.85em;
  }

  .panel input,
  .panel select {
    border: 1px solid #999;
    padding: 0.15rem 0.25rem;
    background: #fff;
  }

  .panel .check {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85em;
  }

  .panel .check input {
    width: auto;
  }

  .print-mark {
    margin-left: 0.3rem;
    color: #888;
    font-weight: normal;
  }

  .panel .hint {
    color: #666;
    font-size: 0.8em;
  }

  .add-column {
    font-size: 1.1em;
    line-height: 1;
    padding: 0.1rem 0.4rem;
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

  /* A percentage-wide select contributes no width to the auto table layout, so
     its longest value ends up clipped. Sizing it to its content widens the
     column instead, which is the whole point of the dropdown. */
  td select {
    width: auto;
  }

  /* Auto-growing cell: the hidden ::after copy of the value sets the height,
     the textarea sits on top of it in the same grid cell. */
  .field {
    display: grid;
    min-width: 0;
  }

  .field::after {
    content: attr(data-value) ' ';
    visibility: hidden;
  }

  .field > textarea,
  .field::after {
    grid-area: 1 / 1;
    min-width: 0;
    font: inherit;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .field > textarea {
    resize: none;
    overflow: hidden;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid #4a6da7;
  }

  /* The row still gets a time, computed as if the cell read zero, so the only
     sign that it is unreadable is the cell's own colour. */
  .cell-invalid {
    color: #c0202a;
  }

  @media print {
    /* The draft row is an offer to type, not a line of the schedule. */
    .draft {
      display: none;
    }

    /* Scoped, so it beats the same reset in print.css. */
    .cell-invalid {
      color: inherit;
    }
  }
</style>
