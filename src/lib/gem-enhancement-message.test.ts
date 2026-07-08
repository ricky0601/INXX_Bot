import { describe, expect, it } from 'vitest'
import type { GemEnhancementActionResponse, GemEnhancementView } from './gem-enhancement-api.js'
import {
  GEM_ENHANCE_BUTTON_ID,
  GEM_GAHO_DRAW_BUTTON_ID,
  GEM_GAHO_SKIP_BUTTON_ID,
  buildGemEnhancementMessage,
  premiumGahoEffects,
  formatPremiumGahoEffect,
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
      levelIconUrl: 'https://example.com/gem-7.png',
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
      enhancedMode: false,
      duelRemaining: 0,
      luckyRemaining: 0,
      guardRemaining: 0,
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
  it('renders a status embed, a ranking embed and three action buttons', () => {
    const message = buildGemEnhancementMessage(createView())

    expect(message.embeds).toHaveLength(2)

    const statusEmbed = message.embeds[0].toJSON()
    expect(statusEmbed.title).toBe('7강 · 장기백 35%')
    expect(statusEmbed.thumbnail?.url).toBe('https://example.com/gem-7.png')
    expect(statusEmbed.fields?.some((field) => field.name === '📜 선조의 가호')).toBe(true)
    expect(statusEmbed.fields?.some((field) => field.name === '쿨타임')).toBe(true)

    const rankingEmbed = message.embeds[1].toJSON()
    expect(rankingEmbed.title).toBe('🏆 강화 랭킹 — 현재 최고 레벨')
    expect(rankingEmbed.description).toContain('🥇 랭커 — 10강 · 장기백 12%')

    const row = message.components[0].toJSON()
    expect(JSON.stringify(row)).toContain(GEM_ENHANCE_BUTTON_ID)
    expect(JSON.stringify(row)).toContain(GEM_GAHO_DRAW_BUTTON_ID)
    expect(JSON.stringify(row)).toContain(GEM_GAHO_SKIP_BUTTON_ID)
  })

  it('renders an attempt result headline and transition copy', () => {
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

    expect(embed.description).toBe('💎 강화 성공')
    expect(embed.fields?.find((field) => field.name === '이번 시도')?.value).toContain('7강 → 8강')
    expect(embed.fields?.some((field) => field.name === '🔮 이번 시도 확률')).toBe(true)
  })

  it('renders the failure probability sentence for a failed attempt', () => {
    const view = createView()
    const state = requireState(view)
    const action: GemEnhancementActionResponse = {
      view,
      result: {
        state,
        result: 'failure',
        levelBefore: 7,
        levelAfter: 7,
        rates: { ...state.currentRates, failureProbability: 0.933 },
        pityBefore: 35,
        pityAfter: 42,
        cooldownSeconds: 60,
        destroyPrevented: false,
        downPrevented: false,
        gaho: state.gaho,
      },
    }

    const embed = buildGemEnhancementMessage(action.view, action).embeds[0].toJSON()

    expect(embed.description).toBe('🛡️ 강화 실패')
    expect(embed.fields?.find((field) => field.name === '이번 시도')?.value).toBe('93.3% 확률로 강화에 실패했어요.')
  })

  it('renders the footer as main character name and bot name', () => {
    const message = buildGemEnhancementMessage(createView(), null, { footerName: '귀엽냐구', botName: 'INXX_Bot' })
    const statusEmbed = message.embeds[0].toJSON()

    expect(statusEmbed.footer?.text).toBe('귀엽냐구 • INXX_Bot')
  })

  it('omits action buttons but keeps both embeds when withButtons is false (public prefix reply)', () => {
    const message = buildGemEnhancementMessage(createView(), null, { withButtons: false })

    expect(message.embeds).toHaveLength(2)
    expect(message.components).toHaveLength(0)
  })

  it('enables gaho buttons and blocks enhance while gaho is ready', () => {
    const message = buildGemEnhancementMessage(createView({ gaho: { ready: true, count: 0, shield: 0, downShield: 0 } }))
    const row = message.components[0].toJSON()

    expect(row.components[0].disabled).toBe(true)
    expect(row.components[1].disabled).toBe(false)
    expect(row.components[2].disabled).toBe(false)
  })

  it('renders enhanced mode badge in gaho field and title', () => {
    const view = createView({ enhancedMode: true })
    const message = buildGemEnhancementMessage(view)
    const statusEmbed = message.embeds[0].toJSON()

    expect(statusEmbed.title).toContain('🟣 강화된 선조의 가호')
    expect(statusEmbed.title).toContain('강화 모드 활성화')
    const gahoField = statusEmbed.fields?.find((f) => f.name === '📜 선조의 가호')
    expect(gahoField?.value).toContain('🟣 강화 모드')
  })

  it('renders duel remaining and enables enhance button even on cooldown', () => {
    const view = createView({ duelRemaining: 3 })
    const message = buildGemEnhancementMessage(view)
    const statusEmbed = message.embeds[0].toJSON()
    const row = message.components[0].toJSON()

    const gahoField = statusEmbed.fields?.find((f) => f.name === '📜 선조의 가호')
    expect(gahoField?.value).toContain('⚔️ 일기토 3회 남음')
    expect((row.components[0] as { label?: string }).label).toBe('강화 (일기토)')
    expect(row.components[0].disabled).toBe(false)
  })

  it('enables enhance button with duel remaining even when cooldown is active', () => {
    const view = createView({ duelRemaining: 1 })
    view.cooldownRemainingSeconds = 120
    const message = buildGemEnhancementMessage(view)
    const row = message.components[0].toJSON()

    expect(row.components[0].disabled).toBe(false)
  })

  it('renders lucky remaining counter', () => {
    const view = createView({ luckyRemaining: 5 })
    const message = buildGemEnhancementMessage(view)
    const statusEmbed = message.embeds[0].toJSON()

    const gahoField = statusEmbed.fields?.find((f) => f.name === '📜 선조의 가호')
    expect(gahoField?.value).toContain('🍀 행운의 가호 5회')
  })

  it('renders guard remaining counter', () => {
    const view = createView({ guardRemaining: 2 })
    const message = buildGemEnhancementMessage(view)
    const statusEmbed = message.embeds[0].toJSON()

    const gahoField = statusEmbed.fields?.find((f) => f.name === '📜 선조의 가호')
    expect(gahoField?.value).toContain('✨ 불굴의 가호 2회')
  })

  it('renders all buff counters together', () => {
    const view = createView({
      enhancedMode: true,
      duelRemaining: 2,
      luckyRemaining: 3,
      guardRemaining: 1,
    })
    const message = buildGemEnhancementMessage(view)
    const statusEmbed = message.embeds[0].toJSON()
    const gahoField = statusEmbed.fields?.find((f) => f.name === '📜 선조의 가호')

    expect(gahoField?.value).toContain('🟣 강화 모드')
    expect(gahoField?.value).toContain('⚔️ 일기토 2회 남음')
    expect(gahoField?.value).toContain('🍀 행운의 가호 3회')
    expect(gahoField?.value).toContain('✨ 불굴의 가호 1회')
  })

  it('maps premium gaho effect keys to Korean headlines and descriptions', () => {
    const duel = formatPremiumGahoEffect({ key: 'duel', description: '' })
    expect(duel.headline).toBe('⚔️ 일기토')
    expect(duel.description).toContain('쿨타임')

    const guaranteed = formatPremiumGahoEffect({ key: 'guaranteed_success', description: '' })
    expect(guaranteed.headline).toBe('💎 확정 대성공')

    const lucky = formatPremiumGahoEffect({ key: 'lucky', description: '' })
    expect(lucky.headline).toBe('🍀 행운의 가호')

    const guard = formatPremiumGahoEffect({ key: 'guard', description: '' })
    expect(guard.headline).toBe('✨ 불굴의 가호')

    const cooldown = formatPremiumGahoEffect({ key: 'cooldown_plus_5m', description: '' })
    expect(cooldown.headline).toBe('⏳ 쿨타임 연장')
    expect(cooldown.description).toContain('5분')
  })

  it('falls back to generic headline for unknown premium gaho keys', () => {
    const result = formatPremiumGahoEffect({ key: 'unknown_effect', description: 'custom desc' })
    expect(result.headline).toBe('🎲 선조의 가호')
    expect(result.description).toBe('custom desc')
  })

  it('renders premium gaho effect in status embed description', () => {
    const view = createView()
    const state = view.currentUserState!
    const action: GemEnhancementActionResponse = {
      view,
      result: {
        state,
        effect: { key: 'duel', description: '일기토 효과' },
      },
    }

    const embed = buildGemEnhancementMessage(action.view, action).embeds[0].toJSON()
    expect(embed.description).toBe('⚔️ 일기토')
    const attemptField = embed.fields?.find((f) => f.name === '이번 시도')
    expect(attemptField?.value).toContain('쿨타임')
  })
})
