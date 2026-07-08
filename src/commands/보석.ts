import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { getGemEnhancementView } from '../lib/gem-enhancement-api.js'
import { buildGemEnhancementMessage } from '../lib/gem-enhancement-message.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'

export const data = new SlashCommandBuilder()
  .setName('보석')
  .setDescription('INXX 보석 강화 상태를 확인합니다.')

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const user = await requireInxxUser(interaction)
  if (!user) return

  const view = await getGemEnhancementView(user.id)
  await interaction.editReply(
    buildGemEnhancementMessage(view, null, {
      footerName: user.mainCharacterName ?? user.displayName,
      botName: interaction.client.user.username,
    }),
  )
}
