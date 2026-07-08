import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageFlags } from 'discord.js'
import { execute } from './보석강화.js'
import { getInxxUserByDiscordId } from '../lib/inxx-api.js'
import { runGemEnhancementAction } from '../lib/gem-enhancement-api.js'
import { buildGemEnhancementMessage } from '../lib/gem-enhancement-message.js'

vi.mock('../lib/inxx-api.js', () => ({
  getInxxUserByDiscordId: vi.fn(),
}))

vi.mock('../lib/gem-enhancement-api.js', () => ({
  runGemEnhancementAction: vi.fn(),
}))

vi.mock('../lib/gem-enhancement-message.js', () => ({
  buildGemEnhancementMessage: vi.fn(),
}))

type TestInteraction = {
  user: { id: string }
  client: { user: { username: string } }
  channel: { send: ReturnType<typeof vi.fn> } | null
  reply: ReturnType<typeof vi.fn>
  deferReply: ReturnType<typeof vi.fn>
  editReply: ReturnType<typeof vi.fn>
  deleteReply: ReturnType<typeof vi.fn>
}

function createInteraction(): TestInteraction {
  return {
    user: { id: 'discord-user' },
    client: { user: { username: '로끼봇' } },
    channel: { send: vi.fn().mockResolvedValue(undefined) },
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
  }
}

describe('/보석강화 execute', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('sends the successful result to the channel and removes the private loading reply', async () => {
    const interaction = createInteraction()
    const publicMessage: ReturnType<typeof buildGemEnhancementMessage> = {
      embeds: [new EmbedBuilder().setTitle('result')],
      components: [] as ActionRowBuilder<ButtonBuilder>[],
    }

    vi.mocked(getInxxUserByDiscordId).mockResolvedValue({
      id: 'user-1',
      discordId: 'discord-user',
      discordUsername: 'tester',
      displayName: '테스터',
      avatarUrl: null,
      role: 'member',
      mainCharacterName: '한건뜬',
    })
    vi.mocked(runGemEnhancementAction).mockResolvedValue({
      view: {
        leaderboard: [],
        currentUserState: null,
        cooldownRemainingSeconds: 0,
      },
      result: {
        state: {
          userId: 'user-1',
          level: 19,
          levelLabel: '19강',
          levelIconUrl: 'https://example.com/gem.png',
          pity: 80,
          attempts: 1,
          successes: 0,
          failures: 1,
          lastAttemptAt: '2026-07-08T00:00:00.000Z',
          cooldownPenaltyUntil: '2026-07-08T00:01:00.000Z',
          bestLevel: 19,
          bestLevelLabel: '19강',
          bestLevelReachedAt: null,
          lastResult: 'failure',
          currentRates: {
            successProbability: 0.03,
            failureProbability: 0.928,
            downProbability: 0.037,
            destructionProbability: 0.005,
            pityGain: 1,
          },
          gaho: { ready: false, count: 1, shield: 1, downShield: 0 },
          gahoExtraTry: 0,
          enhancedMode: false,
          duelRemaining: 0,
          luckyRemaining: 0,
          guardRemaining: 0,
          createdAt: '2026-07-08T00:00:00.000Z',
          updatedAt: '2026-07-08T00:00:00.000Z',
        },
        result: 'failure',
        levelBefore: 19,
        levelAfter: 19,
        rates: {
          successProbability: 0.03,
          failureProbability: 0.928,
          downProbability: 0.037,
          destructionProbability: 0.005,
          pityGain: 1,
        },
        pityBefore: 80,
        pityAfter: 81,
        cooldownSeconds: 21,
        destroyPrevented: false,
        downPrevented: false,
        gaho: { ready: false, count: 1, shield: 1, downShield: 0 },
      },
    })
    vi.mocked(buildGemEnhancementMessage).mockReturnValue(publicMessage)

    await execute(interaction as never)

    expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral })
    expect(interaction.channel?.send).toHaveBeenCalledWith(publicMessage)
    expect(interaction.deleteReply).toHaveBeenCalledTimes(1)
    expect(interaction.editReply).not.toHaveBeenCalled()
  })

  it('keeps retry messages private when enhancement cannot run yet', async () => {
    const interaction = createInteraction()

    vi.mocked(getInxxUserByDiscordId).mockResolvedValue({
      id: 'user-1',
      discordId: 'discord-user',
      discordUsername: 'tester',
      displayName: '테스터',
      avatarUrl: null,
      role: 'member',
      mainCharacterName: '한건뜬',
    })
    vi.mocked(runGemEnhancementAction).mockRejectedValue(new Error('보석 강화는 21초 후 다시 시도할 수 있습니다.'))

    await execute(interaction as never)

    expect(interaction.editReply).toHaveBeenCalledWith('보석 강화는 21초 후 다시 시도할 수 있습니다.')
    expect(interaction.channel?.send).not.toHaveBeenCalled()
    expect(interaction.deleteReply).not.toHaveBeenCalled()
  })
})
