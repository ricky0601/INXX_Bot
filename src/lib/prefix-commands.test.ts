import { describe, expect, it } from 'vitest'
import { isPrefixCommandsEnabled, parseGemPrefixCommand } from './prefix-commands.js'

describe('parseGemPrefixCommand', () => {
  it('matches only exact gem aliases', () => {
    expect(parseGemPrefixCommand('./보석')).toBe('view')
    expect(parseGemPrefixCommand('./보석강화')).toBe('attempt')
    expect(parseGemPrefixCommand(' ./보석 ')).toBe('view')
    expect(parseGemPrefixCommand('./보석 강화')).toBeNull()
    expect(parseGemPrefixCommand('/보석')).toBeNull()
  })
})

describe('isPrefixCommandsEnabled', () => {
  it('requires explicit true opt-in', () => {
    expect(isPrefixCommandsEnabled(undefined)).toBe(false)
    expect(isPrefixCommandsEnabled('false')).toBe(false)
    expect(isPrefixCommandsEnabled('TRUE')).toBe(false)
    expect(isPrefixCommandsEnabled('true ')).toBe(false)
    expect(isPrefixCommandsEnabled('true')).toBe(true)
  })
})
