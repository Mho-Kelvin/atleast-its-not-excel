<script lang="ts">
  import Icon from './Icon.svelte'
  import { CUSTOM_VALUE, startTimeOptions } from './lists'
  import { formatStartTime, parseTimeOfDay } from './schedule'
  import { strings } from './strings'
  import type { ScheduleDocument, StartTime } from './types'

  let {
    plan = $bindable(),
    startTimes,
  }: {
    plan: ScheduleDocument
    startTimes: StartTime[]
  } = $props()

  const isValid = $derived(parseTimeOfDay(plan.startTime) !== null)

  const choices = $derived(startTimeOptions(startTimes))

  let custom = $state(false)
  const isCustom = $derived(
    custom || (plan.startTime !== '' && !choices.some((entry) => entry.time === plan.startTime)),
  )

  // Two entries may share a time, so the document remembers which one was picked.
  // An entry that has since been deleted falls back to the first on that time.
  const chosen = $derived(
    choices.find((entry) => entry.id === plan.startTimeId && entry.time === plan.startTime) ??
      choices.find((entry) => entry.time === plan.startTime),
  )

  function choose(picked: string): void {
    if (picked === CUSTOM_VALUE) {
      custom = true
      plan.startTime = ''
      plan.startTimeId = undefined
      return
    }
    const entry = choices.find((option) => option.id === picked)
    plan.startTime = entry?.time ?? ''
    plan.startTimeId = entry?.id
  }

  function leaveCustom(): void {
    if (plan.startTime === '') custom = false
  }

  function focusIfCustom(node: HTMLInputElement): void {
    if (custom) node.focus()
  }
</script>

<!-- Explicit for/id, not a wrapping <label>: a wrapped select pulls its own
     option text into its accessible name. -->
<p class="start" class:print-hidden={plan.hideStartTimeInPrint}>
  <span class="clock no-print"><Icon name="clock" size={16} /></span>
  <label for="start-time">{strings.startTimeLabel}</label>
  {#if choices.length > 0 && !isCustom}
    <select
      id="start-time"
      value={chosen?.id ?? ''}
      onchange={(event) => choose(event.currentTarget.value)}
    >
      <option value=""></option>
      {#each choices as entry (entry.id)}
        <option value={entry.id}>{formatStartTime(entry)}</option>
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
      onblur={leaveCustom}
    />
  {/if}
  {#if !isValid}
    <span class="no-print warning">
      <Icon name="warning" size={16} />
      {strings.startTimeInvalid}
    </span>
  {/if}

  <label class="check no-print">
    <input
      type="checkbox"
      checked={plan.hideStartTimeInPrint !== true}
      onchange={(event) => (plan.hideStartTimeInPrint = !event.currentTarget.checked)}
    />
    {strings.printStartTime}
  </label>
</p>

<style>
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

  .check {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: var(--space-3);
    color: var(--ink-faint);
  }

  @media print {
    .start {
      height: auto;
      margin: 1mm 0 3mm;
      font-size: inherit;
      color: inherit;
    }
  }
</style>
