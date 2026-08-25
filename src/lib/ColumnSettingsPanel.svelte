<script lang="ts">
  import { dragHandle } from 'svelte-dnd-action'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import Icon from './Icon.svelte'
  import PrintMark from './PrintMark.svelte'
  import { findDurationColumn, removeColumn } from './document'
  import { openLists } from './listsDialog.svelte'
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

  let nameButton: HTMLButtonElement

  /* Only where the browser really has it: an environment that styles [popover]
     away without implementing it would hide the panel for good. The fixed
     positioning below already keeps it clear of the table's scroll container;
     the top layer is what settles it above everything else. */
  const TOP_LAYER = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype

  /**
   * The panel lives in the top layer, so the table's scroll container cannot
   * clip it. That takes it out of flow too, which is why it is placed by hand
   * instead of by `position: absolute` on the header cell.
   */
  function placeUnderName(node: HTMLElement): void {
    node.showPopover?.()

    const anchor = nameButton.getBoundingClientRect()
    const room = window.innerWidth - node.offsetWidth - 8
    node.style.top = `${anchor.bottom + 4}px`
    node.style.left = `${Math.max(8, Math.min(anchor.left, room))}px`
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
  aria-describedby="drag-help"
  onpointerdown={ongrab}
  onkeydown={ongrab}><Icon name="grip" size={18} /></span
><span class="column-settings">
  <button
    type="button"
    class="column-name"
    bind:this={nameButton}
    aria-expanded={open}
    title={strings.columnSettings}
    onclick={ontoggle}
    >{label}{#if label.trim() === ''}<span class="placeholder no-print"
        >{strings.columnTitleLabel}</span
      >{/if}</button
  ><PrintMark hidden={timeGroup ? plan.hideTimeInPrint : column.hideInPrint} />

  {#if open}
    <span class="panel no-print" popover={TOP_LAYER ? 'manual' : null} use:placeUnderName>
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
        <span class="row">
          <select id="column-list-{column.id}" bind:value={column.listId}>
            <option value={undefined}>{strings.noListChosen}</option>
            {#each lists as list (list.id)}
              <option value={list.id}>{list.name}</option>
            {/each}
          </select>
          <button
            type="button"
            class="icon"
            title={strings.editLists}
            aria-label={strings.editLists}
            onclick={() => openLists(column.listId ?? null)}
          >
            <Icon name="settings" size={18} />
          </button>
        </span>
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
    display: inline-flex;
    vertical-align: middle;
    cursor: grab;
    color: var(--ink-muted);
    user-select: none;
  }

  .drag-handle:hover {
    color: var(--accent);
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

  .column-name:hover {
    color: var(--accent);
  }

  .placeholder {
    color: var(--ink-faint);
    font-weight: normal;
  }

  .panel {
    position: fixed;
    inset: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 15rem;
    margin: 0;
    padding: var(--space-3);
    border: 1px solid var(--rule);
    border-radius: var(--radius-lg);
    background: var(--paper);
    box-shadow: var(--shadow-lifted);
    font-weight: normal;
    text-align: left;
    white-space: normal;
    animation: appear 150ms ease-out;
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(-2px);
    }
  }

  .panel label {
    font-size: 0.85em;
    color: var(--ink-muted);
  }

  .panel input,
  .panel select {
    width: 100%;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    padding: 0.2rem 0.3rem;
    background: #fff;
    font: inherit;
    color: inherit;
  }

  .panel input:focus-visible,
  .panel select:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .row {
    display: flex;
    gap: var(--space-1);
  }

  .icon {
    flex: none;
    padding: var(--space-1) var(--space-2);
    border-color: transparent;
    background: none;
    color: var(--ink-muted);
  }

  .icon:hover {
    background: var(--accent-sunk);
    border-color: transparent;
    color: var(--accent);
  }

  .panel .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 0.85em;
  }

  .panel .check input {
    width: auto;
    accent-color: var(--accent);
  }

  .panel .hint {
    color: var(--ink-faint);
    font-size: 0.8em;
  }

  .remove {
    justify-content: center;
    margin-top: var(--space-1);
    border-color: var(--rule);
    color: var(--red);
  }

  .remove:hover {
    background: var(--red-sunk);
    border-color: var(--red);
  }

  .remove:focus-visible {
    outline-color: var(--red);
  }
</style>
