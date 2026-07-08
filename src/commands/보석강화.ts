import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { getInxxUserByDiscordId } from '../lib/inxx-api.js'
import { notLinkedMessage } from '../lib/login-hint.js'
import { runGemEnhancementAction } from '../lib/gem-enhancement-api.js'
import { buildGemEnhancementMessage } from '../lib/gem-enhancement-message.js'

export const data = new SlashCommandBuilder()
  .setName('보석강화')
  .setDescription('INXX 보석 강화를 1회 시도합니다.')

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const user = await getInxxUserByDiscordId(interaction.user.id)
  if (!user) {
    await interaction.reply({ content: notLinkedMessage(), flags: MessageFlags.Ephemeral })
    return
  }

  await interaction.deferReply()

  try {
    const result = await runGemEnhancementAction(user.id, 'attempt')
    await interaction.editReply(
      buildGemEnhancementMessage(result.view, result, {
        footerName: user.mainCharacterName ?? user.displayName,
        botName: interaction.client.user.username,
      }),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : '보석 강화에 실패했습니다.'
    await interaction.editReply(message)
  }
}
