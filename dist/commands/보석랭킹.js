import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getGemEnhancementView } from '../lib/gem-enhancement-api.js';
import { buildGemEnhancementRankingMessage } from '../lib/gem-enhancement-message.js';
import { requireInxxUser } from '../lib/require-inxx-user.js';
export const data = new SlashCommandBuilder()
    .setName('보석랭킹')
    .setDescription('INXX 보석 강화 랭킹을 확인합니다.');
export const execute = async (interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = await requireInxxUser(interaction);
    if (!user)
        return;
    const view = await getGemEnhancementView(user.id);
    await interaction.editReply(buildGemEnhancementRankingMessage(view));
};
//# sourceMappingURL=%EB%B3%B4%EC%84%9D%EB%9E%AD%ED%82%B9.js.map