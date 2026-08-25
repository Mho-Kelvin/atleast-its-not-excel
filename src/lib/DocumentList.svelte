<script lang="ts">
  import ConfirmDialog from './ConfirmDialog.svelte'
  import Icon from './Icon.svelte'
  import { formatChanged } from './dates'
  import { isRowEmpty } from './document'
  import { counts, strings } from './strings'
  import type { ScheduleDocument } from './types'

  let {
    documents,
    onopen,
    oncreate,
    onduplicate,
    ondelete,
    onmanagelists,
  }: {
    documents: ScheduleDocument[]
    onopen: (id: string) => void
    oncreate: () => void
    onduplicate: (id: string) => void
    ondelete: (id: string) => void
    onmanagelists: () => void
  } = $props()

  const sorted = $derived([...documents].sort((a, b) => b.updatedAt - a.updatedAt))

  let removing = $state<ScheduleDocument | null>(null)

  function remove(): void {
    if (removing) ondelete(removing.id)
    removing = null
  }

  /** The trailing draft row is an offer to type, not a line of the schedule. */
  function shape(entry: ScheduleDocument): string {
    const last = entry.rows.at(-1)
    const rows = last && isRowEmpty(last) ? entry.rows.length - 1 : entry.rows.length
    return counts.documentShape(rows, entry.columns.length)
  }
</script>

<section>
  <div class="bar">
    <h1>{strings.documents}</h1>
    <div class="actions">
      <button type="button" class="primary" onclick={oncreate}>
        <Icon name="add" />
        {strings.newDocument}
      </button>
      <button type="button" onclick={onmanagelists}>
        <Icon name="lists" />
        {strings.lists}
      </button>
    </div>
  </div>

  {#if sorted.length === 0}
    <p class="empty">{strings.noDocuments}</p>
  {:else}
    <ul>
      {#each sorted as entry (entry.id)}
        <li>
          <!-- Named after the title alone: content naming would fold the date
               and the shape into the button's name. -->
          <button
            type="button"
            class="open"
            aria-labelledby="card-title-{entry.id}"
            onclick={() => onopen(entry.id)}
          >
            <span
              class="title"
              id="card-title-{entry.id}"
              class:untitled={entry.title.trim() === ''}
            >
              {entry.title || strings.documentTitlePlaceholder}
            </span>
            <span class="changed">{formatChanged(entry.updatedAt)}</span>
            <span class="shape">{shape(entry)}</span>
          </button>

          <!-- Outside the card's own button: a button inside a button is not a
               thing the browser will render. -->
          <div class="card-actions">
            <button
              type="button"
              class="icon"
              title={strings.duplicateDocument}
              aria-label={strings.duplicateDocument}
              onclick={() => onduplicate(entry.id)}
            >
              <Icon name="copy" size={18} />
            </button>
            <button
              type="button"
              class="icon danger"
              title={strings.deleteDocument}
              aria-label={strings.deleteDocument}
              onclick={() => (removing = entry)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<ConfirmDialog
  open={removing !== null}
  message={strings.confirmDeleteDocument}
  confirmLabel={strings.deleteDocument}
  onconfirm={remove}
  oncancel={() => (removing = null)}
/>

<style>
  .bar {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }

  h1 {
    margin: 0;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .primary {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }

  .primary:hover {
    background: var(--ink);
    border-color: var(--ink);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: var(--space-4);
  }

  li {
    position: relative;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--rule);
    border-radius: var(--radius-lg);
    background: #fff;
    box-shadow: var(--shadow);
    transition: border-color var(--duration);
  }

  li:hover {
    border-color: var(--accent);
  }

  .open {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-1);
    padding: var(--space-4);
    border: none;
    border-radius: var(--radius-lg);
    background: none;
    text-align: left;
  }

  .open:hover {
    background: none;
  }

  .title {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--ink);
    overflow-wrap: anywhere;
  }

  .untitled {
    font-style: italic;
    font-weight: 400;
    color: var(--ink-faint);
  }

  .changed,
  .shape {
    font-size: 0.85rem;
    color: var(--ink-muted);
  }

  .shape {
    font-variant-numeric: tabular-nums;
    color: var(--ink-faint);
  }

  .card-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-1);
    padding: 0 var(--space-2) var(--space-2);
  }

  /* Present for the keyboard from the first tab stop, quiet until approached. */
  .icon {
    padding: var(--space-2);
    border-color: transparent;
    background: none;
    color: var(--ink-faint);
    transition:
      color var(--duration),
      background var(--duration);
  }

  li:hover .icon,
  .icon:focus-visible {
    color: var(--ink);
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
  }
</style>
