<script lang="ts">
  import { isHeaderFieldEmpty } from './document'
  import { strings } from './strings'
  import type { ScheduleDocument } from './types'

  let { plan = $bindable() }: { plan: ScheduleDocument } = $props()
</script>

<section>
  {#each plan.headerFields as field, index (field.id)}
    {@const empty = isHeaderFieldEmpty(field)}
    {@const draft = index === plan.headerFields.length - 1 && empty}
    <div class="field" class:empty>
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
        <button
          type="button"
          class="no-print"
          title={strings.removeHeaderField}
          onclick={() => plan.headerFields.splice(index, 1)}
        >
          ✕
        </button>
      {/if}
    </div>
  {/each}
</section>

<style>
  .field {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0;
  }

  .label {
    width: 12ch;
    font-weight: 600;
  }

  .value {
    flex: 1;
  }

  @media print {
    .empty {
      display: none;
    }

    .label,
    .value {
      width: auto;
      flex: none;
    }

    .value {
      margin-left: 0.5rem;
    }
  }
</style>
