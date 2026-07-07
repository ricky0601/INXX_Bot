import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js'
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'
import { getUserCharacters, joinRaidSchedule } from '../lib/inxx-api.js'

const roleLabels = {
  dealer: '딜러',
  support: '서포터',
} as const

function parseCustomId(customId: string): { raidScheduleId: string; combatRole: 'dealer' | 'support' } | null {
  const [, raidScheduleId, combatRole] = customId.split(':')
  if (!raidScheduleId || (combatRole !== 'dealer' && combatRole !== 'support')) {
    return null
  }
  return { raidScheduleId, combatRole }
}

export async function handleRaidJoinButton(interaction: ButtonInteraction) {
  const parsed = parseCustomId(interaction.customId)
  if (!parsed) {
    await interaction.reply({ content: '참여 버튼 정보가 올바르지 않습니다.', ephemeral: true })
    return
  }

  await interaction.deferReply({ ephemeral: true })

  const user = await requireInxxUser(interaction)
  if (!user) return

  const characters = await getUserCharacters(user.id)
  if (characters.length === 0) {
    await interaction.editReply('등록된 캐릭터가 없습니다. 먼저 웹사이트에서 캐릭터를 등록해주세요.')
    return
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`raid_join_character:${parsed.raidScheduleId}:${parsed.combatRole}`)
    .setPlaceholder('참여할 캐릭터를 선택하세요')
    .addOptions(
      characters.slice(0, 25).map((character) => ({
        label: character.characterName,
        description: character.characterClass ?? undefined,
        value: character.id,
      })),
    )

  await interaction.editReply({
    content: `${roleLabels[parsed.combatRole]}로 참여할 캐릭터를 선택해주세요.`,
    components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select)],
  })
}

export async function handleRaidJoinCharacterSelect(interaction: StringSelectMenuInteraction) {
  const parsed = parseCustomId(interaction.customId)
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
