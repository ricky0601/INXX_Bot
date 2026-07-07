import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'
import { refreshRoster } from '../lib/inxx-api.js'

export const data = new SlashCommandBuilder()
  .setName('원정대최신화')
  .setDescription('등록한 원정대 캐릭터 정보를 Lost Ark API에서 다시 불러와 최신화합니다.')

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral })

  const user = await requireInxxUser(interaction)
  if (!user) return

  let result
  try {
    result = await refreshRoster(user.id)
  } catch (error) {
    const message = error instanceof Error ? error.message : '원정대 정보 최신화에 실패했습니다.'
    await interaction.editReply(message)
    return
  }

  const lines = result.characters.map((character) => {
    const level = character.itemLevel != null ? `Lv.${character.itemLevel.toFixed(2)}` : 'Lv.—'
    const cp =
      character.combatPower != null
        ? new Intl.NumberFormat('ko-KR').format(character.combatPower)
        : '—'
    return `- ${character.characterName} (${character.characterClass ?? '직업 미확인'} · ${level} · 전투력 ${cp})`
  })

  await interaction.editReply({
    content: `**${result.mainCharacterName}** 원정대 정보를 최신화했습니다. (${result.characterCount}개 캐릭터)${lines.length > 0 ? '\n' + lines.join('\n') : ''}`,
  })
}
