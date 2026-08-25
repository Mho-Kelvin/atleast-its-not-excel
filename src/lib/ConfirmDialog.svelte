<script lang="ts">
  import Icon from './Icon.svelte'
  import { strings } from './strings'

  let {
    open,
    message,
    confirmLabel,
    onconfirm,
    oncancel,
  }: {
    open: boolean
    message: string
    confirmLabel: string
    onconfirm: () => void
    oncancel: () => void
  } = $props()

  let dialog: HTMLDialogElement

  // showModal() is what buys the focus trap, the inert background and the
  // backdrop; the open attribute alone gives a non-modal box.
  $effect(() => {
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog bind:this={dialog} class="no-print" aria-labelledby="confirm-message" {oncancel}>
  <p id="confirm-message">{message}</p>
  <div class="actions">
    <button type="button" onclick={oncancel}>{strings.cancel}</button>
    <button type="button" class="destructive" onclick={onconfirm}>
      <Icon name="trash" size={18} />
      {confirmLabel}
    </button>
  </div>
</dialog>

<style>
  dialog {
    max-width: 24rem;
    padding: var(--space-5);
    border: 1px solid var(--rule);
    border-radius: var(--radius-lg);
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-lifted);
  }

  dialog[open] {
    animation: appear 150ms ease-out;
  }

  dialog::backdrop {
    background: rgb(31 58 99 / 0.25);
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: scale(0.97);
    }
  }

  p {
    margin-bottom: var(--space-5);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .destructive {
    border-color: var(--red);
    color: var(--red);
  }

  .destructive:hover {
    background: var(--red-sunk);
    border-color: var(--red);
  }

  .destructive:focus-visible {
    outline-color: var(--red);
  }
</style>
