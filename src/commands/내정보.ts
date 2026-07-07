import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'

export const data = new SlashCommandBuilder()
  .setName('내정보')
  .setDescription('내 Discord 계정과 연동된 INXX 계정 정보를 확인합니다.')

const roleLabels: Record<string, string> = {
  guest: '게스트',
  member: '사원',
  officer: '임원',
  vice_master: '부마스터',
  guild_master: '길드마스터',
  developer: '개발자',
}

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ ephemeral: true })

  const user = await requireInxxUser(interaction)
  if (!user) return

  const displayName = user.displayName ?? user.discordUsername ?? '(알 수 없음)'

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(displayName)
    .setDescription('INXX 계정과 연동되어 있습니다.')
    .addFields(
      { name: '역할', value: roleLabels[user.role] ?? user.role, inline: true },
      { name: '대표 캐릭터', value: user.mainCharacterName ?? '등록된 캐릭터 없음', inline: true },
    )

  if (user.avatarUrl) {
    embed.setThumbnail(user.avatarUrl)
  }

  await interaction.editReply({ embeds: [embed] })
}
