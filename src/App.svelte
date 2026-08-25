<script lang="ts">
  import DocumentList from './lib/DocumentList.svelte'
  import HeaderFieldsEditor from './lib/HeaderFieldsEditor.svelte'
  import ListManager from './lib/ListManager.svelte'
  import ScheduleTable from './lib/ScheduleTable.svelte'
  import { createDocument, duplicateDocument, ensureDrafts } from './lib/document'
  import { clear, createHistory, record, redo, undo } from './lib/history'
  import { CUSTOM_VALUE } from './lib/lists'
  import { formatStartTime, parseTimeOfDay } from './lib/schedule'
  import { loadStore, saveStore } from './lib/storage'
  import { strings } from './lib/strings'
  import type { ScheduleDocument } from './lib/types'

  type View = 'documents' | 'editor' | 'lists'

  let store = $state(loadStore())
  let view = $state<View>('documents')
  let currentId = $state<string | null>(null)
  let saveFailed = $state(false)
  let dragging = $state(false)

  const history = createHistory()
  let lastKey = ''
  let lastSnapshot = ''
  let applyingHistory = false

  const currentIndex = $derived(store.documents.findIndex((entry) => entry.id === currentId))
  const startTimeIsValid = $derived(
    currentIndex < 0 || parseTimeOfDay(store.documents[currentIndex].startTime) !== null,
  )

  /** Set while the user typed a time of their own, the same escape a dropdown cell has. */
  let customStartTime = $state(false)
  const startTimeIsCustom = $derived.by(() => {
    const startTime = store.documents[currentIndex]?.startTime ?? ''
    const onList = store.startTimes.some((entry) => entry.time === startTime)
    return customStartTime || (startTime !== '' && !onList)
  })

  function chooseStartTime(chosen: string): void {
    if (chosen === CUSTOM_VALUE) {
      customStartTime = true
      store.documents[currentIndex].startTime = ''
      return
    }
    store.documents[currentIndex].startTime = chosen
  }

  /** An emptied box hands the dropdown back, as it does in a dropdown cell. */
  function leaveCustomStartTime(): void {
    if (store.documents[currentIndex].startTime === '') customStartTime = false
  }

  function focusIfCustom(node: HTMLInputElement): void {
    if (customStartTime) node.focus()
  }

  /** updatedAt is pinned out of the key: we set it ourselves, and a key that saw it
      would make the effect below retrigger itself forever. */
  function changeKey(document: ScheduleDocument): string {
    return JSON.stringify({ ...document, updatedAt: 0 })
  }

  // Declared before the recording effect on purpose: the draft row it appends
  // is part of the same change, so one keystroke still costs one undo step.
  // Held off during a drag, which is rewriting the row order anyway.
  $effect(() => {
    const document = store.documents[currentIndex]
    if (!document || dragging) return
    ensureDrafts(document)
  })

  // localStorage on every keystroke. ponytail: no debounce, add one if a big
  // document ever makes typing feel heavy.
  function persist(): void {
    saveFailed = !saveStore($state.snapshot(store))
  }

  $effect(persist)

  // A drag rewrites the order on every pointer move. Recording is held off
  // until the drop, so one drag costs one undo step instead of a dozen.
  $effect(() => {
    const document = store.documents[currentIndex]
    if (!document || dragging) return

    const key = changeKey(document)
    if (key === lastKey) return

    if (lastSnapshot !== '' && !applyingHistory) record(history, lastSnapshot)
    applyingHistory = false
    lastKey = key
    lastSnapshot = JSON.stringify(document)
    document.updatedAt = Date.now()
  })

  function forgetHistory(): void {
    clear(history)
    lastKey = ''
    lastSnapshot = ''
    applyingHistory = false
  }

  function open(id: string): void {
    currentId = id
    customStartTime = false
    forgetHistory()
    view = 'editor'
  }

  function create(): void {
    const document = createDocument('')
    store.documents.push(document)
    open(document.id)
  }

  function duplicate(id: string): void {
    const source = store.documents.find((entry) => entry.id === id)
    if (!source) return
    store.documents.push(duplicateDocument(source, `${source.title} ${strings.copySuffix}`.trim()))
  }

  function remove(id: string): void {
    store.documents = store.documents.filter((entry) => entry.id !== id)
    if (currentId === id) {
      currentId = null
      forgetHistory()
      view = 'documents'
    }
  }

  function backToDocuments(): void {
    view = 'documents'
    forgetHistory()
  }

  function restore(snapshot: string | null): void {
    if (snapshot === null || currentIndex < 0) return
    applyingHistory = true
    store.documents[currentIndex] = JSON.parse(snapshot)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (view !== 'editor' || !(event.ctrlKey || event.metaKey)) return
    const document = store.documents[currentIndex]
    if (!document) return

    const key = event.key.toLowerCase()
    const wantsRedo = key === 'y' || (key === 'z' && event.shiftKey)
    if (!wantsRedo && key !== 'z') return

    event.preventDefault()
    const current = JSON.stringify(document)
    restore(wantsRedo ? redo(history, current) : undo(history, current))
  }
</script>

<svelte:window onkeydown={onKeydown} />

<main>
  {#if saveFailed}
    <p class="no-print warning" role="alert">{strings.saveFailed}</p>
  {/if}

  {#if view === 'documents'}
    <DocumentList
      documents={store.documents}
      onopen={open}
      oncreate={create}
      onduplicate={duplicate}
      ondelete={remove}
      onmanagelists={() => (view = 'lists')}
    />
  {:else if view === 'lists'}
    <ListManager bind:store onback={() => (view = 'documents')} />
  {:else if currentIndex >= 0}
    <div class="toolbar no-print">
      <button type="button" onclick={backToDocuments}>{strings.back}</button>
      <button type="button" onclick={() => restore(undo(history, lastSnapshot))}>
        {strings.undo}
      </button>
      <button type="button" onclick={() => restore(redo(history, lastSnapshot))}>
        {strings.redo}
      </button>
      <button type="button" onclick={() => window.print()}>{strings.print}</button>
    </div>

    <header>
      <label class="no-print">
        {strings.documentTitleLabel}
        <input
          type="text"
          bind:value={store.documents[currentIndex].title}
          placeholder={strings.documentTitlePlaceholder}
        />
      </label>
      <h1 class="print-only">
        {store.documents[currentIndex].title || strings.documentTitlePlaceholder}
      </h1>

      <!-- Explicit for/id, not a wrapping <label>: a wrapped select pulls its
           own option text into its accessible name. -->
      <span>
        <label for="start-time">{strings.startTimeLabel}</label>
        {#if store.startTimes.length > 0 && !startTimeIsCustom}
          <select
            id="start-time"
            value={store.documents[currentIndex].startTime}
            onchange={(event) => chooseStartTime(event.currentTarget.value)}
          >
            <option value=""></option>
            {#each store.startTimes as entry (entry.time)}
              <option value={entry.time}>{formatStartTime(entry)}</option>
            {/each}
            <option value={CUSTOM_VALUE}>{strings.customValue}</option>
          </select>
        {:else}
          <!-- Same time input the start-time list is edited with: a time nobody
               can parse never gets into the document in the first place. -->
          <input
            id="start-time"
            type="time"
            use:focusIfCustom
            bind:value={store.documents[currentIndex].startTime}
            onblur={leaveCustomStartTime}
          />
        {/if}
      </span>
      {#if !startTimeIsValid}
        <span class="no-print warning">{strings.startTimeInvalid}</span>
      {/if}
    </header>

    <HeaderFieldsEditor bind:plan={store.documents[currentIndex]} />
    <ScheduleTable
      bind:plan={store.documents[currentIndex]}
      lists={store.lists}
      ondragstatechange={(active) => (dragging = active)}
    />
  {/if}
</main>

<style>
  main {
    max-width: 60rem;
    margin: 0 auto;
    padding: 1rem;
  }

  .toolbar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: 1.4rem;
    margin: 0;
  }

  .print-only {
    display: none;
  }

  header span > label {
    margin-right: 0.3rem;
  }

  .warning {
    color: #a33;
  }

  @media print {
    main {
      max-width: none;
      padding: 0;
    }

    .print-only {
      display: block;
    }
  }
</style>
