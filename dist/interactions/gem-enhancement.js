import { MessageFlags } from 'discord.js';
import { GEM_ENHANCEMENT_BUTTON_PREFIX, buildGemEnhancementMessage, parseGemEnhancementButtonId, } from '../lib/gem-enhancement-message.js';
import { runGemEnhancementAction } from '../lib/gem-enhancement-api.js';
import { getInxxUserByDiscordId } from '../lib/inxx-api.js';
import { notLinkedMessage } from '../lib/login-hint.js';
export { GEM_ENHANCEMENT_BUTTON_PREFIX };
export async function handleGemEnhancementButton(interaction) {
    const parsed = parseGemEnhancementButtonId(interaction.customId);
    if (!parsed) {
        await interaction.reply({ content: '보석 강화 버튼 정보가 올바르지 않습니다.', flags: MessageFlags.Ephemeral });
        return;
    }
    if (interaction.user.id !== parsed.ownerId) {
        await interaction.reply({
            content: '본인의 보석 강화 결과에서만 사용할 수 있는 버튼입니다.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    await interaction.deferUpdate();
    const user = await getInxxUserByDiscordId(interaction.user.id);
    if (!user) {
        await interaction.followUp({ content: notLinkedMessage(), flags: MessageFlags.Ephemeral });
        return;
    }
    try {
        const result = await runGemEnhancementAction(user.id, parsed.action);
        await interaction.editReply(buildGemEnhancementMessage(result.view, result, parsed.ownerId, {
            hideDisabledButtons: true,
            footerName: user.mainCharacterName ?? user.displayName,
            botName: interaction.client.user.username,
        }));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '보석 강화에 실패했습니다.';
        await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    }
}
//# sourceMappingURL=gem-enhancement.js.map