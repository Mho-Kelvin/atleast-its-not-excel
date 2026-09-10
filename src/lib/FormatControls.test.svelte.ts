import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import FormatControls from './FormatControls.svelte'
import { PALETTE } from './cellStyle'
import { strings } from './strings'
import type { CellStyle } from './types'

function renderControls(
  options: {
    style?: CellStyle
    inherited?: CellStyle
    recentColours?: string[]
    disabled?: boolean
    onreset?: () => void
  } = {},
) {
  let style = $state<CellStyle | undefined>(options.style)
  let recentColours = $state<string[]>(options.recentColours ?? [])
  let disabled = $state(options.disabled ?? false)

  render(FormatControls, {
    props: {
      get style() {
        return style
      },
      set style(value: CellStyle | undefined) {
        style = value
      },
      inherited: options.inherited,
      get recentColours() {
        return recentColours
      },
      set recentColours(value: string[]) {
        recentColours = value
      },
      get disabled() {
        return disabled
      },
      onreset: options.onreset,
    },
  })

  return {
    getStyle: () => style,
    getRecentColours: () => recentColours,
    setDisabled: (value: boolean) => {
      disabled = value
    },
  }
}

function button(name: string): HTMLButtonElement {
  return screen.getByRole('button', { name }) as HTMLButtonElement
}

describe('bold', () => {
  it('flips on click and aria-pressed follows', async () => {
    const { getStyle } = renderControls()
    const boldButton = button('Fett')
    expect(boldButton.getAttribute('aria-pressed')).toBe('false')

    await fireEvent.click(boldButton)
    expect(getStyle()).toMatchObject({ bold: true })
    expect(boldButton.getAttribute('aria-pressed')).toBe('true')
  })

  it('reads pressed from an inherited column preset and a click stores an explicit false', async () => {
    const { getStyle } = renderControls({ inherited: { bold: true } })
    const boldButton = button('Fett')
    expect(boldButton.getAttribute('aria-pressed')).toBe('true')

    await fireEvent.click(boldButton)
    expect(getStyle()).toMatchObject({ bold: false })
  })
})

describe('colour', () => {
  it('sets the colour from a palette swatch and never enters recents', async () => {
    const { getStyle, getRecentColours } = renderControls()

    await fireEvent.click(button('Textfarbe'))
    await fireEvent.click(button(strings.paletteColours[PALETTE[0]]))

    expect(getStyle()).toMatchObject({ colour: PALETTE[0] })
    expect(getRecentColours()).toEqual([])
  })

  it('puts an off-palette colour from the colour input first in recents, on blur', async () => {
    const { getStyle, getRecentColours } = renderControls()

    await fireEvent.click(button('Textfarbe'))
    const input = screen.getByLabelText('Weitere Farbe …')
    await fireEvent.change(input, { target: { value: '#123456' } })
    expect(getStyle()).toBeUndefined()

    await fireEvent.blur(input)

    expect(getStyle()).toMatchObject({ colour: '#123456' })
    expect(getRecentColours()).toEqual(['#123456'])
  })

  it('commits once on blur no matter how many input/change events the drag fires', async () => {
    const { getStyle, getRecentColours } = renderControls()

    await fireEvent.click(button('Textfarbe'))
    const input = screen.getByLabelText('Weitere Farbe …')
    await fireEvent.input(input, { target: { value: '#111111' } })
    await fireEvent.input(input, { target: { value: '#222222' } })
    await fireEvent.change(input, { target: { value: '#333333' } })
    expect(getStyle()).toBeUndefined()

    await fireEvent.blur(input)

    expect(getStyle()).toMatchObject({ colour: '#333333' })
    expect(getRecentColours()).toEqual(['#333333'])
  })
})

describe('reset', () => {
  it('is hidden when the style is empty', () => {
    renderControls({ onreset: vi.fn() })
    expect(screen.queryByRole('button', { name: 'Formatierung zurücksetzen' })).toBeNull()
  })

  it('is shown and calls onreset when the style is not empty', async () => {
    const onreset = vi.fn()
    renderControls({ style: { bold: true }, onreset })

    await fireEvent.click(button('Formatierung zurücksetzen'))
    expect(onreset).toHaveBeenCalledOnce()
  })
})

describe('disabled', () => {
  it('disables every button, including the swatches in an already open popover', async () => {
    const { setDisabled } = renderControls()

    await fireEvent.click(button('Textfarbe'))
    setDisabled(true)
    await Promise.resolve()

    for (const entry of screen.getAllByRole('button')) {
      expect((entry as HTMLButtonElement).disabled).toBe(true)
    }
  })
})
