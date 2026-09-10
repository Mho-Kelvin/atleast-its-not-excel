import type { CellStyle } from './types'

/** Ink, red, green, orange, grey; all at least 4.5:1 on white. */
export const PALETTE: readonly string[] = ['#1f3a63', '#a81f30', '#1e7a3c', '#b45309', '#5b6470']

const MAX_RECENT_COLOURS = 3

/** Merges per property; the cell wins whenever its own property is defined. */
export function effectiveStyle(column?: CellStyle, cell?: CellStyle): CellStyle {
  return {
    bold: cell?.bold ?? column?.bold,
    italic: cell?.italic ?? column?.italic,
    colour: cell?.colour ?? column?.colour,
  }
}

/**
 * Flips `key`, keeping other properties untouched. `inherited` says whether a
 * governing value sits underneath this one (a column preset, for a cell). If
 * the flip lands back on exactly what that layer already shows on its own
 * (nothing underneath, or the same as `inherited`), the key is dropped rather
 * than stored explicitly: a cell overriding a bold column still needs its own
 * `false` to win, but a column preset with nothing underneath does not.
 */
export function toggleProperty(
  style: CellStyle | undefined,
  key: 'bold' | 'italic',
  inherited: boolean,
): CellStyle {
  const shown = style?.[key] ?? inherited
  const next = !shown
  if (next === inherited) {
    const rest = { ...style }
    delete rest[key]
    return rest
  }
  return { ...style, [key]: next }
}

export function withColour(style: CellStyle | undefined, colour: string | undefined): CellStyle {
  return { ...style, colour }
}

export function isEmptyStyle(style?: CellStyle): boolean {
  if (!style) return true
  return style.bold === undefined && style.italic === undefined && style.colour === undefined
}

/** New array: skip a palette colour, move an existing one to the front, cap at 3. */
export function rememberColour(recent: string[], colour: string): string[] {
  if (PALETTE.includes(colour)) return recent
  const rest = recent.filter((entry) => entry !== colour)
  return [colour, ...rest].slice(0, MAX_RECENT_COLOURS)
}

/** Inline `style` attribute value. Bold and italic go through classes instead. */
export function styleVars(style: CellStyle): string | undefined {
  return style.colour === undefined ? undefined : `--cell-colour: ${style.colour}`
}
