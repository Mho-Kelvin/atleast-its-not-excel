<script lang="ts">
  import Icon from './Icon.svelte'
  import { formatChanged } from './dates'
  import { strings } from './strings'
  import type { ScheduleDocument } from './types'

  let {
    open,
    templates,
    onchoose,
    onclose,
  }: {
    open: boolean
    templates: ScheduleDocument[]
    /** null starts a blank document; an id starts from that template. */
    onchoose: (templateId: string | null) => void
    onclose: () => void
  } = $props()

  const sorted = $derived([...templates].sort((a, b) => b.updatedAt - a.updatedAt))

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
</script>

{#if open}
  <dialog
    use:asModal
    class="no-print"
    aria-labelledby="picker-title"
    oncancel={onclose}
    onclick={closeOnBackdrop}
  >
    <div class="bar">
      <h1 id="picker-title">{strings.chooseTemplate}</h1>
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

    <ul>
      <li>
        <button type="button" class="choice blank" onclick={() => onchoose(null)}>
          <Icon name="add" size={18} />
          <span class="title">{strings.blankDocument}</span>
        </button>
      </li>

      {#each sorted as template (template.id)}
        <li>
          <button type="button" class="choice" onclick={() => onchoose(template.id)}>
            <Icon name="template" size={18} />
            <span class="title" class:untitled={template.title.trim() === ''}>
              {template.title || strings.documentTitlePlaceholder}
            </span>
            <span class="changed">{formatChanged(template.updatedAt)}</span>
          </button>
        </li>
      {/each}
    </ul>

    {#if sorted.length === 0}
      <p class="empty">{strings.noTemplates}</p>
    {/if}
  </dialog>
{/if}

<style>
  dialog {
    width: min(28rem, 100vw - 2rem);
    max-height: min(36rem, 100vh - 4rem);
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

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .choice {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    width: 100%;
    padding: var(--space-3);
    background: #fff;
    text-align: left;
  }

  .blank {
    border-color: var(--accent);
    color: var(--accent);
  }

  .title {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .untitled {
    font-style: italic;
    font-weight: 400;
    color: var(--ink-faint);
  }

  .changed {
    flex: none;
    font-size: 0.85rem;
    color: var(--ink-faint);
  }

  .icon {
    padding: var(--space-2);
    border-color: transparent;
    background: none;
    color: var(--ink-muted);
  }

  .empty {
    margin: var(--space-4) 0 0;
    color: var(--ink-faint);
  }
</style>
