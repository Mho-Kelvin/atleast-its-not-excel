<script lang="ts">
  import ScheduleTable from './lib/ScheduleTable.svelte'
  import { createDocument } from './lib/document'
  import { parseTimeOfDay } from './lib/schedule'
  import { strings } from './lib/strings'
  import type { SelectList } from './lib/types'

  let plan = $state(createDocument(''))
  let lists = $state<SelectList[]>([])

  const startTimeIsValid = $derived(parseTimeOfDay(plan.startTime) !== null)
</script>

<main>
  <header>
    <label class="no-print">
      {strings.documentTitleLabel}
      <input type="text" bind:value={plan.title} placeholder={strings.documentTitlePlaceholder} />
    </label>
    <h1 class="print-only">{plan.title || strings.documentTitlePlaceholder}</h1>

    <label>
      {strings.startTimeLabel}
      <input type="text" size="5" bind:value={plan.startTime} />
    </label>
    {#if !startTimeIsValid}
      <span class="no-print warning">{strings.startTimeInvalid}</span>
    {/if}

    <button type="button" class="no-print" onclick={() => window.print()}>
      {strings.print}
    </button>
  </header>

  <ScheduleTable bind:plan {lists} />
</main>

<style>
  main {
    max-width: 60rem;
    margin: 0 auto;
    padding: 1rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  h1 {
    font-size: 1.4rem;
    margin: 0;
  }

  .print-only {
    display: none;
  }

  .warning {
    color: #a33;
  }

  @media print {
    main {
      max-width: none;
      padding: 0;
    }

    .print-only {
      display: block;
    }
  }
</style>
