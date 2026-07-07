import { ActionRowBuilder, MessageFlags, StringSelectMenuBuilder } from 'discord.js'
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'
import { getUserCharacters, getRaidSchedule, joinRaidSchedule } from '../lib/inxx-api.js'
import { buildRaidEmbed } from '../lib/raid-embed.js'

export const RAID_APPLY_BUTTON_PREFIX = 'raid_apply:'
export const RAID_APPLY_ROLE_SELECT_PREFIX = 'raid_apply_role:'
export const RAID_APPLY_CHARACTER_SELECT_PREFIX = 'raid_apply_character:'

const roleLabels = {
  dealer: '딜러',
  support: '서포터',
} as const

function parseButtonCustomId(customId: string): { raidScheduleId: string } | null {
  const [, raidScheduleId] = customId.split(':')
  if (!raidScheduleId) return null
  return { raidScheduleId }
}

function parseRoleSelectCustomId(customId: string): { raidScheduleId: string } | null {
  const [, raidScheduleId] = customId.split(':')
  if (!raidScheduleId) return null
  return { raidScheduleId }
}

function parseCharacterSelectCustomId(
  customId: string,
): { raidScheduleId: string; combatRole: 'dealer' | 'support' } | null {
  const [, raidScheduleId, combatRole] = customId.split(':')
  if (!raidScheduleId || (combatRole !== 'dealer' && combatRole !== 'support')) {
    return null
  }
  return { raidScheduleId, combatRole }
}

export async function handleRaidApplyButton(interaction: ButtonInteraction) {
  const parsed = parseButtonCustomId(interaction.customId)
  if (!parsed) {
    await interaction.reply({ content: '참가신청 정보가 올바르지 않습니다.', flags: MessageFlags.Ephemeral })
    return
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const user = await requireInxxUser(interaction)
  if (!user) return

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${RAID_APPLY_ROLE_SELECT_PREFIX}${parsed.raidScheduleId}`)
    .setPlaceholder('참여할 역할을 선택하세요')
    .addOptions(
      { label: '딜러', value: 'dealer', emoji: '⚔️' },
      { label: '서포터', value: 'support', emoji: '🛡️' },
    )

  await interaction.editReply({
    content: '참여할 역할을 선택해주세요.',
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  })
}

export async function handleRaidApplyRoleSelect(interaction: StringSelectMenuInteraction) {
  const parsed = parseRoleSelectCustomId(interaction.customId)
  const combatRole = interaction.values[0]
  if (!parsed || (combatRole !== 'dealer' && combatRole !== 'support')) {
    await interaction.update({ content: '역할 정보가 올바르지 않습니다.', components: [] })
    return
  }

  await interaction.deferUpdate()

  const user = await requireInxxUser(interaction)
  if (!user) return

  const characters = await getUserCharacters(user.id)
  if (characters.length === 0) {
    await interaction.editReply({
      content: '등록된 캐릭터가 없습니다. 먼저 웹사이트에서 캐릭터를 등록해주세요.',
      components: [],
    })
    return
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`${RAID_APPLY_CHARACTER_SELECT_PREFIX}${parsed.raidScheduleId}:${combatRole}`)
    .setPlaceholder('참여할 캐릭터를 선택하세요')
    .addOptions(
      characters.slice(0, 25).map((character) => {
        const description = [
          character.characterClass ?? '',
          character.itemLevel != null ? `Lv.${character.itemLevel.toFixed(2)}` : '',
          character.combatPower != null
            ? `전투력 ${new Intl.NumberFormat('ko-KR').format(character.combatPower)}`
            : '',
        ]
          .filter(Boolean)
          .join(' · ')

        return {
          label: character.characterName,
          description: description || undefined,
          value: character.id,
        }
      }),
    )

  await interaction.editReply({
    content: `${roleLabels[combatRole]}로 참여할 캐릭터를 선택해주세요.`,
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  })
}

async function refreshForumMessage(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  raidScheduleId: string,
): Promise<void> {
  if (!interaction.channel?.isThread()) return

  const starterMessage = await interaction.channel.fetchStarterMessage().catch(() => null)
  if (!starterMessage) return

  const detail = await getRaidSchedule(raidScheduleId)
  const embed = buildRaidEmbed(detail)

  await starterMessage.edit({ embeds: [embed] })
}

export async function handleRaidApplyCharacterSelect(interaction: StringSelectMenuInteraction) {
  const parsed = parseCharacterSelectCustomId(interaction.customId)
  const characterId = interaction.values[0]

  if (!parsed || !characterId) {
    await interaction.update({ content: '참여 정보가 올바르지 않습니다.', components: [] })
    return
  }

  await interaction.deferUpdate()

  const user = await requireInxxUser(interaction)
  if (!user) return

  let result
  try {
    result = await joinRaidSchedule(parsed.raidScheduleId, {
      userId: user.id,
      combatRole: parsed.combatRole,
      characterId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '레이드 참여에 실패했습니다.'
    await interaction.editReply({ content: message, components: [] })
    return
  }

  try {
    await refreshForumMessage(interaction, parsed.raidScheduleId)
  } catch (error) {
    console.error('Failed to refresh forum message after join:', error)
  }

  await interaction.editReply({
    content: `${roleLabels[result.combatRole]}로 참여 신청했습니다! (캐릭터: ${result.characterName})`,
    components: [],
  })

  if (interaction.channel?.isSendable()) {
    const displayName = user.displayName ?? user.discordUsername ?? '누군가'
    await interaction.channel.send(
      `🙋 **${displayName}**님이 ${roleLabels[result.combatRole]}로 참여했습니다 (캐릭터: ${result.characterName})`,
    )
  }
}
