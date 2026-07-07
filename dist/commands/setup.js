import { ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, } from 'discord.js';
import { getGuildConfig, upsertGuildConfig } from '../lib/inxx-api.js';
export const data = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('레이드 포럼 채널과 메인 캘린더 채널을 자동으로 구성합니다.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false);
async function findExistingConfig(guild) {
    const config = await getGuildConfig(guild.id);
    if (!config)
        return null;
    try {
        await guild.channels.fetch(config.forumChannelId);
        await guild.channels.fetch(config.calendarChannelId);
        return config;
    }
    catch {
        return null;
    }
}
export const execute = async (interaction) => {
    if (!interaction.inGuild()) {
        await interaction.reply({ content: '이 명령어는 서버 안에서만 사용할 수 있습니다.', flags: MessageFlags.Ephemeral });
        return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const guild = interaction.guild ?? (await interaction.client.guilds.fetch(interaction.guildId));
    const existing = await findExistingConfig(guild);
    if (existing) {
        const alreadySetUpEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle('이미 설정되어 있습니다')
            .addFields({ name: '레이드 포럼', value: `<#${existing.forumChannelId}>`, inline: true }, { name: '메인 캘린더', value: `<#${existing.calendarChannelId}>`, inline: true });
        await interaction.editReply({ embeds: [alreadySetUpEmbed] });
        return;
    }
    try {
        const forumChannel = await guild.channels.create({
            name: '레이드-일정',
            type: ChannelType.GuildForum,
            topic: '레이드 일정 공지 및 참여 신청',
        });
        const calendarChannel = await guild.channels.create({
            name: '레이드-캘린더',
            type: ChannelType.GuildText,
            topic: '전체 레이드 일정 (웹 캘린더 연동)',
        });
        const webBaseUrl = process.env.INXX_WEB_BASE_URL;
        const introEmbed = new EmbedBuilder()
            .setTitle('레이드 캘린더')
            .setDescription(webBaseUrl
            ? `전체 레이드 일정은 [웹 캘린더](${webBaseUrl}/raids)에서 확인하세요.\n새 레이드는 \`/레이드\` 명령어로 등록하면 이 서버의 포럼 채널에 자동으로 게시됩니다.`
            : '새 레이드는 `/레이드` 명령어로 등록하면 이 서버의 포럼 채널에 자동으로 게시됩니다.');
        const introMessage = await calendarChannel.send({ embeds: [introEmbed] });
        try {
            await introMessage.pin();
        }
        catch (pinError) {
            console.warn('Failed to pin intro message (missing Manage Messages permission?):', pinError);
        }
        await upsertGuildConfig({
            guildId: guild.id,
            forumChannelId: forumChannel.id,
            calendarChannelId: calendarChannel.id,
        });
        const successEmbed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle('설정이 완료되었습니다')
            .addFields({ name: '레이드 포럼', value: `<#${forumChannel.id}>`, inline: true }, { name: '메인 캘린더', value: `<#${calendarChannel.id}>`, inline: true });
        await interaction.editReply({ embeds: [successEmbed] });
    }
    catch (error) {
        console.error('Failed to run /setup:', error);
        const message = error instanceof Error && error.message.includes('Missing Permissions')
            ? '채널을 만들 권한이 없습니다. 봇에게 "채널 관리" 권한을 부여한 뒤 다시 시도해 주세요.'
            : '설정 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
        const errorEmbed = new EmbedBuilder().setColor(0xed4245).setTitle('설정 실패').setDescription(message);
        await interaction.editReply({ embeds: [errorEmbed] });
    }
};
//# sourceMappingURL=setup.js.map