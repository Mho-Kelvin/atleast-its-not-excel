<script lang="ts">
  import ConfirmDialog from './ConfirmDialog.svelte'
  import Icon from './Icon.svelte'
  import { createList, removeList } from './lists'
  import { formatStartTime } from './schedule'
  import { strings } from './strings'
  import type { SelectList, Store } from './types'

  let {
    store = $bindable(),
    open,
    onclose,
    focusListId = null,
  }: {
    store: Store
    open: boolean
    onclose: () => void
    /** Set when the dialog was opened from a column, so that list is scrolled to. */
    focusListId?: string | null
  } = $props()

  let dialog: HTMLDialogElement

  $effect(() => {
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })

  function scrollToFocused(node: HTMLElement, id: string | undefined): void {
    if (id !== undefined && id === focusListId) node.scrollIntoView({ block: 'center' })
  }

  let newListName = $state('')
  let newValues = $state<Record<string, string>>({})
  let newStartTime = $state('')
  let newStartTimeName = $state('')

  function add(): void {
    const name = newListName.trim()
    if (name === '') return
    store.lists.push(createList(name))
    newListName = ''
  }

  function addValue(list: SelectList): void {
    const value = (newValues[list.id] ?? '').trim()
    if (value === '' || list.values.includes(value)) return
    list.values.push(value)
    newValues[list.id] = ''
  }

  /** The time input hands over "09:00" or nothing at all, so there is no text to check. */
  function addStartTime(): void {
    if (newStartTime === '' || store.startTimes.some((entry) => entry.time === newStartTime)) return
    const name = newStartTimeName.trim()
    store.startTimes = [...store.startTimes, { time: newStartTime, name: name || undefined }].sort(
      (a, b) => a.time.localeCompare(b.time),
    )
    newStartTime = ''
    newStartTimeName = ''
  }

  let removing = $state<SelectList | null>(null)

  function remove(): void {
    if (removing) removeList(store, removing.id)
    removing = null
  }
</script>

<dialog bind:this={dialog} class="no-print" aria-labelledby="lists-title" oncancel={onclose}>
  <div class="bar">
    <h1 id="lists-title">{strings.lists}</h1>
    <button
      type="button"
      class="icon"
      title={strings.close}
      aria-label={strings.close}
      onclick={onclose}
    >
      <Icon name="close" />
    </button>
  </div>

  <div class="add">
    <input
      type="text"
      aria-label={strings.listNameLabel}
      placeholder={strings.listNameLabel}
      bind:value={newListName}
    />
    <button type="button" class="primary" onclick={add}>
      <Icon name="add" size={18} />
      {strings.newList}
    </button>
  </div>

  <article>
    <header>
      <h2>{strings.startTimeList}</h2>
    </header>

    <ul>
      {#each store.startTimes as entry, index (entry.time)}
        <li>
          <span>{formatStartTime(entry)}</span>
          {@render removeValueButton(() => store.startTimes.splice(index, 1))}
        </li>
      {/each}
    </ul>

    <div class="add">
      <input
        type="text"
        aria-label={strings.startTimeNameLabel}
        placeholder={strings.startTimeNameLabel}
        bind:value={newStartTimeName}
      />
      <input
        type="time"
        aria-label={`${strings.addValue}: ${strings.startTimeList}`}
        bind:value={newStartTime}
        onkeydown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            addStartTime()
          }
        }}
      />
      {@render addValueButton(addStartTime)}
    </div>
  </article>

  {#if store.lists.length === 0}
    <p class="empty">{strings.noLists}</p>
  {/if}

  {#each store.lists as list (list.id)}
    <article use:scrollToFocused={list.id}>
      <header>
        <input type="text" aria-label={strings.listNameLabel} bind:value={list.name} />
        <button
          type="button"
          class="icon danger"
          title={strings.deleteList}
          aria-label={strings.deleteList}
          onclick={() => (removing = list)}
        >
          <Icon name="trash" size={18} />
        </button>
      </header>

      <ul>
        {#each list.values as value, index (value)}
          <li>
            <span>{value}</span>
            {@render removeValueButton(() => list.values.splice(index, 1))}
          </li>
        {/each}
      </ul>

      <div class="add">
        <input
          type="text"
          aria-label={`${strings.addValue}: ${list.name}`}
          bind:value={newValues[list.id]}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addValue(list)
            }
          }}
        />
        {@render addValueButton(() => addValue(list))}
      </div>
    </article>
  {/each}
</dialog>

{#snippet addValueButton(onclick: () => void)}
  <button
    type="button"
    class="icon"
    title={strings.addValue}
    aria-label={strings.addValue}
    {onclick}
  >
    <Icon name="add" size={18} />
  </button>
{/snippet}

{#snippet removeValueButton(onclick: () => void)}
  <button
    type="button"
    class="icon danger"
    title={strings.removeValue}
    aria-label={strings.removeValue}
    {onclick}
  >
    <Icon name="trash" size={16} />
  </button>
{/snippet}

<ConfirmDialog
  open={removing !== null}
  message={strings.confirmDeleteList}
  confirmLabel={strings.deleteList}
  onconfirm={remove}
  oncancel={() => (removing = null)}
/>

<style>
  dialog {
    width: min(34rem, 100vw - 2rem);
    max-height: min(44rem, 100vh - 4rem);
    padding: var(--space-5);
    border: 1px solid var(--rule);
    border-radius: var(--radius-lg);
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-lifted);
  }

  dialog[open] {
    animation: appear 150ms ease-out;
  }

  dialog::backdrop {
    background: rgb(31 58 99 / 0.25);
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  h1 {
    margin: 0;
  }

  article {
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: #fff;
    padding: var(--space-3);
    margin-top: var(--space-4);
  }

  header {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  header input {
    flex: 1;
    font-weight: 600;
  }

  h2 {
    font-size: 1em;
    margin: 0;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: var(--space-2) 0;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: 0.15rem 0;
    border-bottom: 1px solid var(--grid-line);
  }

  li:last-child {
    border-bottom: none;
  }

  .add {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .add input {
    flex: 1;
    min-width: 0;
  }

  .primary {
    flex: none;
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }

  .primary:hover {
    background: var(--ink);
    border-color: var(--ink);
  }

  .icon {
    flex: none;
    padding: var(--space-2);
    border-color: transparent;
    background: none;
    color: var(--ink-muted);
  }

  .icon:hover {
    background: var(--accent-sunk);
    border-color: transparent;
    color: var(--accent);
  }

  .danger:hover {
    background: var(--red-sunk);
    color: var(--red);
  }

  .danger:focus-visible {
    outline-color: var(--red);
  }

  .empty {
    color: var(--ink-faint);
    margin-top: var(--space-4);
  }
</style>
