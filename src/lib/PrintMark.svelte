<script lang="ts">
  import { strings } from './strings'

  let {
    hidden,
    auto = false,
  }: {
    hidden: boolean | undefined
    /** Taken away by the page rather than switched off by hand, which reads differently. */
    auto?: boolean
  } = $props()

  const label = $derived(auto ? strings.autoHidden : strings.notPrinted)
</script>

{#if hidden === true || auto}<span
    class="print-mark no-print"
    role="img"
    aria-label={label}
    title={label}>⊘</span
  >{/if}

<style>
  .print-mark {
    margin-left: 0.3rem;
    color: #888;
    font-weight: normal;
  }
</style>
