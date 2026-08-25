<script lang="ts">
  import DocumentList from './lib/DocumentList.svelte'
  import Editor from './lib/Editor.svelte'
  import ListManager from './lib/ListManager.svelte'
  import { createDocument, duplicateDocument } from './lib/document'
  import { loadStore, saveStore } from './lib/storage'
  import { strings } from './lib/strings'

  type View = 'documents' | 'editor' | 'lists'

  let store = $state(loadStore())
  let view = $state<View>('documents')
  let currentId = $state<string | null>(null)
  let saveFailed = $state(false)

  const currentIndex = $derived(store.documents.findIndex((entry) => entry.id === currentId))

  // localStorage on every keystroke. ponytail: no debounce, add one if a big
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
      onmanagelists={() => (view = 'lists')}
    />
  {:else if view === 'lists'}
    <ListManager bind:store onback={() => (view = 'documents')} />
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
