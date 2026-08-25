<script lang="ts">
  import Icon from './Icon.svelte'
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
          class="icon no-print"
          title={strings.removeHeaderField}
          aria-label={strings.removeHeaderField}
          onclick={() => plan.headerFields.splice(index, 1)}
        >
          <Icon name="close" size={16} />
        </button>
      {/if}
    </div>
  {/each}
</section>

<style>
  /* Reads as filled-in stationery: the label column keeps its width down the
     block, so the values line up whatever the labels say. */
  .field {
    display: grid;
    grid-template-columns: 9rem 1fr auto;
    align-items: center;
    gap: var(--space-2);
    padding: 0.1rem 0;
  }

  .label,
  .value {
    border-color: transparent;
    background: none;
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
    border-color: var(--rule);
    background: #fff;
  }

  .label:focus,
  .value:focus {
    background: #fff;
  }

  .icon {
    padding: var(--space-1);
    border-color: transparent;
    background: none;
    color: var(--ink-faint);
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
      grid-template-columns: auto 1fr;
      gap: 0 3mm;
      padding: 0;
    }

    .label,
    .value {
      width: auto;
    }
  }
</style>
