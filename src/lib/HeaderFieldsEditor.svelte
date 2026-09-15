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
      {@const unlabelled = field.label.trim() === ''}
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
          class:unlabelled
          aria-label={strings.headerFieldLabel}
          placeholder={strings.headerFieldLabel}
          bind:value={field.label}
        />
        <span class="value" data-value={field.value ?? ''}>
          <textarea
            rows="1"
            class="value-input"
            aria-label={strings.headerFieldValue}
            placeholder={strings.headerFieldValue}
            data-lt-active="false"
            data-gramm="false"
            bind:value={field.value}
          ></textarea>
        </span>
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
    align-items: start;
    gap: var(--space-2);
    min-height: calc(var(--square) * 2);
    padding: 0;
  }

  /* Opaque, so the ruling behind the sheet does not read through the writing. */
  .label {
    border-color: var(--rule);
    background: #fff;
    font-weight: 600;
    color: var(--ink-muted);
  }

  .label::placeholder,
  .value-input::placeholder {
    color: var(--ink-faint);
  }

  .label:hover,
  .value:hover {
    border-color: var(--accent);
  }

  /* The span is not a form control, so it carries the box the input above it
     gets for free from app.css. Mirrors CellField's own grid trick: the
     hidden ::after copy of the value sets the box's height and the textarea
     sits on top of it, in the same grid cell, so the value grows instead of
     scrolling or clipping. */
  .value {
    display: grid;
    min-width: 0;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: #fff;
  }

  .value::after {
    content: attr(data-value) ' ';
    visibility: hidden;
  }

  .value > .value-input,
  .value::after {
    grid-area: 1 / 1;
    min-width: 0;
    font: inherit;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .value-input {
    width: 100%;
    border: none;
    padding: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    resize: none;
    overflow: hidden;
  }

  .value-input:focus-visible {
    outline: none;
  }

  /* The ring belongs on the box, not the borderless textarea inside it. */
  .value:focus-within {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  /* The label already gets 0.25rem from app.css's input default; the drag
     handle is a span and needs its own to line up with the value's first
     line. */
  .drag-handle {
    padding-top: 0.25rem;
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
      grid-template-columns: 9rem 1fr auto;
      gap: 0 3mm;
      min-height: auto;
      padding: 0;
    }

    /* Kept in the layout so the value stays in the fixed value column;
       invisible rather than gone, so a value-only field still lines up
       with the labelled fields around it. */
    .label.unlabelled {
      visibility: hidden;
    }

    .value {
      width: 100%;
      padding: 0;
      border: none;
      background: none;
    }
  }
</style>
