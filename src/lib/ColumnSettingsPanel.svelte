<script lang="ts">
  import { dragHandle } from 'svelte-dnd-action'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import Icon from './Icon.svelte'
  import PrintMark from './PrintMark.svelte'
  import { findDurationColumn, removeColumn } from './document'
  import { strings } from './strings'
  import type { Column, ColumnType, ScheduleDocument, SelectList } from './types'

  let {
    plan = $bindable(),
    column,
    label,
    timeGroup,
    open,
    lists,
    ontoggle,
    onclosed,
    ongrab,
  }: {
    plan: ScheduleDocument
    column: Column
    label: string
    /** Set on the Uhrzeit cell, which speaks for the start time and the duration
        column at once and so carries a print toggle for each. */
    timeGroup: boolean
    open: boolean
    lists: SelectList[]
    ontoggle: () => void
    onclosed: () => void
    ongrab: () => void
  } = $props()

  const TYPES: ColumnType[] = ['text', 'select', 'duration']

  const durationColumn = $derived(findDurationColumn(plan.columns))

  function canBecome(type: ColumnType): boolean {
    if (type !== 'duration') return true
    return durationColumn === undefined || durationColumn.id === column.id
  }

  function changeType(type: ColumnType): void {
    if (!canBecome(type)) return
    column.type = type
    if (type !== 'select') column.listId = undefined
  }

  let removing = $state(false)

  function remove(): void {
    removing = false
    onclosed()
    removeColumn(plan, column.id)
  }

  function focusOnOpen(node: HTMLInputElement): void {
    node.focus()
  }
</script>

<!-- Not a <button>: the drag library refuses to start on any target carrying a
     .value property, so a real button never drags. -->
<span
  use:dragHandle
  role="button"
  tabindex="0"
  class="drag-handle no-print"
  title={strings.dragColumn}
  aria-label={strings.dragColumn}
  onpointerdown={ongrab}
  onkeydown={ongrab}>⠿</span
><span class="column-settings">
  <button
    type="button"
    class="column-name"
    aria-expanded={open}
    title={strings.columnSettings}
    onclick={ontoggle}
    >{label}{#if label.trim() === ''}<span class="placeholder no-print"
        >{strings.columnTitleLabel}</span
      >{/if}</button
  ><PrintMark hidden={timeGroup ? plan.hideTimeInPrint : column.hideInPrint} />

  {#if open}
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
        onchange={(event) => changeType(event.currentTarget.value as ColumnType)}
      >
        {#each TYPES as type (type)}
          <option value={type} disabled={!canBecome(type)}>{strings.columnTypes[type]}</option>
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

      {#if !canBecome('duration')}
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

      <button type="button" class="remove" onclick={() => (removing = true)}>
        <Icon name="trash" size={16} />
        {strings.removeColumn}
      </button>
    </span>
  {/if}
</span>

<!-- Outside the panel on purpose: the panel closes on an outside click, and the
     confirmation has to outlive it. -->
<ConfirmDialog
  open={removing}
  message={strings.confirmDeleteColumn}
  confirmLabel={strings.removeColumn}
  onconfirm={remove}
  oncancel={() => (removing = false)}
/>

<style>
  .drag-handle {
    cursor: grab;
    color: #888;
    user-select: none;
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
    width: 100%;
    border: 1px solid #999;
    padding: 0.15rem 0.25rem;
    background: #fff;
    font: inherit;
    color: inherit;
  }

  .panel input:focus,
  .panel select:focus {
    outline: 2px solid #4a6da7;
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

  .panel .hint {
    color: #666;
    font-size: 0.8em;
  }
</style>
