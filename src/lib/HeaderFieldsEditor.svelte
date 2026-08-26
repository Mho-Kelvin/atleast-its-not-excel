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
  {/each}
</section>

<style>
  /* Reads as filled-in stationery: the label column keeps its width down the
     block, so the values line up whatever the labels say. */
  /* Two squares tall, so the block of fields sits on the ruling behind it. */
  .field {
    display: grid;
    grid-template-columns: 9rem minmax(0, 26rem) auto;
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
