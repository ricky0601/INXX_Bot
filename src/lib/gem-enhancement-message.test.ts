import { describe, expect, it } from 'vitest'
import type { GemEnhancementActionResponse, GemEnhancementView } from './gem-enhancement-api.js'
import {
  GEM_ENHANCE_BUTTON_ID,
  GEM_GAHO_DRAW_BUTTON_ID,
  GEM_GAHO_SKIP_BUTTON_ID,
  buildGemEnhancementMessage,
} from './gem-enhancement-message.js'

function createView(overrides: Partial<NonNullable<GemEnhancementView['currentUserState']>> = {}): GemEnhancementView {
  return {
    leaderboard: [
      {
        rank: 1,
        userId: 'u2',
        displayName: '랭커',
        level: 10,
        levelLabel: '10강',
        bestLevel: 10,
        bestLevelLabel: '10강',
        bestLevelReachedAt: null,
        pity: 12,
        currentRates: {
          successProbability: 0.1,
          failureProbability: 0.85,
          downProbability: 0.04,
          destructionProbability: 0.01,
          pityGain: 5,
        },
      },
    ],
    currentUserState: {
      userId: 'u1',
      level: 7,
      levelLabel: '7강',
      pity: 35,
      attempts: 10,
      successes: 3,
      failures: 7,
      lastAttemptAt: null,
      cooldownPenaltyUntil: null,
      bestLevel: 8,
      bestLevelLabel: '8강',
      bestLevelReachedAt: null,
      lastResult: 'failure',
      currentRates: {
        successProbability: 0.2,
        failureProbability: 0.78,
        downProbability: 0.02,
        destructionProbability: 0,
        pityGain: 7,
      },
      gaho: { ready: false, count: 2, shield: 1, downShield: 0 },
      gahoExtraTry: 0,
      createdAt: '2026-07-08T00:00:00.000Z',
      updatedAt: '2026-07-08T00:00:00.000Z',
      ...overrides,
    },
    cooldownRemainingSeconds: 0,
  }
}

function requireState(view: GemEnhancementView) {
  if (!view.currentUserState) {
    throw new Error('test fixture must include current user state')
  }

  return view.currentUserState
}

describe('buildGemEnhancementMessage', () => {
  it('renders Korean gem status and three action buttons', () => {
    const message = buildGemEnhancementMessage(createView())
    const embed = message.embeds[0].toJSON()
    const row = message.components[0].toJSON()

    expect(embed.title).toBe('💎 보석 강화')
    expect(embed.description).toContain('현재 **7강**')
    expect(embed.fields?.some((field) => field.name === '선조의 가호')).toBe(true)
    expect(JSON.stringify(row)).toContain(GEM_ENHANCE_BUTTON_ID)
    expect(JSON.stringify(row)).toContain(GEM_GAHO_DRAW_BUTTON_ID)
    expect(JSON.stringify(row)).toContain(GEM_GAHO_SKIP_BUTTON_ID)
  })

  it('renders an attempt result in Korean copy', () => {
    const view = createView()
    const state = requireState(view)
    const action: GemEnhancementActionResponse = {
      view,
      result: {
        state,
        result: 'success',
        levelBefore: 7,
        levelAfter: 8,
        rates: state.currentRates,
        pityBefore: 35,
        pityAfter: 0,
        cooldownSeconds: 60,
        destroyPrevented: false,
        downPrevented: false,
        gaho: state.gaho,
      },
    }

    const embed = buildGemEnhancementMessage(action.view, action).embeds[0].toJSON()

    expect(embed.description).toContain('강화 성공')
    expect(embed.description).toContain('7강 → 8강')
  })

  it('omits action buttons when withButtons is false (public prefix reply)', () => {
    const message = buildGemEnhancementMessage(createView(), null, { withButtons: false })

    expect(message.embeds).toHaveLength(1)
    expect(message.components).toHaveLength(0)
  })

  it('enables gaho buttons and blocks enhance while gaho is ready', () => {
    const message = buildGemEnhancementMessage(createView({ gaho: { ready: true, count: 0, shield: 0, downShield: 0 } }))
    const row = message.components[0].toJSON()

    expect(row.components[0].disabled).toBe(true)
    expect(row.components[1].disabled).toBe(false)
    expect(row.components[2].disabled).toBe(false)
  })
})
