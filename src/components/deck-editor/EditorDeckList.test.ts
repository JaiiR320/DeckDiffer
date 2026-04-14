import { describe, expect, it } from 'vitest'
import { isDiffToggleDisabled } from './EditorDeckList'

describe('isDiffToggleDisabled', () => {
  it('keeps the toggle enabled while diff-only mode is active', () => {
    expect(isDiffToggleDisabled(false, true)).toBe(false)
  })

  it('disables the toggle when there are no differences and all cards are already visible', () => {
    expect(isDiffToggleDisabled(false, false)).toBe(true)
  })

  it('keeps the toggle enabled when differences exist', () => {
    expect(isDiffToggleDisabled(true, false)).toBe(false)
  })
})
