<script lang="ts">
  import { createList, removeList } from './lists'
  import { strings } from './strings'
  import type { SelectList, Store } from './types'

  let { store = $bindable(), onback }: { store: Store; onback: () => void } = $props()

  let newListName = $state('')
  let newValues = $state<Record<string, string>>({})

  function add(): void {
    const name = newListName.trim()
    if (name === '') return
    store.lists.push(createList(name))
    newListName = ''
  }

  function addValue(list: SelectList): void {
    const value = (newValues[list.id] ?? '').trim()
    if (value === '' || list.values.includes(value)) return
    list.values.push(value)
    newValues[list.id] = ''
  }

  function confirmRemove(list: SelectList): void {
    if (window.confirm(strings.confirmDeleteList)) removeList(store, list.id)
  }
</script>

<section>
  <h1>{strings.lists}</h1>
  <button type="button" onclick={onback}>{strings.back}</button>

  <div class="add">
    <input
      type="text"
      aria-label={strings.listNameLabel}
      placeholder={strings.listNameLabel}
      bind:value={newListName}
    />
    <button type="button" onclick={add}>{strings.newList}</button>
  </div>

  {#if store.lists.length === 0}
    <p class="empty">{strings.noLists}</p>
  {/if}

  {#each store.lists as list (list.id)}
    <article>
      <header>
        <input type="text" aria-label={strings.listNameLabel} bind:value={list.name} />
        <button type="button" onclick={() => confirmRemove(list)}>{strings.deleteList}</button>
      </header>

      <ul>
        {#each list.values as value, index (value)}
          <li>
            <span>{value}</span>
            <button type="button" onclick={() => list.values.splice(index, 1)}>
              {strings.removeValue}
            </button>
          </li>
        {/each}
      </ul>

      <div class="add">
        <input
          type="text"
          aria-label={`${strings.addValue}: ${list.name}`}
          bind:value={newValues[list.id]}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addValue(list)
            }
          }}
        />
        <button type="button" onclick={() => addValue(list)}>{strings.addValue}</button>
      </div>
    </article>
  {/each}
</section>

<style>
  article {
    border: 1px solid #ddd;
    padding: 0.75rem;
    margin-top: 1rem;
  }

  header {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  header input {
    flex: 1;
    font-weight: 600;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.15rem 0;
  }

  .add {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  .empty {
    color: #666;
  }
</style>
