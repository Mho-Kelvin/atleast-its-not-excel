<script lang="ts">
  import { strings } from './strings'

  let { hidden }: { hidden: boolean | undefined } = $props()
</script>

{#if hidden === true}<span
    class="print-mark no-print"
    role="img"
    aria-label={strings.notPrinted}
    title={strings.notPrinted}>⊘</span
  >{/if}

<style>
  .print-mark {
    margin-left: 0.3rem;
    color: #888;
    font-weight: normal;
  }
</style>
