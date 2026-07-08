import { getGemEnhancementView, runGemEnhancementAction } from './gem-enhancement-api.js';
import { buildGemEnhancementMessage } from './gem-enhancement-message.js';
import { getInxxUserByDiscordId } from './inxx-api.js';
import { notLinkedMessage } from './login-hint.js';
export function isPrefixCommandsEnabled(value) {
    return value === 'true';
}
export function parseGemPrefixCommand(content) {
    const normalized = content.trim();
    if (normalized === './보석') {
        return 'view';
    }
    if (normalized === './보석강화') {
        return 'attempt';
    }
    return null;
}
export async function handleGemPrefixCommand(message, command) {
    const user = await getInxxUserByDiscordId(message.author.id);
    if (!user) {
        await message.reply(notLinkedMessage());
        return;
    }
    try {
        const footer = {
            footerName: user.mainCharacterName ?? user.displayName,
            botName: message.client.user.username,
        };
        if (command === 'view') {
            const view = await getGemEnhancementView(user.id);
            await message.reply(buildGemEnhancementMessage(view, null, message.author.id, { withButtons: false, ...footer }));
            return;
        }
        const result = await runGemEnhancementAction(user.id, 'attempt');
        await message.reply(buildGemEnhancementMessage(result.view, result, message.author.id, { withButtons: false, ...footer }));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : '보석 강화에 실패했습니다.';
        await message.reply(errorMessage);
    }
}
//# sourceMappingURL=prefix-commands.js.map