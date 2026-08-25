/**
 * Which side a horizontally scrolling box has more content on. The usual pure
 * CSS scroll shadows sit in the container's background, where the table's opaque
 * cells cover them, so the edges are measured instead.
 *
 * `shape` is read on purpose: adding a column or a row changes how far the table
 * reaches without the container ever resizing.
 */
export function createScrollEdges(shape: () => string) {
  let box: HTMLElement | null = null
  let left = $state(false)
  let right = $state(false)

  function measure(): void {
    if (box === null) return
    const furthest = box.scrollWidth - box.clientWidth
    left = box.scrollLeft > 1
    right = box.scrollLeft < furthest - 1
  }

  $effect(() => {
    if (shape() !== '') measure()
  })

  return {
    get left(): boolean {
      return left
    },
    get right(): boolean {
      return right
    },
    measure,
    /** Also opens a wide table at its first column instead of mid-scroll. */
    watch(node: HTMLElement): void {
      box = node
      node.scrollLeft = 0
    },
  }
}
