import { ActionRowBuilder, MessageFlags, SlashCommandBuilder, StringSelectMenuBuilder, } from 'discord.js';
import { getRosterPreview } from '../lib/inxx-api.js';
import { requireInxxUser } from '../lib/require-inxx-user.js';
import { CHARACTER_REGISTER_SELECT_PREFIX } from '../interactions/character-register.js';
export const data = new SlashCommandBuilder()
    .setName('캐릭터추가')
    .setDescription('Lost Ark 캐릭터명으로 원정대를 조회해 등록할 캐릭터를 선택합니다.')
    .addStringOption((option) => option.setName('캐릭터명').setDescription('원정대를 조회할 캐릭터명').setRequired(true));
export const execute = async (interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = await requireInxxUser(interaction);
    if (!user)
        return;
    const characterName = interaction.options.getString('캐릭터명', true);
    let preview;
    try {
        preview = await getRosterPreview(user.id, characterName);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '원정대 조회에 실패했습니다.';
        await interaction.editReply(message);
        return;
    }
    const options = preview.characters.slice(0, 25).map((character) => ({
        label: character.characterName,
        description: [
            character.characterClass,
            character.itemLevel != null ? `Lv ${character.itemLevel}` : null,
            character.alreadyRegistered ? '이미 등록됨' : null,
        ]
            .filter(Boolean)
            .join(' · '),
        value: character.characterName,
    }));
    const select = new StringSelectMenuBuilder()
        .setCustomId(`${CHARACTER_REGISTER_SELECT_PREFIX}${preview.searchedCharacterName}`)
        .setPlaceholder('추가할 캐릭터 선택')
        .setMinValues(1)
        .setMaxValues(options.length)
        .addOptions(options);
    const truncatedNotice = preview.characters.length > 25 ? '\n(캐릭터가 많아 상위 25개만 표시됩니다.)' : '';
    await interaction.editReply({
        content: `${preview.searchedCharacterName} 원정대에서 추가할 캐릭터를 선택해주세요. (여러 개 선택 가능)${truncatedNotice}`,
        components: [new ActionRowBuilder().addComponents(select)],
    });
};
//# sourceMappingURL=%EC%BA%90%EB%A6%AD%ED%84%B0%EC%B6%94%EA%B0%80.js.map