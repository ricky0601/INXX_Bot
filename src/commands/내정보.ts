import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'

export const data = new SlashCommandBuilder()
  .setName('내정보')
  .setDescription('내 Discord 계정과 연동된 INXX 계정 정보를 확인합니다.')

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true })

  const user = await requireInxxUser(interaction)
  if (!user) return

  const lines = [
    `표시 이름: ${user.displayName ?? user.discordUsername ?? '(알 수 없음)'}`,
    `역할: ${user.role}`,
  ]
  if (user.mainCharacterName) {
    lines.push(`대표 캐릭터: ${user.mainCharacterName}`)
  }

  await interaction.editReply(lines.join('\n'))
}
