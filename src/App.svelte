<script lang="ts">
  import DocumentList from './lib/DocumentList.svelte'
  import Editor from './lib/Editor.svelte'
  import ListManager from './lib/ListManager.svelte'
  import { createDocument, duplicateDocument } from './lib/document'
  import { closeLists, listsDialog, openLists } from './lib/listsDialog.svelte'
  import { loadStore, saveStore } from './lib/storage'
  import { strings } from './lib/strings'

  type View = 'documents' | 'editor'

  let store = $state(loadStore())
  let view = $state<View>('documents')
  let currentId = $state<string | null>(null)
  let saveFailed = $state(false)

  const currentIndex = $derived(store.documents.findIndex((entry) => entry.id === currentId))

  // localStorage on every keystroke. NOTE: no debounce, add one if a big
  // document ever makes typing feel heavy.
  function persist(): void {
    saveFailed = !saveStore($state.snapshot(store))
  }

  $effect(persist)

  function open(id: string): void {
    currentId = id
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
      view = 'documents'
    }
  }
</script>

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
      onmanagelists={() => openLists()}
    />
  {:else if currentIndex >= 0}
    <!-- The editor is mounted per document, so the undo history and the custom
         start time it holds die with it when one is opened or closed. -->
    <Editor
      bind:plan={store.documents[currentIndex]}
      lists={store.lists}
      startTimes={store.startTimes}
      onback={() => (view = 'documents')}
    />
  {/if}
</main>

<!-- Outside the view switch: the same dialog serves the home screen and the
     column settings panel inside a document. -->
<ListManager
  bind:store
  open={listsDialog.open}
  focusListId={listsDialog.focusListId}
  onclose={closeLists}
/>

<style>
  main {
    max-width: 60rem;
    margin: 0 auto;
    padding: 1rem;
  }

  .warning {
    color: #a33;
  }

  @media print {
    main {
      max-width: none;
      padding: 0;
    }
  }
</style>
