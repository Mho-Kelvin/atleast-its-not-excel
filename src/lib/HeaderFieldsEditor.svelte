<script lang="ts">
  import { dragHandle, dragHandleZone, type DndEvent } from 'svelte-dnd-action'
  import Icon from './Icon.svelte'
  import { isHeaderFieldEmpty } from './document'
  import { isDragPlaceholder } from './slots'
  import { dragAnnouncements, strings } from './strings'
  import type { HeaderField, ScheduleDocument } from './types'

  let {
    plan = $bindable(),
    ondragstatechange,
  }: {
    plan: ScheduleDocument
    ondragstatechange?: (dragging: boolean) => void
  } = $props()

  let announcement = $state('')

  function announce(
    event: CustomEvent<DndEvent<HeaderField>>,
    phrase: (position: number, count: number) => string,
  ): void {
    const index = event.detail.items.findIndex((field) => field.id === event.detail.info.id)
    if (index < 0) return
    announcement = phrase(index + 1, event.detail.items.length)
  }

  function onReordered(event: CustomEvent<DndEvent<HeaderField>>): void {
    ondragstatechange?.(true)
    plan.headerFields = event.detail.items
    announce(event, dragAnnouncements.headerFieldMoved)
  }

  function onDropped(event: CustomEvent<DndEvent<HeaderField>>): void {
    plan.headerFields = event.detail.items.filter((field) => !isDragPlaceholder(field))
    announce(event, dragAnnouncements.headerFieldDropped)
    ondragstatechange?.(false)
  }
</script>

<span class="announcer no-print" aria-live="polite">{announcement}</span>

<section
  use:dragHandleZone={{
    items: plan.headerFields,
    type: 'header-fields',
    flipDurationMs: 0,
    autoAriaDisabled: true,
  }}
  onconsider={onReordered}
  onfinalize={onDropped}
>
  {#each plan.headerFields as field, index (field.id)}
    {#if isDragPlaceholder(field)}
      <div class="field no-print"></div>
    {:else}
      {@const empty = isHeaderFieldEmpty(field)}
      {@const draft = index === plan.headerFields.length - 1 && empty}
      <div class="field" class:empty>
        <span
          use:dragHandle
          class="drag-handle no-print"
          title={strings.dragHeaderField}
          aria-label={strings.dragHeaderField}
          aria-describedby="drag-help"
        >
          <Icon name="grip" size={18} />
        </span>
        <input
          type="text"
          class="label"
          aria-label={strings.headerFieldLabel}
          placeholder={strings.headerFieldLabel}
          bind:value={field.label}
        />
        <input
          type="text"
          class="value"
          aria-label={strings.headerFieldValue}
          placeholder={strings.headerFieldValue}
          bind:value={field.value}
        />
        {#if !draft}
          {@const named =
            field.label.trim() === ''
              ? strings.removeHeaderField
              : strings.removeHeaderFieldNamed(field.label.trim())}
          <button
            type="button"
            class="icon no-print"
            title={named}
            aria-label={named}
            onclick={() => plan.headerFields.splice(index, 1)}
          >
            <Icon name="close" size={16} />
          </button>
        {/if}
      </div>
    {/if}
  {/each}
</section>

<style>
  /* Reads as filled-in stationery: the label column keeps its width down the
     block, so the values line up whatever the labels say. */
  /* Two squares tall, so the block of fields sits on the ruling behind it. */
  .field {
    display: grid;
    grid-template-columns: 2ch 9rem minmax(0, 26rem) auto;
    align-items: center;
    gap: var(--space-2);
    height: calc(var(--square) * 2);
    padding: 0;
  }

  /* Opaque, so the ruling behind the sheet does not read through the writing. */
  .label,
  .value {
    border-color: var(--rule);
    background: #fff;
  }

  .label {
    font-weight: 600;
    color: var(--ink-muted);
  }

  .label::placeholder,
  .value::placeholder {
    color: var(--ink-faint);
  }

  .label:hover,
  .value:hover {
    border-color: var(--accent);
  }

  .drag-handle {
    display: flex;
    justify-content: center;
    cursor: grab;
    color: var(--ink-faint);
    user-select: none;
  }

  .drag-handle:hover {
    color: var(--accent);
  }

  .announcer {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  /* An auto track soaks up the row's free space, which made the button as wide
     as the screen was empty. */
  .icon {
    justify-self: start;
    padding: var(--space-1);
    border-color: transparent;
    background: none;
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

  @media print {
    .empty {
      display: none;
    }

    .field {
      grid-template-columns: auto 1fr auto;
      gap: 0 3mm;
      height: auto;
      padding: 0;
    }

    .label,
    .value {
      width: auto;
    }
  }
</style>
