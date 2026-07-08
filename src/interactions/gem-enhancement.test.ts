import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MessageFlags } from 'discord.js'
import { handleGemEnhancementButton } from './gem-enhancement.js'
import { getInxxUserByDiscordId } from '../lib/inxx-api.js'
import { runGemEnhancementAction } from '../lib/gem-enhancement-api.js'
import { GEM_ENHANCE_BUTTON_ID, buildGemEnhancementMessage } from '../lib/gem-enhancement-message.js'

vi.mock('../lib/inxx-api.js', () => ({
  getInxxUserByDiscordId: vi.fn(),
}))

vi.mock('../lib/gem-enhancement-api.js', () => ({
  runGemEnhancementAction: vi.fn(),
}))

vi.mock('../lib/gem-enhancement-message.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/gem-enhancement-message.js')>()
  return {
    ...actual,
    buildGemEnhancementMessage: vi.fn().mockReturnValue({ embeds: [], components: [] }),
  }
})

const POSTER_ID = 'poster-discord-id'
const OTHER_USER_ID = 'other-discord-id'

type TestButtonInteraction = {
  customId: string
  user: { id: string }
  client: { user: { username: string } }
  reply: ReturnType<typeof vi.fn>
  deferUpdate: ReturnType<typeof vi.fn>
  editReply: ReturnType<typeof vi.fn>
  followUp: ReturnType<typeof vi.fn>
}

function createInteraction(customId: string, userId: string): TestButtonInteraction {
  return {
    customId,
    user: { id: userId },
    client: { user: { username: '로끼봇' } },
    reply: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
  }
}

describe('handleGemEnhancementButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a button click from someone other than the original poster', async () => {
    const interaction = createInteraction(`${GEM_ENHANCE_BUTTON_ID}:${POSTER_ID}`, OTHER_USER_ID)

    await handleGemEnhancementButton(interaction as never)

    expect(interaction.reply).toHaveBeenCalledWith({
      content: '본인의 보석 강화 결과에서만 사용할 수 있는 버튼입니다.',
      flags: MessageFlags.Ephemeral,
    })
    expect(interaction.deferUpdate).not.toHaveBeenCalled()
    expect(runGemEnhancementAction).not.toHaveBeenCalled()
    expect(interaction.editReply).not.toHaveBeenCalled()
  })

  it('rejects a malformed customId without touching the interaction state', async () => {
    const interaction = createInteraction('gem_enhancement:unknown-action:poster', POSTER_ID)

    await handleGemEnhancementButton(interaction as never)

    expect(interaction.reply).toHaveBeenCalledWith({
      content: '보석 강화 버튼 정보가 올바르지 않습니다.',
      flags: MessageFlags.Ephemeral,
    })
    expect(interaction.deferUpdate).not.toHaveBeenCalled()
    expect(runGemEnhancementAction).not.toHaveBeenCalled()
  })

  it('runs the enhancement action for the poster and re-renders with usable buttons only', async () => {
    const interaction = createInteraction(`${GEM_ENHANCE_BUTTON_ID}:${POSTER_ID}`, POSTER_ID)

    vi.mocked(getInxxUserByDiscordId).mockResolvedValue({
      id: 'user-1',
      discordId: POSTER_ID,
      discordUsername: 'poster',
      displayName: '작성자',
      avatarUrl: null,
      role: 'member',
      mainCharacterName: '한건뜬',
    })

    const view = { leaderboard: [], currentUserState: null, cooldownRemainingSeconds: 0 }
    vi.mocked(runGemEnhancementAction).mockResolvedValue({
      view,
      skipped: true,
    } as never)

    await handleGemEnhancementButton(interaction as never)

    expect(interaction.deferUpdate).toHaveBeenCalledTimes(1)
    expect(runGemEnhancementAction).toHaveBeenCalledWith('user-1', 'attempt')
    expect(buildGemEnhancementMessage).toHaveBeenCalledWith(
      view,
      { view, skipped: true },
      POSTER_ID,
      expect.objectContaining({ hideDisabledButtons: true }),
    )
    expect(interaction.editReply).toHaveBeenCalledTimes(1)
  })

  it('tells an unlinked poster to link their account instead of running the action', async () => {
    const interaction = createInteraction(`${GEM_ENHANCE_BUTTON_ID}:${POSTER_ID}`, POSTER_ID)
    vi.mocked(getInxxUserByDiscordId).mockResolvedValue(null)

    await handleGemEnhancementButton(interaction as never)

    expect(interaction.deferUpdate).toHaveBeenCalledTimes(1)
    expect(runGemEnhancementAction).not.toHaveBeenCalled()
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({ flags: MessageFlags.Ephemeral }),
    )
  })
})
