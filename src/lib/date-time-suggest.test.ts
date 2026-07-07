import { describe, it, expect } from 'vitest'
import { suggestDates, suggestTimes } from './date-time-suggest.js'

describe('suggestDates', () => {
  it('returns 14 days starting from today in KST', () => {
    const reference = new Date('2026-07-07T12:00:00Z') // KST 2026-07-07 21:00
    const suggestions = suggestDates('', reference)

    expect(suggestions).toHaveLength(14)
    expect(suggestions[0]).toEqual({ name: '2026-07-07 (오늘)', value: '2026-07-07' })
    expect(suggestions[1]).toEqual({ name: '2026-07-08 (내일)', value: '2026-07-08' })
    expect(suggestions[2]?.value).toBe('2026-07-09')
    expect(suggestions[13]?.value).toBe('2026-07-20')
  })

  it('filters by query', () => {
    const reference = new Date('2026-07-07T12:00:00Z')
    const suggestions = suggestDates('07-09', reference)

    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.every(({ name, value }) => name.includes('07-09') || value.includes('07-09'))).toBe(true)
  })

  it('limits results to 25', () => {
    const reference = new Date('2026-07-07T12:00:00Z')
    const suggestions = suggestDates('', reference)

    expect(suggestions.length).toBeLessThanOrEqual(25)
  })
})

describe('suggestTimes', () => {
  it('returns 30-minute intervals by default', () => {
    const suggestions = suggestTimes('')

    expect(suggestions.length).toBe(25) // 48 entries capped at 25
    expect(suggestions[0]).toEqual({ name: '00:00', value: '00:00' })
    expect(suggestions[1]).toEqual({ name: '00:30', value: '00:30' })
  })

  it('filters by query', () => {
    const suggestions = suggestTimes('20')

    expect(suggestions).toEqual([
      { name: '20:00', value: '20:00' },
      { name: '20:30', value: '20:30' },
    ])
  })

  it('supports custom intervals', () => {
    const suggestions = suggestTimes('', 60)

    expect(suggestions.length).toBe(24)
    expect(suggestions[0]).toEqual({ name: '00:00', value: '00:00' })
    expect(suggestions[1]).toEqual({ name: '01:00', value: '01:00' })
  })
})
