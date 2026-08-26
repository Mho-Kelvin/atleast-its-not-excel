<script lang="ts" module>
  /**
   * The whole icon set. Stroke paths on a 24 grid, drawn in currentColor, so a
   * button colours its icon by setting its own colour and nothing else.
   */
  const PATHS = {
    back: 'M19 12H5M12 19l-7-7 7-7',
    undo: 'M3 8h10a6 6 0 0 1 0 12H8M3 8l4-4M3 8l4 4',
    redo: 'M21 8H11a6 6 0 0 0 0 12h5M21 8l-4-4M21 8l-4 4',
    print:
      'M6 9V3h12v6M6 18H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1M6 14h12v7H6z',
    add: 'M12 5v14M5 12h14',
    copy: 'M8 8h11v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2zM16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
    settings: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M8 15v4',
    template: 'M6 3h12v18l-6-4-6 4zM9 8h6',
    close: 'M6 6l12 12M18 6L6 18',
    lists: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    check: 'M4 13l5 5L20 6',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2',
    warning: 'M12 3 2 20h20L12 3zM12 9v5M12 17h.01',
    noPrint: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M6 6l12 12',
    grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  }

  export type IconName = keyof typeof PATHS
</script>

<script lang="ts">
  let { name, size = 20 }: { name: IconName; size?: number } = $props()
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.75"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <path d={PATHS[name]} />
</svg>

<style>
  svg {
    flex: none;
    display: block;
  }
</style>
