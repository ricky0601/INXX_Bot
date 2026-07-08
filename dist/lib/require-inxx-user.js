import { getInxxUserByDiscordId } from './inxx-api.js';
import { notLinkedMessage } from './login-hint.js';
export async function requireInxxUser(interaction) {
    const user = await getInxxUserByDiscordId(interaction.user.id);
    if (user) {
        return user;
    }
    await interaction.editReply(notLinkedMessage());
    return null;
}
//# sourceMappingURL=require-inxx-user.js.map