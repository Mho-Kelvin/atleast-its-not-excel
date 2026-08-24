<script lang="ts">
  import { addColumn, canAddColumnType, createColumn, findDurationColumn, moveColumn, removeColumn } from './document'
  import { strings } from './strings'
  import type { Column, ColumnType, ScheduleDocument, SelectList } from './types'

  let {
    plan = $bindable(),
    lists,
  }: { plan: ScheduleDocument; lists: SelectList[] } = $props()

  const TYPES: ColumnType[] = ['text', 'longText', 'select', 'duration']

  let newColumnTitle = $state('')
  let newColumnType = $state<ColumnType>('text')

  const durationTaken = $derived(!canAddColumnType(plan.columns, 'duration'))

  /** A column may keep the duration type it already holds; only a second one is refused. */
  function canBecome(column: Column, type: ColumnType): boolean {
    if (type !== 'duration') return true
    const existing = findDurationColumn(plan.columns)
    return existing === undefined || existing.id === column.id
  }

  function add(): void {
    const title = newColumnTitle.trim()
    if (title === '' || !canAddColumnType(plan.columns, newColumnType)) return
    addColumn(plan, createColumn(title, newColumnType))
    newColumnTitle = ''
    newColumnType = 'text'
  }

  function confirmRemove(column: Column): void {
    if (window.confirm(strings.confirmDeleteColumn)) removeColumn(plan, column.id)
  }

  function changeType(column: Column, type: ColumnType): void {
    if (!canBecome(column, type)) return
    column.type = type
    if (type !== 'select') column.listId = undefined
  }
</script>

<section class="no-print">
  <h2>{strings.columns}</h2>

  <ul>
    {#each plan.columns as column, index (column.id)}
      <li>
        <input
          type="text"
          aria-label={strings.columnTitleLabel}
          bind:value={column.title}
        />

        <select
          aria-label={strings.columnTypeLabel}
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
          <select aria-label={strings.columnListLabel} bind:value={column.listId}>
            <option value={undefined}>{strings.noListChosen}</option>
            {#each lists as list (list.id)}
              <option value={list.id}>{list.name}</option>
            {/each}
          </select>
        {/if}

        <button
          type="button"
          title={strings.moveColumnUp}
          disabled={index === 0}
          onclick={() => moveColumn(plan, index, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          title={strings.moveColumnDown}
          disabled={index === plan.columns.length - 1}
          onclick={() => moveColumn(plan, index, 1)}
        >
          ↓
        </button>
        <button type="button" onclick={() => confirmRemove(column)}>
          {strings.removeColumn}
        </button>
      </li>
    {/each}
  </ul>

  <div class="add">
    <input
      type="text"
      aria-label={strings.columnTitleLabel}
      placeholder={strings.columnTitleLabel}
      bind:value={newColumnTitle}
    />
    <select aria-label={strings.columnTypeLabel} bind:value={newColumnType}>
      {#each TYPES as type (type)}
        <option value={type} disabled={type === 'duration' && durationTaken}>
          {strings.columnTypes[type]}
        </option>
      {/each}
    </select>
    <button type="button" onclick={add}>{strings.addColumn}</button>
  </div>

  {#if durationTaken}
    <p class="hint">{strings.durationColumnTaken}</p>
  {/if}
</section>

<style>
  ul {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
  }

  li,
  .add {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0;
  }

  h2 {
    font-size: 1rem;
    margin: 0 0 0.5rem;
  }

  .hint {
    color: #666;
    font-size: 0.85em;
    margin: 0.5rem 0 0;
  }
</style>
