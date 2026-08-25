<script lang="ts">
  import { createList, removeList } from './lists'
  import { formatStartTime } from './schedule'
  import { strings } from './strings'
  import type { SelectList, Store } from './types'

  let { store = $bindable(), onback }: { store: Store; onback: () => void } = $props()

  let newListName = $state('')
  let newValues = $state<Record<string, string>>({})
  let newStartTime = $state('')
  let newStartTimeName = $state('')

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

  /** The time input hands over "09:00" or nothing at all, so there is no text to check. */
  function addStartTime(): void {
    if (newStartTime === '' || store.startTimes.some((entry) => entry.time === newStartTime)) return
    const name = newStartTimeName.trim()
    store.startTimes = [...store.startTimes, { time: newStartTime, name: name || undefined }].sort(
      (a, b) => a.time.localeCompare(b.time),
    )
    newStartTime = ''
    newStartTimeName = ''
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

  <!-- The start times are one fixed list: nothing attaches to it, nothing deletes
       it, and a time input is what keeps unusable values out of it. -->
  <article>
    <header>
      <h2>{strings.startTimeList}</h2>
    </header>

    <ul>
      {#each store.startTimes as entry, index (entry.time)}
        <li>
          <span>{formatStartTime(entry)}</span>
          <button type="button" onclick={() => store.startTimes.splice(index, 1)}>
            {strings.removeValue}
          </button>
        </li>
      {/each}
    </ul>

    <div class="add">
      <input
        type="text"
        aria-label={strings.startTimeNameLabel}
        placeholder={strings.startTimeNameLabel}
        bind:value={newStartTimeName}
      />
      <input
        type="time"
        aria-label={`${strings.addValue}: ${strings.startTimeList}`}
        bind:value={newStartTime}
        onkeydown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            addStartTime()
          }
        }}
      />
      <button type="button" onclick={addStartTime}>{strings.addValue}</button>
    </div>
  </article>

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

  h2 {
    font-size: 1em;
    margin: 0;
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
