import { afterAll, beforeEach, describe, it, expect } from 'vitest'
import { buildRaidEmbed, formatKst, formatNumber, formatParticipantList } from './raid-embed.js'
import type { RaidScheduleDetail, RaidParticipant } from './inxx-api.js'

const originalBaseUrl = process.env.INXX_WEB_BASE_URL

beforeEach(() => {
  delete process.env.INXX_WEB_BASE_URL
})

afterAll(() => {
  if (originalBaseUrl === undefined) {
    delete process.env.INXX_WEB_BASE_URL
  } else {
    process.env.INXX_WEB_BASE_URL = originalBaseUrl
  }
})

function createParticipant(overrides: Partial<RaidParticipant> = {}): RaidParticipant {
  return {
    id: 'participant-id',
    userId: 'user-id',
    userDisplayName: '닉네임',
    userDiscordUsername: 'discord#1234',
    characterId: 'character-id',
    characterName: '캐릭터',
    characterClass: '버서커',
    itemLevel: 1700,
    combatPower: 1_000_000,
    combatRole: 'dealer',
    status: 'joined',
    joinedAt: '2026-07-08T10:00:00Z',
    ...overrides,
  }
}

function createDetail(overrides: Partial<RaidScheduleDetail> = {}): RaidScheduleDetail {
  return {
    schedule: {
      id: 'schedule-id',
      title: '[하드] 4막: 아륪체',
      raidName: '아륪체 (4막)',
      difficulty: '하드',
      scheduledAt: '2026-07-08T11:30:00Z',
      maxParticipants: 8,
      memo: '메모',
      createdBy: 'user-id',
    },
    participants: [],
    catalog: {
      imageUrl: 'https://example.com/raid.webp',
      requiredLevel: 1680,
    },
    ...overrides,
  }
}

describe('formatKst', () => {
  it('formats ISO date in Korean timezone', () => {
    const result = formatKst('2026-07-08T11:30:00Z')
    expect(result).toContain('2026')
    expect(result).toContain('07')
    expect(result).toContain('08')
    expect(result).toContain('20:30')
  })
})

describe('formatNumber', () => {
  it('formats numbers with Korean locale', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('returns dash for null or undefined', () => {
    expect(formatNumber(null)).toBe('—')
    expect(formatNumber(undefined)).toBe('—')
  })
})

describe('formatParticipantList', () => {
  it('returns empty message when no participants match role', () => {
    const result = formatParticipantList([], 'dealer')
    expect(result).toBe('아직 없습니다')
  })

  it('formats dealer list', () => {
    const participants = [createParticipant({ combatRole: 'dealer' })]
    const result = formatParticipantList(participants, 'dealer')
    expect(result).toContain('**닉네임**')
    expect(result).toContain('캐릭터')
    expect(result).toContain('버서커')
    expect(result).toContain('Lv.1700.00')
    expect(result).toContain('CP 1,000,000')
  })

  it('omits combat power when null', () => {
    const participants = [createParticipant({ combatPower: null })]
    const result = formatParticipantList(participants, 'dealer')
    expect(result).toContain('—')
  })

  it('truncates long lists within Discord field limit', () => {
    const participants = Array.from({ length: 30 }, (_, index) =>
      createParticipant({
        id: `p-${index}`,
        userDisplayName: `유저${index}`,
        characterName: `캐릭터${index}`,
        combatRole: 'dealer',
      }),
    )
    const result = formatParticipantList(participants, 'dealer')
    expect(result.length).toBeLessThanOrEqual(1024)
    expect(result).toContain('…외')
  })
})

describe('buildRaidEmbed', () => {
  it('builds embed with empty participants', () => {
    const embed = buildRaidEmbed(createDetail())
    const data = embed.toJSON()

    expect(data.title).toBe('[하드] 4막: 아륪체')
    expect(data.description).toContain('**일시**')
    expect(data.description).toContain('**모집 현황**')
    expect(data.description).toContain('0/8')
    expect(data.description).toContain('**입장 레벨**')
    expect(data.description).toContain('Lv.1680')
    expect(data.description).toContain('**공격대 평균**')
    expect(data.image?.url).toBe('https://example.com/raid.webp')
    expect(data.footer?.text).toBe('INXX 레이드')
    expect(data.fields?.some((field) => field.name === '딜러 (0)')).toBe(true)
    expect(data.fields?.some((field) => field.name === '서포터 (0)')).toBe(true)
  })

  it('prepends INXX_WEB_BASE_URL to relative image paths', () => {
    process.env.INXX_WEB_BASE_URL = 'https://inxx.example.com'
    const embed = buildRaidEmbed(
      createDetail({
        catalog: {
          imageUrl: '/images/raids/horizon-cathedral.webp',
          requiredLevel: 1680,
        },
      }),
    )
    expect(embed.toJSON().image?.url).toBe(
      'https://inxx.example.com/images/raids/horizon-cathedral.webp',
    )
  })

  it('calculates average item level and combat power', () => {
    const detail = createDetail({
      participants: [
        createParticipant({ itemLevel: 1700, combatPower: 1_000_000 }),
        createParticipant({ itemLevel: 1800, combatPower: 2_000_000 }),
      ],
    })
    const embed = buildRaidEmbed(detail)
    const description = embed.toJSON().description ?? ''

    expect(description).toContain('레벨 Lv.1750.00 · 전투력 1,500,000')
  })

  it('separates dealers and supports', () => {
    const detail = createDetail({
      participants: [
        createParticipant({ combatRole: 'dealer', userDisplayName: '딜러유저' }),
        createParticipant({ combatRole: 'support', userDisplayName: '서폿유저' }),
      ],
    })
    const embed = buildRaidEmbed(detail)
    const fields = embed.toJSON().fields ?? []

    const dealerField = fields.find((field) => field.name === '딜러 (1)')
    const supportField = fields.find((field) => field.name === '서포터 (1)')

    expect(dealerField?.value).toContain('딜러유저')
    expect(supportField?.value).toContain('서폿유저')
  })
})
