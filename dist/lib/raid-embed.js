import { EmbedBuilder } from 'discord.js';
const MAX_FIELD_VALUE_LENGTH = 1024;
const EMPTY_PARTICIPANT_MESSAGE = '아직 없습니다';
function resolveImageUrl(imageUrl) {
    if (!imageUrl)
        return null;
    if (/^https?:\/\//i.test(imageUrl))
        return imageUrl;
    const base = process.env.INXX_WEB_BASE_URL ?? '';
    if (!base)
        return imageUrl;
    const normalizedBase = base.replace(/\/$/, '');
    const normalizedPath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return `${normalizedBase}${normalizedPath}`;
}
export function formatKst(iso) {
    return new Date(iso).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}
export function formatNumber(value) {
    if (value == null)
        return '—';
    return new Intl.NumberFormat('ko-KR').format(value);
}
function formatLevel(value) {
    if (value == null)
        return '—';
    return `Lv.${value.toFixed(2)}`;
}
function average(values) {
    const valid = values.filter((value) => value != null);
    if (valid.length === 0)
        return null;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}
function formatParticipantHeadline(participant) {
    return participant.userDisplayName ?? participant.userDiscordUsername ?? participant.characterName;
}
function formatParticipantLine(participant) {
    const headline = formatParticipantHeadline(participant);
    const className = participant.characterClass ?? '직업 미확인';
    const level = formatLevel(participant.itemLevel);
    const cp = formatNumber(participant.combatPower);
    return [`• **${headline}**`, `${participant.characterName} · ${className} · ${level} · CP ${cp}`].join('\n');
}
function formatRaidSummary(detail) {
    const { schedule, author, participants, catalog } = detail;
    const leader = author?.displayName ?? author?.discordUsername ?? '알 수 없음';
    const avgItemLevel = average(participants.map((participant) => participant.itemLevel));
    const avgCombatPower = average(participants.map((participant) => participant.combatPower));
    const currentParticipants = participants.length;
    const participantLimit = schedule.maxParticipants != null ? `${currentParticipants}/${schedule.maxParticipants}` : `${currentParticipants}/제한 없음`;
    return [
        `**일시**\n${formatKst(schedule.scheduledAt)}`,
        `**공대장**\n${leader}`,
        `**모집 현황**\n${participantLimit}`,
        `**입장 레벨**\n${catalog.requiredLevel != null ? `Lv.${catalog.requiredLevel}` : '—'}`,
        `**공격대 평균**\n레벨 ${formatLevel(avgItemLevel)} · 전투력 ${formatNumber(avgCombatPower)}`,
    ].join('\n\n');
}
export function formatParticipantList(participants, role) {
    const filtered = participants.filter((participant) => participant.combatRole === role);
    if (filtered.length === 0) {
        return EMPTY_PARTICIPANT_MESSAGE;
    }
    let result = '';
    for (let index = 0; index < filtered.length; index++) {
        const line = formatParticipantLine(filtered[index]);
        if (result.length + line.length + 1 > MAX_FIELD_VALUE_LENGTH) {
            const remaining = filtered.length - index;
            result += `\n…외 ${remaining}명`;
            break;
        }
        result += (index > 0 ? '\n' : '') + line;
    }
    return result;
}
export function buildRaidEmbed(detail) {
    const { schedule, author, participants, catalog } = detail;
    const dealers = participants.filter((participant) => participant.combatRole === 'dealer');
    const supports = participants.filter((participant) => participant.combatRole === 'support');
    const embed = new EmbedBuilder()
        .setColor(0xd4a63a)
        .setTitle(schedule.title)
        .setDescription(formatRaidSummary(detail));
    const resolvedImageUrl = resolveImageUrl(catalog.imageUrl);
    console.log('[buildRaidEmbed] catalog.imageUrl=%s INXX_WEB_BASE_URL=%s resolved=%s', catalog.imageUrl, process.env.INXX_WEB_BASE_URL ?? '(unset)', resolvedImageUrl ?? '(none)');
    if (resolvedImageUrl) {
        embed.setImage(resolvedImageUrl);
    }
    if (author) {
        embed.setAuthor({
            name: `공대 모집 · ${author.displayName ?? author.discordUsername ?? '알 수 없음'}`,
            iconURL: author.avatarUrl ?? undefined,
        });
    }
    embed.addFields({
        name: `딜러 (${dealers.length})`,
        value: formatParticipantList(participants, 'dealer'),
        inline: false,
    }, {
        name: `서포터 (${supports.length})`,
        value: formatParticipantList(participants, 'support'),
        inline: false,
    });
    if (schedule.memo) {
        embed.addFields({ name: '메모', value: schedule.memo });
    }
    embed.setFooter({ text: 'INXX 레이드' });
    return embed;
}
//# sourceMappingURL=raid-embed.js.map