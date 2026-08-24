import { describe, expect, it } from 'vitest'
import { clear, createHistory, record, redo, undo } from './history'

describe('history', () => {
  it('has nothing to undo when empty', () => {
    const history = createHistory()
    expect(undo(history, 'now')).toBeNull()
    expect(redo(history, 'now')).toBeNull()
  })

  it('walks back and forward through recorded states', () => {
    const history = createHistory()
    record(history, 'a')
    record(history, 'b')

    expect(undo(history, 'c')).toBe('b')
    expect(undo(history, 'b')).toBe('a')
    expect(undo(history, 'a')).toBeNull()

    expect(redo(history, 'a')).toBe('b')
    expect(redo(history, 'b')).toBe('c')
    expect(redo(history, 'c')).toBeNull()
  })

  it('drops the redo trail once a new edit is recorded', () => {
    const history = createHistory()
    record(history, 'a')
    undo(history, 'b')
    record(history, 'a')

    expect(redo(history, 'x')).toBeNull()
  })

  it('caps the stack at 50 and forgets the oldest state', () => {
    const history = createHistory()
    for (let step = 0; step < 60; step++) record(history, `state-${step}`)

    expect(history.past).toHaveLength(50)
    expect(history.past[0]).toBe('state-10')
  })

  it('clears both directions', () => {
    const history = createHistory()
    record(history, 'a')
    undo(history, 'b')
    clear(history)

    expect(history.past).toHaveLength(0)
    expect(history.future).toHaveLength(0)
  })
})
