<script lang="ts">
  import Icon from './Icon.svelte'
  import {
    PALETTE,
    effectiveStyle,
    isEmptyStyle,
    rememberColour,
    toggleProperty,
    withColour,
  } from './cellStyle'
  import { strings } from './strings'
  import type { CellStyle } from './types'

  let {
    style = $bindable(),
    inherited,
    recentColours = $bindable(),
    disabled = false,
    onreset,
  }: {
    style: CellStyle | undefined
    inherited?: CellStyle
    recentColours: string[]
    disabled?: boolean
    onreset?: () => void
  } = $props()

  const effective = $derived(effectiveStyle(inherited, style))

  function toggle(key: 'bold' | 'italic'): void {
    const next = toggleProperty(style, key, inherited?.[key] === true)
    style = isEmptyStyle(next) ? undefined : next
  }

  let colourOpen = $state(false)
  let colourButton: HTMLButtonElement

  // Chrome fires `change` repeatedly while the native picker is dragged, so the
  // value is held here and only applied once, on blur or when the popover closes.
  let pendingColour = $state<string | undefined>(undefined)

  function pickColour(hex: string): void {
    style = withColour(style, hex)
    recentColours = rememberColour(recentColours, hex)
    colourOpen = false
    pendingColour = undefined
  }

  function clearColour(): void {
    style = withColour(style, undefined)
    colourOpen = false
    pendingColour = undefined
  }

  function onColourPick(event: Event): void {
    pendingColour = (event.currentTarget as HTMLInputElement).value
  }

  function commitPendingColour(): void {
    if (pendingColour === undefined) return
    const colour = pendingColour
    pendingColour = undefined
    pickColour(colour)
  }

  function toggleColourPopover(): void {
    colourOpen = !colourOpen
    if (!colourOpen) commitPendingColour()
  }

  function keepFocus(event: MouseEvent): void {
    event.preventDefault()
  }

  /* Same trap as ColumnSettingsPanel: jsdom styles [popover] away without
     implementing it, so the feature has to be detected before it is used. */
  const TOP_LAYER = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype

  function placeUnderButton(node: HTMLElement): void {
    node.showPopover?.()
    const anchor = colourButton.getBoundingClientRect()
    const room = window.innerWidth - node.offsetWidth - 8
    node.style.top = `${anchor.bottom + 4}px`
    node.style.left = `${Math.max(8, Math.min(anchor.left, room))}px`
  }

  function onDocumentPointerDown(event: PointerEvent): void {
    if (!colourOpen) return
    const target = event.target as HTMLElement | null
    if (target?.closest('.colour-group')) return
    colourOpen = false
    commitPendingColour()
  }

  function onWindowKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return
    colourOpen = false
    commitPendingColour()
  }
</script>

<svelte:window onkeydown={onWindowKeydown} />
<svelte:document onpointerdown={onDocumentPointerDown} />

<span class="format-controls no-print" role="group" aria-label={strings.formatGroup}>
  <button
    type="button"
    class="icon"
    aria-pressed={effective.bold === true}
    aria-label={strings.formatBold}
    title={strings.formatBold}
    {disabled}
    onmousedown={keepFocus}
    onclick={() => toggle('bold')}
  >
    <Icon name="bold" size={18} />
  </button>

  <button
    type="button"
    class="icon"
    aria-pressed={effective.italic === true}
    aria-label={strings.formatItalic}
    title={strings.formatItalic}
    {disabled}
    onmousedown={keepFocus}
    onclick={() => toggle('italic')}
  >
    <Icon name="italic" size={18} />
  </button>

  <span class="colour-group">
    <button
      type="button"
      class="icon"
      aria-label={strings.formatColour}
      title={strings.formatColour}
      aria-expanded={colourOpen}
      bind:this={colourButton}
      {disabled}
      onmousedown={keepFocus}
      onclick={toggleColourPopover}
    >
      <Icon name="palette" size={18} />
      <span class="current-colour" style={`background: ${effective.colour ?? 'transparent'}`}
      ></span>
    </button>

    {#if colourOpen}
      <span class="popover no-print" popover={TOP_LAYER ? 'manual' : null} use:placeUnderButton>
        <span class="swatches">
          {#each PALETTE as hex (hex)}
            <button
              type="button"
              class="swatch-choice"
              style={`background: ${hex}`}
              aria-label={strings.paletteColours[hex]}
              title={strings.paletteColours[hex]}
              {disabled}
              onmousedown={keepFocus}
              onclick={() => pickColour(hex)}
            ></button>
          {/each}
        </span>

        {#if recentColours.length > 0}
          <span class="swatches">
            {#each recentColours as hex (hex)}
              <button
                type="button"
                class="swatch-choice"
                style={`background: ${hex}`}
                aria-label={strings.formatRecentColour}
                title={`${strings.formatRecentColour} (${hex})`}
                {disabled}
                onmousedown={keepFocus}
                onclick={() => pickColour(hex)}
              ></button>
            {/each}
          </span>
        {/if}

        <button
          type="button"
          class="no-colour"
          {disabled}
          onmousedown={keepFocus}
          onclick={clearColour}
        >
          <span class="swatch-choice none" aria-hidden="true"></span>
          {strings.formatNoColour}
        </button>

        <details>
          <summary>{strings.formatMoreColours}</summary>
          <input
            type="color"
            aria-label={strings.formatMoreColours}
            value={effective.colour ?? '#000000'}
            {disabled}
            oninput={onColourPick}
            onchange={onColourPick}
            onblur={commitPendingColour}
          />
        </details>
      </span>
    {/if}
  </span>

  {#if onreset && !isEmptyStyle(style)}
    <button
      type="button"
      class="icon"
      aria-label={strings.formatReset}
      title={strings.formatReset}
      {disabled}
      onmousedown={keepFocus}
      onclick={onreset}
    >
      <Icon name="clearFormat" size={18} />
    </button>
  {/if}
</span>

<style>
  .format-controls {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
  }

  .colour-group {
    position: relative;
    display: inline-flex;
  }

  .icon {
    position: relative;
    flex: none;
    padding: var(--space-1) var(--space-2);
    border-color: transparent;
    background: none;
    color: var(--ink-muted);
  }

  .icon:hover:not(:disabled) {
    background: var(--accent-sunk);
    border-color: transparent;
    color: var(--accent);
  }

  .icon[aria-pressed='true'] {
    background: var(--accent-sunk);
    color: var(--accent);
  }

  .current-colour {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 7px;
    height: 7px;
    border: 1px solid var(--rule);
    border-radius: 50%;
  }

  .popover {
    position: fixed;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: var(--space-3);
    border: 1px solid var(--rule);
    border-radius: var(--radius-lg);
    background: var(--paper);
    box-shadow: var(--shadow-lifted);
    font-weight: normal;
    animation: appear 150ms ease-out;
  }

  @keyframes appear {
    from {
      opacity: 0;
      transform: translateY(-2px);
    }
  }

  .swatches {
    display: flex;
    gap: var(--space-1);
  }

  .swatch-choice {
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
  }

  .swatch-choice.none {
    background: var(--paper);
  }

  .no-colour {
    justify-content: flex-start;
    gap: var(--space-2);
    color: var(--ink-muted);
  }

  details summary {
    cursor: pointer;
    color: var(--ink-muted);
    font-size: 0.85em;
  }

  details input[type='color'] {
    box-sizing: border-box;
    width: 100%;
    height: 1.75rem;
    margin-top: var(--space-2);
    padding: 0;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: var(--paper);
  }
</style>
