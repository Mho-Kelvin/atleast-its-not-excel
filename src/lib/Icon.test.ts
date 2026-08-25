import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Icon from './Icon.svelte'

describe('Icon', () => {
  it('draws the named path and stays out of the accessibility tree', () => {
    const { container } = render(Icon, { props: { name: 'print' } })

    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.querySelector('path')?.getAttribute('d')).toMatch(/^M6 9V3/)
  })

  it('sizes both axes from one prop', () => {
    const { container } = render(Icon, { props: { name: 'trash', size: 32 } })

    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('width')).toBe('32')
    expect(svg.getAttribute('height')).toBe('32')
  })
})
