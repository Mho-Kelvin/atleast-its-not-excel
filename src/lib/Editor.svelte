<script lang="ts">
  import HeaderFieldsEditor from './HeaderFieldsEditor.svelte'
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

  /** Set while the user typed a time of their own, the same escape a dropdown cell has. */
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

  /** An emptied box hands the dropdown back, as it does in a dropdown cell. */
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
  <button type="button" onclick={onback}>{strings.back}</button>
  <button type="button" onclick={() => restore(tracker.undoFrom(tracker.lastSnapshot))}>
    {strings.undo}
  </button>
  <button type="button" onclick={() => restore(tracker.redoFrom(tracker.lastSnapshot))}>
    {strings.redo}
  </button>
  <button type="button" onclick={() => window.print()}>{strings.print}</button>
</div>

<header>
  <label class="no-print">
    {strings.documentTitleLabel}
    <input type="text" bind:value={plan.title} placeholder={strings.documentTitlePlaceholder} />
  </label>
  <h1 class="print-only">{plan.title || strings.documentTitlePlaceholder}</h1>

  <!-- Explicit for/id, not a wrapping <label>: a wrapped select pulls its own
       option text into its accessible name. -->
  <span>
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
      <!-- Same time input the start-time list is edited with: a time nobody can
           parse never gets into the document in the first place. -->
      <input
        id="start-time"
        type="time"
        use:focusIfCustom
        bind:value={plan.startTime}
        onblur={leaveCustomStartTime}
      />
    {/if}
  </span>
  {#if !startTimeIsValid}
    <span class="no-print warning">{strings.startTimeInvalid}</span>
  {/if}
</header>

<HeaderFieldsEditor bind:plan />
<ScheduleTable bind:plan {lists} ondragstatechange={(active) => (dragging = active)} />

<style>
  .toolbar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: 1.4rem;
    margin: 0;
  }

  .print-only {
    display: none;
  }

  header span > label {
    margin-right: 0.3rem;
  }

  .warning {
    color: #a33;
  }

  @media print {
    .print-only {
      display: block;
    }
  }
</style>
