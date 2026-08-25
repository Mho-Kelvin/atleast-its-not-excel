<script lang="ts">
  import HeaderFieldsEditor from './HeaderFieldsEditor.svelte'
  import Icon from './Icon.svelte'
  import ScheduleTable from './ScheduleTable.svelte'
  import { ensureDrafts } from './document'
  import { CUSTOM_VALUE } from './lists'
  import { formatStartTime, parseTimeOfDay } from './schedule'
  import { strings } from './strings'
  import { createUndoTracker } from './undoTracker.svelte'
  import type { ScheduleDocument, SelectList, StartTime } from './types'

  let {
    plan = $bindable(),
    lists,
    startTimes,
    onback,
  }: {
    plan: ScheduleDocument
    lists: SelectList[]
    startTimes: StartTime[]
    onback: () => void
  } = $props()

  let dragging = $state(false)

  const startTimeIsValid = $derived(parseTimeOfDay(plan.startTime) !== null)

  let customStartTime = $state(false)
  const startTimeIsCustom = $derived(
    customStartTime ||
      (plan.startTime !== '' && !startTimes.some((entry) => entry.time === plan.startTime)),
  )

  function chooseStartTime(chosen: string): void {
    if (chosen === CUSTOM_VALUE) {
      customStartTime = true
      plan.startTime = ''
      return
    }
    plan.startTime = chosen
  }

  function leaveCustomStartTime(): void {
    if (plan.startTime === '') customStartTime = false
  }

  function focusIfCustom(node: HTMLInputElement): void {
    if (customStartTime) node.focus()
  }

  // Declared before the tracker on purpose: the draft row it appends belongs to
  // the same change, so one keystroke still costs one undo step. Held off during
  // a drag, which is rewriting the row order anyway.
  $effect(() => {
    if (dragging) return
    ensureDrafts(plan)
  })

  const tracker = createUndoTracker(
    () => plan,
    () => dragging,
  )

  function restore(snapshot: string | null): void {
    if (snapshot !== null) plan = JSON.parse(snapshot)
  }

  // updatedAt is stamped by the tracker on every real edit, so it is the one
  // signal that says the document was written. Deliberately no live region:
  // announcing "gespeichert" into every pause would talk over the typing.
  let saved = $state(false)

  $effect(() => {
    const written = plan.updatedAt
    saved = false
    const settled = setTimeout(() => (saved = plan.updatedAt === written), 600)
    return () => clearTimeout(settled)
  })

  function onKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.metaKey) return

    const key = event.key.toLowerCase()
    const wantsRedo = key === 'y' || (key === 'z' && event.shiftKey)
    if (!wantsRedo && key !== 'z') return

    event.preventDefault()
    const current = JSON.stringify(plan)
    restore(wantsRedo ? tracker.redoFrom(current) : tracker.undoFrom(current))
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="toolbar no-print">
  <button type="button" onclick={onback}>
    <Icon name="back" />
    {strings.back}
  </button>

  <span class="steps">
    <button
      type="button"
      class="icon"
      title={strings.undo}
      aria-label={strings.undo}
      onclick={() => restore(tracker.undoFrom(tracker.lastSnapshot))}
    >
      <Icon name="undo" />
    </button>
    <button
      type="button"
      class="icon"
      title={strings.redo}
      aria-label={strings.redo}
      onclick={() => restore(tracker.redoFrom(tracker.lastSnapshot))}
    >
      <Icon name="redo" />
    </button>
  </span>

  <span class="saved" class:visible={saved}>
    <Icon name="check" size={16} />
    {strings.saved}
  </span>

  <button type="button" class="primary" onclick={() => window.print()}>
    <Icon name="print" />
    {strings.print}
  </button>
</div>

<article class="sheet">
  <header>
    <!-- The label is carried by aria alone: a document's title reads as a title,
         not as a form field, and it prints as the heading it looks like. -->
    <input
      type="text"
      class="title no-print"
      aria-label={strings.documentTitleLabel}
      bind:value={plan.title}
      placeholder={strings.documentTitlePlaceholder}
    />
    <h1 class="print-only">{plan.title || strings.documentTitlePlaceholder}</h1>

    <!-- Explicit for/id, not a wrapping <label>: a wrapped select pulls its own
         option text into its accessible name. -->
    <p class="start">
      <span class="clock no-print"><Icon name="clock" size={16} /></span>
      <label for="start-time">{strings.startTimeLabel}</label>
      {#if startTimes.length > 0 && !startTimeIsCustom}
        <select
          id="start-time"
          value={plan.startTime}
          onchange={(event) => chooseStartTime(event.currentTarget.value)}
        >
          <option value=""></option>
          {#each startTimes as entry (entry.time)}
            <option value={entry.time}>{formatStartTime(entry)}</option>
          {/each}
          <option value={CUSTOM_VALUE}>{strings.customValue}</option>
        </select>
      {:else}
        <!-- A time input, so an unparseable time never reaches the document. -->
        <input
          id="start-time"
          type="time"
          use:focusIfCustom
          bind:value={plan.startTime}
          onblur={leaveCustomStartTime}
        />
      {/if}
      {#if !startTimeIsValid}
        <span class="no-print warning">
          <Icon name="warning" size={16} />
          {strings.startTimeInvalid}
        </span>
      {/if}
    </p>

    <HeaderFieldsEditor bind:plan />
  </header>

  <ScheduleTable bind:plan {lists} ondragstatechange={(active) => (dragging = active)} />
</article>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .steps {
    display: flex;
    gap: var(--space-1);
  }

  .icon {
    padding: var(--space-2);
    color: var(--ink-muted);
  }

  .primary {
    margin-left: auto;
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }

  .primary:hover {
    background: var(--ink);
    border-color: var(--ink);
  }

  /* Appears once the writing settles, then stays. It never moves the toolbar:
     the space is held whether or not the words are there. */
  .saved {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: var(--space-3);
    font-size: 0.85rem;
    color: var(--ink-faint);
    opacity: 0;
    transition: opacity 300ms;
  }

  .saved.visible {
    opacity: 1;
  }

  /* The sheet is the paper: ruled 5mm like a school exercise book, which is
     also the rhythm the table rows are sized to. */
  .sheet {
    /* The ruling starts where the writing starts, so a row of two squares lands
       on a line instead of somewhere between two. */
    background-origin: content-box;
    padding: calc(var(--square) * 2);
    border: 1px solid var(--rule);
    border-radius: var(--radius-lg);
    background-color: #fff;
    background-image:
      repeating-linear-gradient(to right, var(--grid-line) 0 1px, transparent 1px var(--square)),
      repeating-linear-gradient(to bottom, var(--grid-line) 0 1px, transparent 1px var(--square));
    box-shadow: var(--shadow);
  }

  header {
    margin-bottom: calc(var(--square) * 2);
  }

  .title {
    width: 100%;
    height: calc(var(--square) * 2);
    padding: 0;
    border: none;
    background: none;
    font-size: 1.6rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
  }

  .title::placeholder {
    color: var(--ink-faint);
    font-style: italic;
    font-weight: 400;
  }

  h1 {
    font-size: 1.6rem;
    margin: 0;
  }

  .print-only {
    display: none;
  }

  .start {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    height: calc(var(--square) * 2);
    margin: 0 0 var(--square);
    color: var(--ink-muted);
    font-size: 0.9rem;
  }

  .clock {
    display: flex;
    color: var(--ink-faint);
  }

  .start select,
  .start input {
    font-variant-numeric: tabular-nums;
  }

  .warning {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--red);
  }

  @media print {
    .print-only {
      display: block;
    }

    /* Paper is paper: no ruling, no card, no margin of its own, and no rhythm to
       hold: there is nothing left to line up with. */
    .sheet {
      padding: 0;
      border: none;
      border-radius: 0;
      background: none;
      box-shadow: none;
    }

    header {
      margin-bottom: 4mm;
    }

    .title,
    .start {
      height: auto;
    }

    .start {
      margin: 1mm 0 3mm;
      font-size: inherit;
      color: inherit;
    }
  }
</style>
