<script lang="ts">
  import { createHeaderField } from './document'
  import { strings } from './strings'
  import type { ScheduleDocument } from './types'

  let { plan = $bindable() }: { plan: ScheduleDocument } = $props()

  function isEmpty(label: string, value: string): boolean {
    return label.trim() === '' && value.trim() === ''
  }
</script>

<section>
  {#each plan.headerFields as field, index (field.id)}
    <div class="field" class:empty={isEmpty(field.label, field.value)}>
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
      <button
        type="button"
        class="no-print"
        title={strings.removeHeaderField}
        onclick={() => plan.headerFields.splice(index, 1)}
      >
        ✕
      </button>
    </div>
  {/each}

  <button
    type="button"
    class="no-print"
    onclick={() => plan.headerFields.push(createHeaderField())}
  >
    {strings.addHeaderField}
  </button>
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
    /* A field nobody filled in has no business on the printed page. */
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
