import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { runGemEnhancementAction } from '../lib/gem-enhancement-api.js'
import { buildGemEnhancementMessage } from '../lib/gem-enhancement-message.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'

export const data = new SlashCommandBuilder()
  .setName('보석강화')
  .setDescription('INXX 보석 강화를 1회 시도합니다.')

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const user = await requireInxxUser(interaction)
  if (!user) return

  try {
    const result = await runGemEnhancementAction(user.id, 'attempt')
    const message = buildGemEnhancementMessage(result.view, result, interaction.user.id, {
      withButtons: true,
      hideDisabledButtons: true,
      footerName: user.mainCharacterName ?? user.displayName,
      botName: interaction.client.user.username,
    })

    const channel = interaction.channel
    if (channel && 'send' in channel) {
      await channel.send(message)
      await interaction.deleteReply()
      return
    }

    await interaction.editReply(message)
  } catch (error) {
    const message = error instanceof Error ? error.message : '보석 강화에 실패했습니다.'
    await interaction.editReply(message)
  }
}
