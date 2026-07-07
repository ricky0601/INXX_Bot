import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits } from 'discord.js'
import type { ButtonInteraction } from 'discord.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'
import { deleteRaidSchedule, getRaidSchedule } from '../lib/inxx-api.js'
import { buildRaidEmbed } from '../lib/raid-embed.js'

export const RAID_MANAGE_BUTTON_PREFIX = 'raid_manage:'
export const RAID_MANAGE_DELETE_PREFIX = 'raid_manage_delete:'

function parseCustomId(customId: string): { raidScheduleId: string } | null {
  const [, raidScheduleId] = customId.split(':')
  if (!raidScheduleId) return null
  return { raidScheduleId }
}

function isRaidManager(interaction: ButtonInteraction, scheduleCreatorId: string | null): boolean {
  if (scheduleCreatorId != null && interaction.user.id === scheduleCreatorId) return true
  if (interaction.guild?.ownerId === interaction.user.id) return true
  const permissions = interaction.memberPermissions
  if (permissions?.has(PermissionFlagsBits.Administrator)) return true
  return false
}

export async function handleRaidManageButton(interaction: ButtonInteraction) {
  const parsed = parseCustomId(interaction.customId)
  if (!parsed) {
    await interaction.reply({ content: '관리 버튼 정보가 올바르지 않습니다.', flags: MessageFlags.Ephemeral })
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const user = await requireInxxUser(interaction)
  if (!user) return

  let detail
  try {
    detail = await getRaidSchedule(parsed.raidScheduleId)
  } catch (error) {
    const message = error instanceof Error ? error.message : '레이드 일정 조회에 실패했습니다.'
    await interaction.editReply(message)
    return
  }

  if (!isRaidManager(interaction, detail.schedule.createdBy)) {
    await interaction.editReply('레이드 관리 권한이 없습니다.')
    return
  }

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${RAID_MANAGE_DELETE_PREFIX}${parsed.raidScheduleId}`)
      .setLabel('일정 삭제')
      .setStyle(ButtonStyle.Danger),
  )

  await interaction.editReply({
    content: '관리 메뉴입니다. 원하는 작업을 선택하세요.',
    components: [buttons],
  })
}

export async function handleRaidManageDeleteButton(interaction: ButtonInteraction) {
  const parsed = parseCustomId(interaction.customId)
  if (!parsed) {
    await interaction.reply({ content: '삭제 버튼 정보가 올바르지 않습니다.', flags: MessageFlags.Ephemeral })
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const user = await requireInxxUser(interaction)
  if (!user) return

  let detail
  try {
    detail = await getRaidSchedule(parsed.raidScheduleId)
  } catch (error) {
    const message = error instanceof Error ? error.message : '레이드 일정 조회에 실패했습니다.'
    await interaction.editReply(message)
    return
  }

  if (!isRaidManager(interaction, detail.schedule.createdBy)) {
    await interaction.editReply('레이드 삭제 권한이 없습니다.')
    return
  }

  try {
    await deleteRaidSchedule(parsed.raidScheduleId, user.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : '레이드 일정 삭제에 실패했습니다.'
    await interaction.editReply(message)
    return
  }

  await interaction.editReply('레이드 일정이 삭제되었습니다.')

  const channel = interaction.channel
  if (channel?.isThread()) {
    try {
      await channel.delete()
    } catch (error) {
      console.warn('Failed to delete raid forum thread after deletion:', error)
    }
  }
}
