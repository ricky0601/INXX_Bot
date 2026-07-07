import type { ButtonInteraction } from 'discord.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'
import { deleteRaidSchedule } from '../lib/inxx-api.js'

export async function handleRaidDeleteButton(interaction: ButtonInteraction) {
  const [, raidScheduleId] = interaction.customId.split(':')
  if (!raidScheduleId) {
    await interaction.reply({ content: '삭제 버튼 정보가 올바르지 않습니다.', ephemeral: true })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const user = await requireInxxUser(interaction)
  if (!user) return

  try {
    await deleteRaidSchedule(raidScheduleId, user.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : '레이드 일정 삭제에 실패했습니다.'
    await interaction.editReply(message)
    return
  }

  await interaction.editReply('레이드 일정을 삭제했습니다.')

  const channel = interaction.channel
  if (channel?.isThread()) {
    try {
      await channel.delete()
    } catch (error) {
      console.warn('Failed to delete raid forum thread after deletion:', error)
    }
  }
}
