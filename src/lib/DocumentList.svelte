<script lang="ts">
  import ConfirmDialog from './ConfirmDialog.svelte'
  import Icon from './Icon.svelte'
  import { formatChanged } from './dates'
  import { isRowEmpty } from './document'
  import { counts, strings } from './strings'
  import type { ScheduleDocument } from './types'

  let {
    documents,
    templates,
    onopen,
    onopentemplate,
    oncreate,
    onduplicate,
    onsaveastemplate,
    ondelete,
    ondeletetemplate,
    onmanagelists,
    onexport,
    onexporttemplate,
    onbackup,
    onimport,
  }: {
    documents: ScheduleDocument[]
    templates: ScheduleDocument[]
    onopen: (id: string) => void
    onopentemplate: (id: string) => void
    oncreate: () => void
    onduplicate: (id: string) => void
    onsaveastemplate: (id: string) => void
    ondelete: (id: string) => void
    ondeletetemplate: (id: string) => void
    onmanagelists: () => void
    onexport: (id: string) => void
    onexporttemplate: (id: string) => void
    onbackup: () => void
    onimport: () => void
  } = $props()

  const sorted = $derived([...documents].sort((a, b) => b.updatedAt - a.updatedAt))
  const sortedTemplates = $derived([...templates].sort((a, b) => b.updatedAt - a.updatedAt))

  let removing = $state<{ entry: ScheduleDocument; template: boolean } | null>(null)

  function remove(): void {
    if (!removing) return
    if (removing.template) ondeletetemplate(removing.entry.id)
    else ondelete(removing.entry.id)
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
      <button type="button" onclick={onbackup}>
        <Icon name="export" />
        {strings.exportBackup}
      </button>
      <button type="button" onclick={onimport}>
        <Icon name="import" />
        {strings.importFile}
      </button>
    </div>
  </div>

  {#if sorted.length === 0}
    <p class="empty">{strings.noDocuments}</p>
  {:else}
    <ul>
      {#each sorted as entry (entry.id)}
        {@render card(entry, false)}
      {/each}
    </ul>
  {/if}
</section>

<!-- Only there once something is in it: a template is saved from a document, so
     an empty section would be an offer nobody can take up. -->
{#if sortedTemplates.length > 0}
  <!-- Named, so it is a landmark of its own: the cards in it read the same as
       the documents above and only the section tells them apart. -->
  <section class="templates" aria-labelledby="templates-heading">
    <h2 id="templates-heading">{strings.templates}</h2>
    <ul>
      {#each sortedTemplates as entry (entry.id)}
        {@render card(entry, true)}
      {/each}
    </ul>
  </section>
{/if}

{#snippet card(entry: ScheduleDocument, template: boolean)}
  <li>
    <!-- Named after the title alone: content naming would fold the date
         and the shape into the button's name. -->
    <button
      type="button"
      class="open"
      aria-labelledby="card-title-{entry.id}"
      onclick={() => (template ? onopentemplate(entry.id) : onopen(entry.id))}
    >
      <span class="title" id="card-title-{entry.id}" class:untitled={entry.title.trim() === ''}>
        {entry.title ||
          (template ? strings.templateTitlePlaceholder : strings.documentTitlePlaceholder)}
      </span>
      <span class="changed">{formatChanged(entry.updatedAt)}</span>
      <span class="shape">{shape(entry)}</span>
    </button>

    <!-- Outside the card's own button: a button inside a button is not a
         thing the browser will render. -->
    <div class="card-actions">
      {#if !template}
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
          class="icon"
          title={strings.saveAsTemplate}
          aria-label={strings.saveAsTemplate}
          onclick={() => onsaveastemplate(entry.id)}
        >
          <Icon name="template" size={18} />
        </button>
      {/if}
      <button
        type="button"
        class="icon"
        title={template ? strings.exportTemplate : strings.exportDocument}
        aria-label={template ? strings.exportTemplate : strings.exportDocument}
        onclick={() => (template ? onexporttemplate(entry.id) : onexport(entry.id))}
      >
        <Icon name="export" size={18} />
      </button>
      <button
        type="button"
        class="icon danger"
        title={template ? strings.deleteTemplate : strings.deleteDocument}
        aria-label={template ? strings.deleteTemplate : strings.deleteDocument}
        onclick={() => (removing = { entry, template })}
      >
        <Icon name="trash" size={18} />
      </button>
    </div>
  </li>
{/snippet}

<ConfirmDialog
  open={removing !== null}
  message={removing?.template ? strings.confirmDeleteTemplate : strings.confirmDeleteDocument}
  confirmLabel={removing?.template ? strings.deleteTemplate : strings.deleteDocument}
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

  .templates {
    margin-top: var(--space-6);
  }

  h2 {
    margin: 0 0 var(--space-4);
    font-size: 1.1rem;
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
