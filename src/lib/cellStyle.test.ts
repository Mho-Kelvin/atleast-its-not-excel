import { describe, expect, it } from 'vitest'
import {
  PALETTE,
  effectiveStyle,
  isEmptyStyle,
  rememberColour,
  styleVars,
  toggleProperty,
  withColour,
} from './cellStyle'

describe('effectiveStyle', () => {
  it('falls back to the column preset when the cell has no opinion', () => {
    expect(effectiveStyle({ bold: true }, undefined)).toMatchObject({ bold: true })
  })

  it('lets the cell win when both set the same property', () => {
    expect(effectiveStyle({ bold: true }, { bold: false })).toMatchObject({ bold: false })
  })

  it('lets an explicit false beat a column preset of true', () => {
    expect(effectiveStyle({ italic: true }, { italic: false }).italic).toBe(false)
  })
})

describe('toggleProperty', () => {
  it('flips relative to what is currently shown, not the stored value', () => {
    const result = toggleProperty(undefined, 'bold', true)
    expect(result.bold).toBe(false)
  })

  it('can produce an explicit false so a cell can opt out of an inherited true', () => {
    const result = toggleProperty({}, 'bold', true)
    expect(result).toEqual({ bold: false })
  })

  it('keeps the other properties untouched', () => {
    const result = toggleProperty({ italic: true }, 'bold', false)
    expect(result).toEqual({ italic: true, bold: true })
  })

  it('drops the key when a column preset with nothing underneath is toggled off', () => {
    const result = toggleProperty({ bold: true }, 'bold', false)
    expect(result).toEqual({})
  })

  it('keeps an explicit false when a cell overrides a bold column', () => {
    const result = toggleProperty(undefined, 'bold', true)
    expect(result).toEqual({ bold: false })
  })
})

describe('withColour', () => {
  it('sets the colour', () => {
    expect(withColour(undefined, '#123456').colour).toBe('#123456')
  })

  it('removes the colour', () => {
    expect(withColour({ colour: '#123456' }, undefined).colour).toBeUndefined()
  })
})

describe('isEmptyStyle', () => {
  it('is true for undefined', () => {
    expect(isEmptyStyle(undefined)).toBe(true)
  })

  it('is true for an object with no property set', () => {
    expect(isEmptyStyle({})).toBe(true)
  })

  it('is false once any property is set, even to false', () => {
    expect(isEmptyStyle({ bold: false })).toBe(false)
  })
})

describe('rememberColour', () => {
  it('skips a colour already in the palette', () => {
    expect(rememberColour([], PALETTE[0])).toEqual([])
  })

  it('adds a custom colour to the front', () => {
    expect(rememberColour([], '#abcdef')).toEqual(['#abcdef'])
  })

  it('moves an existing entry to the front instead of duplicating it', () => {
    const recent = ['#111111', '#222222']
    expect(rememberColour(recent, '#222222')).toEqual(['#222222', '#111111'])
  })

  it('caps the list at three', () => {
    const recent = ['#111111', '#222222', '#333333']
    expect(rememberColour(recent, '#444444')).toEqual(['#444444', '#111111', '#222222'])
  })
})

describe('styleVars', () => {
  it('builds the custom property when a colour is set', () => {
    expect(styleVars({ colour: '#a81f30' })).toBe('--cell-colour: #a81f30')
  })

  it('is undefined without a colour', () => {
    expect(styleVars({ bold: true })).toBeUndefined()
  })
})
