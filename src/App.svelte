<script lang="ts">
  import DocumentList from './lib/DocumentList.svelte'
  import Editor from './lib/Editor.svelte'
  import ListManager from './lib/ListManager.svelte'
  import TemplatePicker from './lib/TemplatePicker.svelte'
  import { createDocument, duplicateDocument } from './lib/document'
  import { closeLists, listsDialog, openLists } from './lib/listsDialog.svelte'
  import { loadStore, saveStore } from './lib/storage'
  import { strings } from './lib/strings'

  type View = 'documents' | 'editor'
  /** Which of the store's two drawers the editor is working in. */
  type Drawer = 'documents' | 'templates'

  let store = $state(loadStore())
  let view = $state<View>('documents')
  let drawer = $state<Drawer>('documents')
  let currentId = $state<string | null>(null)
  let picking = $state(false)
  let saveFailed = $state(false)

  const currentIndex = $derived(store[drawer].findIndex((entry) => entry.id === currentId))

  // localStorage on every keystroke. NOTE: no debounce, add one if a big
  // document ever makes typing feel heavy.
  function persist(): void {
    saveFailed = !saveStore($state.snapshot(store))
  }

  $effect(persist)

  function open(id: string, from: Drawer = 'documents'): void {
    drawer = from
    currentId = id
    view = 'editor'
  }

  /** null starts a blank document, an id starts a copy of that template. */
  function create(templateId: string | null): void {
    const template = store.templates.find((entry) => entry.id === templateId)
    const document = template ? duplicateDocument(template, template.title) : createDocument('')
    store.documents.push(document)
    picking = false
    open(document.id)
  }

  function duplicate(id: string): void {
    const source = store.documents.find((entry) => entry.id === id)
    if (!source) return
    store.documents.push(duplicateDocument(source, `${source.title} ${strings.copySuffix}`.trim()))
  }

  /** A snapshot with fresh ids, so editing either side leaves the other alone. */
  function saveAsTemplate(id: string): void {
    const source = store.documents.find((entry) => entry.id === id)
    if (!source) return
    store.templates.push(duplicateDocument(source, source.title))
  }

  function remove(id: string): void {
    store.documents = store.documents.filter((entry) => entry.id !== id)
    closeIfOpen('documents', id)
  }

  function removeTemplate(id: string): void {
    store.templates = store.templates.filter((entry) => entry.id !== id)
    closeIfOpen('templates', id)
  }

  function closeIfOpen(from: Drawer, id: string): void {
    if (drawer !== from || currentId !== id) return
    currentId = null
    view = 'documents'
  }
</script>

<main>
  {#if saveFailed}
    <p class="no-print warning" role="alert">{strings.saveFailed}</p>
  {/if}

  {#if view === 'documents'}
    <DocumentList
      documents={store.documents}
      templates={store.templates}
      onopen={open}
      onopentemplate={(id) => open(id, 'templates')}
      oncreate={() => (picking = true)}
      onduplicate={duplicate}
      onsaveastemplate={saveAsTemplate}
      ondelete={remove}
      ondeletetemplate={removeTemplate}
      onmanagelists={() => openLists()}
    />
  {:else if currentIndex >= 0}
    <!-- The editor is mounted per document, so the undo history and the custom
         start time it holds die with it when one is opened or closed. -->
    <Editor
      bind:plan={store[drawer][currentIndex]}
      lists={store.lists}
      startTimes={store.startTimes}
      isTemplate={drawer === 'templates'}
      onback={() => (view = 'documents')}
      onsaveastemplate={() => {
        if (currentId !== null) saveAsTemplate(currentId)
      }}
    />
  {/if}
</main>

<TemplatePicker
  open={picking}
  templates={store.templates}
  onchoose={create}
  onclose={() => (picking = false)}
/>

<!-- Outside the view switch: the same dialog serves the home screen and the
     column settings panel inside a document. -->
<ListManager
  bind:store
  open={listsDialog.open}
  focusListId={listsDialog.focusListId}
  onclose={closeLists}
/>

<style>
  /* The sheet stays 60rem while the table fits in it, then grows with the
     table's own minimum up to 90rem, after which the table scrolls in its box
     again. The floor and the cap both yield to the window, so a narrow screen
     never scrolls the page sideways. */
  main {
    box-sizing: border-box;
    width: min-content;
    min-width: min(60rem, 100%);
    max-width: min(90rem, 100%);
    margin: 0 auto;
    padding: 1rem;
  }

  .warning {
    color: #a33;
  }

  @media print {
    main {
      width: auto;
      min-width: 0;
      max-width: none;
      padding: 0;
    }
  }
</style>
