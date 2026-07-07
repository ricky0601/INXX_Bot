import type { StringSelectMenuInteraction } from 'discord.js'
import { requireInxxUser } from '../lib/require-inxx-user.js'
import { getRosterPreview, registerCharacterRoster } from '../lib/inxx-api.js'

export const CHARACTER_REGISTER_SELECT_PREFIX = 'char_register:'

export async function handleCharacterRegisterSelect(interaction: StringSelectMenuInteraction) {
  const searchedCharacterName = interaction.customId.slice(CHARACTER_REGISTER_SELECT_PREFIX.length)
  if (!searchedCharacterName) {
    await interaction.update({ content: '캐릭터 등록 정보가 올바르지 않습니다.', components: [] })
    return
  }

  await interaction.deferUpdate()

  const user = await requireInxxUser(interaction)
  if (!user) return

  const selectedNames = new Set(interaction.values)

  try {
    const preview = await getRosterPreview(user.id, searchedCharacterName)
    const selectedCharacters = preview.characters.filter((character) =>
      selectedNames.has(character.characterName),
    )

    if (selectedCharacters.length === 0) {
      await interaction.editReply({ content: '선택된 캐릭터가 없습니다.', components: [] })
      return
    }

    const result = await registerCharacterRoster(user.id, {
      mainCharacterName: searchedCharacterName,
      characters: selectedCharacters.map((character) => ({
        characterName: character.characterName,
        characterClass: character.characterClass,
        itemLevel: character.itemLevel,
      })),
    })

    await interaction.editReply({
      content: `캐릭터 등록 완료! ${result.characterCount}개 캐릭터를 등록했습니다. (대표 캐릭터: ${result.mainCharacterName})`,
      components: [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '캐릭터 등록에 실패했습니다.'
    await interaction.editReply({ content: message, components: [] })
  }
}
