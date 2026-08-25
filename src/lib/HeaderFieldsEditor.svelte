<script lang="ts">
  import { strings } from './strings'
  import type { ScheduleDocument } from './types'

  let { plan = $bindable() }: { plan: ScheduleDocument } = $props()

  function isEmpty(label: string, value: string): boolean {
    return label.trim() === '' && value.trim() === ''
  }
</script>

<section>
  {#each plan.headerFields as field, index (field.id)}
    <!-- The last empty field is the draft: it becomes a real field as soon as
         someone types in it, and a fresh draft takes its place below. -->
    {@const draft = index === plan.headerFields.length - 1 && isEmpty(field.label, field.value)}
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
