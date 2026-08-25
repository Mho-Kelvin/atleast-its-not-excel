<script lang="ts">
  import ConfirmDialog from './ConfirmDialog.svelte'
  import { strings } from './strings'
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

  function formatChanged(timestamp: number): string {
    return new Date(timestamp).toLocaleString('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  let removing = $state<ScheduleDocument | null>(null)

  function remove(): void {
    if (removing) ondelete(removing.id)
    removing = null
  }
</script>

<section>
  <h1>{strings.documents}</h1>

  <div class="actions">
    <button type="button" onclick={oncreate}>{strings.newDocument}</button>
    <button type="button" onclick={onmanagelists}>{strings.lists}</button>
  </div>

  {#if sorted.length === 0}
    <p class="empty">{strings.noDocuments}</p>
  {:else}
    <ul>
      {#each sorted as entry (entry.id)}
        <li>
          <button type="button" class="title" onclick={() => onopen(entry.id)}>
            {entry.title || strings.documentTitlePlaceholder}
          </button>
          <span class="changed">{strings.lastChanged}: {formatChanged(entry.updatedAt)}</span>
          <button type="button" onclick={() => onduplicate(entry.id)}>
            {strings.duplicateDocument}
          </button>
          <button type="button" onclick={() => (removing = entry)}>
            {strings.deleteDocument}
          </button>
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
  ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
  }

  li {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #ddd;
  }

  .title {
    flex: 1;
    text-align: left;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    font-weight: 600;
    color: #24457c;
    cursor: pointer;
    text-decoration: underline;
  }

  .changed {
    color: #666;
    font-size: 0.85em;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .empty {
    color: #666;
  }
</style>
