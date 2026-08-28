<script lang="ts">
  import ConfirmDialog from './ConfirmDialog.svelte'
  import Icon from './Icon.svelte'
  import {
    createList,
    ensureListDrafts,
    isDuplicateStartTime,
    isDuplicateValue,
    isStartTimeMissing,
    removeList,
  } from './lists'
  import { strings } from './strings'
  import { download, listsEnvelope } from './transfer'
  import type { SelectList, StartTime, Store } from './types'

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

  function asModal(node: HTMLDialogElement): void {
    node.showModal()
  }

  /**
   * The backdrop belongs to the dialog element, so a click on it lands on the
   * dialog itself. The padding does too, hence the second test: only a point
   * outside the box is the backdrop. A click from the keyboard reports 0/0 and
   * never targets the dialog, so it cannot be mistaken for one.
   */
  function closeOnBackdrop(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return
    const box = (event.currentTarget as HTMLDialogElement).getBoundingClientRect()
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    if (outside) onclose()
  }

  function startTimeProblem(entries: StartTime[], index: number): string {
    if (isStartTimeMissing(entries[index])) return strings.startTimeMissing
    if (isDuplicateStartTime(entries, index)) return strings.duplicateEntry
    return ''
  }

  function scrollToFocused(node: HTMLElement, id: string | undefined): void {
    if (id !== undefined && id === focusListId) node.scrollIntoView({ block: 'center' })
  }

  let newListName = $state('')

  // Entries are added by typing into the empty one at the end, so the drafts are
  // topped up while the dialog is open rather than on a button.
  $effect(() => {
    if (open) ensureListDrafts(store)
  })

  function add(): void {
    const name = newListName.trim()
    if (name === '') return
    store.lists.push(createList(name))
    newListName = ''
  }

  let removing = $state<SelectList | null>(null)

  function remove(): void {
    if (removing) removeList(store, removing.id)
    removing = null
  }
</script>

{#if open}
  <dialog
    use:asModal
    class="no-print"
    aria-labelledby="lists-title"
    oncancel={onclose}
    onclick={closeOnBackdrop}
  >
    <div class="bar">
      <h1 id="lists-title">{strings.lists}</h1>
      <div class="bar-actions">
        <button type="button" onclick={() => download(listsEnvelope(store), strings.listsFileName)}>
          <Icon name="export" size={18} />
          {strings.exportLists}
        </button>
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
        {#each store.startTimes as entry, index (entry.id)}
          {@const problem = startTimeProblem(store.startTimes, index)}
          <li>
            <input
              type="text"
              aria-label={strings.startTimeNameLabel}
              placeholder={strings.startTimeNameLabel}
              bind:value={entry.name}
            />
            <input
              type="time"
              class="time"
              class:invalid={problem !== ''}
              aria-label={strings.startTimeValueLabel}
              aria-invalid={problem !== ''}
              title={problem}
              bind:value={entry.time}
            />
            {#if index < store.startTimes.length - 1}
              {@render removeValueButton(() => store.startTimes.splice(index, 1))}
            {:else}
              <span class="spacer"></span>
            {/if}
          </li>
        {/each}
      </ul>
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
          <!-- Unkeyed on purpose: the value is what is being edited, so it cannot key its own row. -->
          {#each list.values, index}
            {@const duplicate = isDuplicateValue(list.values, index)}
            <li>
              <input
                type="text"
                class:invalid={duplicate}
                aria-label={`${strings.valueLabel}: ${list.name}`}
                aria-invalid={duplicate}
                title={duplicate ? strings.duplicateEntry : ''}
                bind:value={list.values[index]}
              />
              {#if index < list.values.length - 1}
                {@render removeValueButton(() => list.values.splice(index, 1))}
              {:else}
                <span class="spacer"></span>
              {/if}
            </li>
          {/each}
        </ul>
      </article>
    {/each}
  </dialog>
{/if}

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

  .bar-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
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
    gap: var(--space-2);
    padding: 0.15rem 0;
    border-bottom: 1px solid var(--grid-line);
  }

  li:last-child {
    border-bottom: none;
  }

  li input {
    flex: 1;
    min-width: 0;
  }

  .time {
    flex: none;
  }

  .invalid {
    color: var(--red);
    border-color: var(--red);
  }

  /* Holds the delete button's width, so the draft row lines up with the rest. */
  .spacer {
    flex: none;
    width: calc(16px + 2 * var(--space-2) + 2px);
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
