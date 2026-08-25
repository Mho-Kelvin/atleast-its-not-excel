<script lang="ts">
  import { dragHandle } from 'svelte-dnd-action'
  import CellField from './CellField.svelte'
  import Icon from './Icon.svelte'
  import { parseDuration } from './duration'
  import { CUSTOM_VALUE, listValues } from './lists'
  import { formatTimeOfDay } from './schedule'
  import {
    isDragPlaceholder,
    HANDLE_SLOT,
    TIME_SLOT,
    TRAILING_SLOT,
    type HeaderSlot,
  } from './slots'
  import { strings } from './strings'
  import type { Column, Row, SelectList } from './types'

  let {
    row,
    slots,
    lists,
    startTime,
    draft,
    hideTimeInPrint,
    isCustomCell,
    onchoose,
    onleavecustom,
    onremove,
  }: {
    row: Row
    slots: HeaderSlot[]
    lists: SelectList[]
    startTime: number | undefined
    /** The last row, still empty: an offer to type, so it carries no delete. */
    draft: boolean
    hideTimeInPrint: boolean | undefined
    isCustomCell: (row: Row, column: Column, value: string) => boolean
    onchoose: (row: Row, column: Column, chosen: string) => void
    onleavecustom: (row: Row, column: Column) => void
    onremove: () => void
  } = $props()

  function asColumn(slot: HeaderSlot): Column {
    return slot as Column
  }

  function isUnreadableDuration(text: string): boolean {
    return text.trim() !== '' && parseDuration(text) === null
  }
</script>

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
          aria-label={strings.dragRow}
          aria-describedby="drag-help"
        >
          <Icon name="grip" size={18} />
        </span>
      </td>
    {:else if slot.id === TIME_SLOT.id}
      <td class="time-column group-start" class:print-hidden={hideTimeInPrint}>
        {startTime === undefined ? '' : formatTimeOfDay(startTime)}
      </td>
    {:else if slot.id === TRAILING_SLOT.id}
      <td class="no-print trailing">
        {#if !draft}
          <button
            type="button"
            class="icon"
            title={strings.removeRow}
            aria-label={strings.removeRow}
            onclick={onremove}
          >
            <Icon name="trash" size={16} />
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
            onchange={(event) => onchoose(row, column, event.currentTarget.value)}
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
            invalid={column.type === 'duration' && isUnreadableDuration(row.cells[column.id] ?? '')}
            autofocus={column.type === 'select'}
            onblur={column.type === 'select' ? () => onleavecustom(row, column) : undefined}
          />
        {/if}
      </td>
    {/if}
  {/each}
</tr>

<style>
  td {
    border: 1px solid var(--rule);
    background: #fff;
    padding: 0.3rem 0.4rem;
    text-align: left;
    vertical-align: top;
    /* One square of the ruled sheet, so the rows sit on the grid behind them. */
    height: var(--square);
    transition: background var(--duration);
  }

  tr:hover td {
    background: var(--paper-sunk);
  }

  td:hover,
  td:focus-within {
    background: #fff;
  }

  .time-column {
    width: 6ch;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    color: var(--ink-muted);
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
    font-variant-numeric: tabular-nums;
  }

  .handle-column {
    width: 2ch;
    padding-left: 0;
    padding-right: 0;
  }

  .drag-handle {
    display: flex;
    justify-content: center;
    cursor: grab;
    color: var(--ink-muted);
    user-select: none;
  }

  .drag-handle:hover {
    color: var(--accent);
  }

  .trailing {
    width: 1px;
    padding: 0.15rem;
  }

  /* In the DOM from the first render, so the keyboard reaches it; quiet until
     the row is approached. */
  .icon {
    padding: var(--space-1);
    border-color: transparent;
    background: none;
    color: transparent;
  }

  tr:hover .icon,
  .icon:focus-visible {
    color: var(--ink-muted);
  }

  .icon:hover {
    background: var(--red-sunk);
    border-color: transparent;
    color: var(--red);
  }

  .icon:focus-visible {
    outline-color: var(--red);
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

  td select:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  @media print {
    /* The draft row is an offer to type, not a line of the schedule. */
    .draft {
      display: none;
    }
  }
</style>
