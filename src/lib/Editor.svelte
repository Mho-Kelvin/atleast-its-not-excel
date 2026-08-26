<script lang="ts">
  import HeaderFieldsEditor from './HeaderFieldsEditor.svelte'
  import Icon from './Icon.svelte'
  import ScheduleTable from './ScheduleTable.svelte'
  import { ensureDrafts } from './document'
  import StartTimeField from './StartTimeField.svelte'
  import { printFitNotice, PRINTS_AS_IS, type PrintFit } from './printFit'
  import { strings } from './strings'
  import { createUndoTracker } from './undoTracker.svelte'
  import type { ScheduleDocument, SelectList, StartTime } from './types'

  let {
    plan = $bindable(),
    lists,
    startTimes,
    isTemplate = false,
    onback,
    onsaveastemplate,
  }: {
    plan: ScheduleDocument
    lists: SelectList[]
    startTimes: StartTime[]
    /** A template edits exactly like a document; only the wording differs. */
    isTemplate?: boolean
    onback: () => void
    onsaveastemplate: () => void
  } = $props()

  const titlePlaceholder = $derived(
    isTemplate ? strings.templateTitlePlaceholder : strings.documentTitlePlaceholder,
  )

  let dragging = $state(false)

  let printFit = $state<PrintFit>(PRINTS_AS_IS)
  const fitNotice = $derived(printFitNotice(printFit))

  // Declared before the tracker on purpose: the draft row it appends belongs to
  // the same change, so one keystroke still costs one undo step. Held off during
  // a drag, which is rewriting the row order anyway.
  $effect(() => {
    if (dragging) return
    ensureDrafts(plan)
  })

  const tracker = createUndoTracker(
    () => plan,
    () => dragging,
  )

  function restore(snapshot: string | null): void {
    if (snapshot !== null) plan = JSON.parse(snapshot)
  }

  // updatedAt is stamped by the tracker on every real edit, so it is the one
  // signal that says the document was written. Deliberately no live region:
  // announcing "gespeichert" into every pause would talk over the typing.
  let saved = $state(false)

  $effect(() => {
    const written = plan.updatedAt
    saved = false
    const settled = setTimeout(() => (saved = plan.updatedAt === written), 600)
    return () => clearTimeout(settled)
  })

  function onKeydown(event: KeyboardEvent): void {
    if (!event.ctrlKey && !event.metaKey) return

    const key = event.key.toLowerCase()
    const wantsRedo = key === 'y' || (key === 'z' && event.shiftKey)
    if (!wantsRedo && key !== 'z') return

    event.preventDefault()
    const current = JSON.stringify(plan)
    restore(wantsRedo ? tracker.redoFrom(current) : tracker.undoFrom(current))
  }
</script>

<svelte:window onkeydown={onKeydown} />

<div class="toolbar no-print">
  <button type="button" onclick={onback}>
    <Icon name="back" />
    {strings.back}
  </button>

  {#if isTemplate}
    <span class="badge">{strings.templateBadge}</span>
  {/if}

  <span class="steps">
    <button
      type="button"
      class="icon"
      title={strings.undo}
      aria-label={strings.undo}
      disabled={!tracker.canUndo}
      onclick={() => restore(tracker.undoFrom(tracker.lastSnapshot))}
    >
      <Icon name="undo" />
    </button>
    <button
      type="button"
      class="icon"
      title={strings.redo}
      aria-label={strings.redo}
      disabled={!tracker.canRedo}
      onclick={() => restore(tracker.redoFrom(tracker.lastSnapshot))}
    >
      <Icon name="redo" />
    </button>
  </span>

  <span class="saved" class:visible={saved}>
    <Icon name="check" size={16} />
    {strings.saved}
  </span>

  <!-- What printing had to give up to hold the table on an A4 page. Muted, not
       red: nothing here went wrong, and red belongs to errors. -->
  {#if fitNotice !== ''}
    <span class="fit">
      <Icon name="warning" size={16} />
      {fitNotice}
    </span>
  {/if}

  <!-- One group, so the print button keeps the right edge whether or not the
       template button is beside it. -->
  <span class="end">
    <!-- Missing while a template is open: the badge already says so, and the
         button would only make a second copy of it. -->
    {#if !isTemplate}
      <button type="button" onclick={onsaveastemplate}>
        <Icon name="template" />
        {strings.saveAsTemplate}
      </button>
    {/if}

    <button type="button" class="primary" onclick={() => window.print()}>
      <Icon name="print" />
      {strings.print}
    </button>
  </span>
</div>

<article class="sheet">
  <header>
    <!-- The label is carried by aria alone: a document's title reads as a title,
         not as a form field, and it prints as the heading it looks like. -->
    <input
      type="text"
      class="title no-print"
      aria-label={strings.documentTitleLabel}
      bind:value={plan.title}
      placeholder={titlePlaceholder}
    />
    <h1 class="print-only">{plan.title || titlePlaceholder}</h1>

    <StartTimeField bind:plan {startTimes} />

    <HeaderFieldsEditor bind:plan ondragstatechange={(active) => (dragging = active)} />
  </header>

  <ScheduleTable
    bind:plan
    {lists}
    ondragstatechange={(active) => (dragging = active)}
    onprintfit={(fit) => (printFit = fit)}
  />
</article>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
  }

  .steps {
    display: flex;
    gap: var(--space-1);
  }

  .icon {
    padding: var(--space-2);
    color: var(--ink-muted);
  }

  .end {
    display: flex;
    gap: var(--space-2);
    margin-left: auto;
  }

  .badge {
    padding: 0.1rem var(--space-2);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    font-size: 0.85rem;
    color: var(--accent);
  }

  .primary {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }

  .primary:hover {
    background: var(--ink);
    border-color: var(--ink);
  }

  /* Appears once the writing settles, then stays. It never moves the toolbar:
     the space is held whether or not the words are there. */
  .saved {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: var(--space-3);
    font-size: 0.85rem;
    color: var(--ink-faint);
    opacity: 0;
    transition: opacity 300ms;
  }

  .saved.visible {
    opacity: 1;
  }

  .fit {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: var(--space-3);
    font-size: 0.85rem;
    color: var(--ink-muted);
  }

  /* The sheet is the paper: ruled 5mm like a school exercise book, which is
     also the rhythm the table rows are sized to. */
  .sheet {
    /* The ruling starts where the writing starts, so a row of two squares lands
       on a line instead of somewhere between two. */
    background-origin: content-box;
    padding: calc(var(--square) * 2);
    border: 1px solid var(--rule);
    border-radius: var(--radius-lg);
    background-color: #fff;
    background-image:
      repeating-linear-gradient(to right, var(--grid-line) 0 1px, transparent 1px var(--square)),
      repeating-linear-gradient(to bottom, var(--grid-line) 0 1px, transparent 1px var(--square));
    box-shadow: var(--shadow);
  }

  header {
    margin-bottom: calc(var(--square) * 2);
  }

  .title {
    width: 100%;
    height: calc(var(--square) * 2);
    padding: 0;
    border: none;
    background: none;
    font-size: 1.6rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--ink);
  }

  .title::placeholder {
    color: var(--ink-faint);
    font-style: italic;
    font-weight: 400;
  }

  h1 {
    font-size: 1.6rem;
    margin: 0;
  }

  .print-only {
    display: none;
  }

  @media print {
    .print-only {
      display: block;
    }

    /* Paper is paper: no ruling, no card, no margin of its own, and no rhythm to
       hold: there is nothing left to line up with. */
    .sheet {
      padding: 0;
      border: none;
      border-radius: 0;
      background: none;
      box-shadow: none;
    }

    header {
      margin-bottom: 4mm;
    }

    .title {
      height: auto;
    }
  }
</style>
