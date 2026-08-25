<script lang="ts">
  import { strings } from './strings'

  let {
    value = $bindable(),
    invalid = false,
    autofocus = false,
    onblur,
  }: {
    value: string
    invalid?: boolean
    autofocus?: boolean
    onblur?: () => void
  } = $props()

  function focusIfNew(node: HTMLTextAreaElement): void {
    if (autofocus) node.focus()
  }

  /** The cell is a multi-line box, so a newline needs Shift and plain Enter is
      free to step one row down. */
  function onkeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()

    const cell = (event.currentTarget as HTMLElement).closest('td')
    const below = cell?.closest('tr')?.nextElementSibling
    const field = below?.children[cell!.cellIndex]?.querySelector('textarea, select')
    if (field instanceof HTMLElement) field.focus()
  }
</script>

<span class="field" data-value={value ?? ''}>
  <textarea
    rows="1"
    class:cell-invalid={invalid}
    title={invalid ? strings.durationInvalid : ''}
    use:focusIfNew
    bind:value
    {onblur}
    {onkeydown}></textarea>
</span>

<style>
  /* The cell grows with its text: the hidden ::after copy of the value sets the
     height and the textarea sits on top of it in the same grid cell. */
  .field {
    display: grid;
    min-width: 0;
  }

  .field::after {
    content: attr(data-value) ' ';
    visibility: hidden;
  }

  .field > textarea,
  .field::after {
    grid-area: 1 / 1;
    min-width: 0;
    font: inherit;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  textarea {
    width: 100%;
    border: none;
    padding: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    resize: none;
    overflow: hidden;
  }

  textarea:focus {
    outline: 2px solid #4a6da7;
  }

  .cell-invalid {
    color: #c0202a;
  }

  @media print {
    /* Scoped, so it beats the same reset in print.css. */
    .cell-invalid {
      color: inherit;
    }
  }
</style>
