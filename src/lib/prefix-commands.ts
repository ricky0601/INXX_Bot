import type { Message } from 'discord.js'
import { getGemEnhancementView, runGemEnhancementAction } from './gem-enhancement-api.js'
import { buildGemEnhancementMessage } from './gem-enhancement-message.js'
import { getInxxUserByDiscordId } from './inxx-api.js'
import { notLinkedMessage } from './login-hint.js'

export type GemPrefixCommand = 'view' | 'attempt'

export function isPrefixCommandsEnabled(value: string | undefined): boolean {
  return value === 'true'
}

export function parseGemPrefixCommand(content: string): GemPrefixCommand | null {
  const normalized = content.trim()

  if (normalized === './보석') {
    return 'view'
  }

  if (normalized === './보석강화') {
    return 'attempt'
  }

  return null
}

export async function handleGemPrefixCommand(message: Message, command: GemPrefixCommand): Promise<void> {
  const user = await getInxxUserByDiscordId(message.author.id)
  if (!user) {
    await message.reply(notLinkedMessage())
    return
  }

  try {
    if (command === 'view') {
      const view = await getGemEnhancementView(user.id)
      await message.reply(buildGemEnhancementMessage(view, null, { withButtons: false }))
      return
    }

    const result = await runGemEnhancementAction(user.id, 'attempt')
    await message.reply(buildGemEnhancementMessage(result.view, result, { withButtons: false }))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '보석 강화에 실패했습니다.'
    await message.reply(errorMessage)
  }
}
