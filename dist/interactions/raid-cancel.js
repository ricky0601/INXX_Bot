import { MessageFlags } from 'discord.js';
import { requireInxxUser } from '../lib/require-inxx-user.js';
import { cancelRaidSchedule, getRaidSchedule } from '../lib/inxx-api.js';
import { buildRaidEmbed } from '../lib/raid-embed.js';
export const RAID_CANCEL_BUTTON_PREFIX = 'raid_cancel:';
function parseCustomId(customId) {
    const [, raidScheduleId] = customId.split(':');
    if (!raidScheduleId)
        return null;
    return { raidScheduleId };
}
async function refreshForumMessage(interaction, raidScheduleId) {
    if (!interaction.channel?.isThread())
        return;
    const starterMessage = await interaction.channel.fetchStarterMessage().catch(() => null);
    if (!starterMessage)
        return;
    const detail = await getRaidSchedule(raidScheduleId);
    const embed = buildRaidEmbed(detail);
    await starterMessage.edit({ embeds: [embed] });
}
export async function handleRaidCancelButton(interaction) {
    const parsed = parseCustomId(interaction.customId);
    if (!parsed) {
        await interaction.reply({ content: '취소 버튼 정보가 올바르지 않습니다.', flags: MessageFlags.Ephemeral });
        return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = await requireInxxUser(interaction);
    if (!user)
        return;
    try {
        await cancelRaidSchedule(parsed.raidScheduleId, user.id);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '레이드 참여 취소에 실패했습니다.';
        await interaction.editReply(message);
        return;
    }
    try {
        await refreshForumMessage(interaction, parsed.raidScheduleId);
    }
    catch (error) {
        console.error('Failed to refresh forum message after cancel:', error);
    }
    await interaction.editReply('레이드 참여가 취소되었습니다.');
    if (interaction.channel?.isSendable()) {
        const displayName = user.mainCharacterName ?? user.displayName ?? user.discordUsername ?? '누군가';
        await interaction.channel.send(`🚫 **${displayName}**님이 레이드 참여를 취소했습니다.`);
    }
}
//# sourceMappingURL=raid-cancel.js.map