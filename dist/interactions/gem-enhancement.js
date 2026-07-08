import { MessageFlags } from 'discord.js';
import { GEM_ENHANCE_BUTTON_ID, GEM_ENHANCEMENT_BUTTON_PREFIX, GEM_GAHO_DRAW_BUTTON_ID, GEM_GAHO_SKIP_BUTTON_ID, buildGemEnhancementMessage, } from '../lib/gem-enhancement-message.js';
import { runGemEnhancementAction } from '../lib/gem-enhancement-api.js';
import { getInxxUserByDiscordId } from '../lib/inxx-api.js';
import { notLinkedMessage } from '../lib/login-hint.js';
export { GEM_ENHANCEMENT_BUTTON_PREFIX };
function parseGemAction(customId) {
    switch (customId) {
        case GEM_ENHANCE_BUTTON_ID:
            return 'attempt';
        case GEM_GAHO_DRAW_BUTTON_ID:
            return 'draw-gaho';
        case GEM_GAHO_SKIP_BUTTON_ID:
            return 'skip-gaho';
        default:
            return null;
    }
}
export async function handleGemEnhancementButton(interaction) {
    const action = parseGemAction(interaction.customId);
    if (!action) {
        await interaction.reply({ content: '보석 강화 버튼 정보가 올바르지 않습니다.', flags: MessageFlags.Ephemeral });
        return;
    }
    await interaction.deferUpdate();
    const user = await getInxxUserByDiscordId(interaction.user.id);
    if (!user) {
        await interaction.followUp({ content: notLinkedMessage(), flags: MessageFlags.Ephemeral });
        return;
    }
    try {
        const result = await runGemEnhancementAction(user.id, action);
        await interaction.editReply(buildGemEnhancementMessage(result.view, result));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '보석 강화에 실패했습니다.';
        await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
    }
}
//# sourceMappingURL=gem-enhancement.js.map