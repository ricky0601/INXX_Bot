const lostArkErrorMessages = {
    LostArkCharacterNotFoundError: '해당 캐릭터를 찾을 수 없습니다. 캐릭터명을 다시 확인해주세요.',
    LostArkRateLimitError: 'Lost Ark API 요청이 많아 잠시 후 다시 시도해주세요.',
    LostArkApiTimeoutError: 'Lost Ark API 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
    LOSTARK_API_UNAVAILABLE: 'Lost Ark 연동 설정에 문제가 있습니다. 관리자에게 문의해주세요.',
};
function getBaseUrl() {
    const baseUrl = process.env.INXX_API_BASE_URL;
    if (!baseUrl) {
        throw new Error('INXX_API_BASE_URL is not set in .env');
    }
    return baseUrl;
}
function getSecret() {
    const secret = process.env.DISCORD_BOT_API_SECRET;
    if (!secret) {
        throw new Error('DISCORD_BOT_API_SECRET is not set in .env');
    }
    return secret;
}
export async function getGuildConfig(guildId) {
    const response = await fetch(`${getBaseUrl()}/api/bot/guild-config?guildId=${encodeURIComponent(guildId)}`, { headers: { authorization: `Bearer ${getSecret()}` } });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Failed to fetch guild config: ${response.status} ${await response.text()}`);
    }
    return (await response.json());
}
export async function upsertGuildConfig(input) {
    const response = await fetch(`${getBaseUrl()}/api/bot/guild-config`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    if (!response.ok) {
        throw new Error(`Failed to save guild config: ${response.status} ${await response.text()}`);
    }
    return (await response.json());
}
export async function getInxxUserByDiscordId(discordId) {
    const response = await fetch(`${getBaseUrl()}/api/bot/user-by-discord-id?discordId=${encodeURIComponent(discordId)}`, { headers: { authorization: `Bearer ${getSecret()}` } });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(`Failed to fetch INXX user: ${response.status} ${await response.text()}`);
    }
    return (await response.json());
}
async function readErrorMessage(response, fallback) {
    try {
        const body = (await response.json());
        return body.message ?? fallback;
    }
    catch {
        return fallback;
    }
}
async function readLostArkAwareErrorMessage(response, fallback) {
    const body = (await response.json().catch(() => null));
    const friendlyMessage = body?.code ? lostArkErrorMessages[body.code] : undefined;
    return friendlyMessage ?? body?.message ?? fallback;
}
export async function getRaidCatalog() {
    const response = await fetch(`${getBaseUrl()}/api/bot/raid-catalog`, {
        headers: { authorization: `Bearer ${getSecret()}` },
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '레이드 목록을 불러오지 못했습니다.'));
    }
    return (await response.json());
}
export async function createRaidSchedule(input) {
    const response = await fetch(`${getBaseUrl()}/api/bot/raid-schedules`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '레이드 일정 생성에 실패했습니다.'));
    }
    return (await response.json());
}
export async function deleteRaidSchedule(raidScheduleId, userId) {
    const response = await fetch(`${getBaseUrl()}/api/bot/raid-schedules/${encodeURIComponent(raidScheduleId)}`, {
        method: 'DELETE',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '레이드 일정 삭제에 실패했습니다.'));
    }
}
export async function getUserCharacters(userId) {
    const response = await fetch(`${getBaseUrl()}/api/bot/user-characters?userId=${encodeURIComponent(userId)}`, { headers: { authorization: `Bearer ${getSecret()}` } });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '캐릭터 목록을 불러오지 못했습니다.'));
    }
    return (await response.json());
}
export async function getRosterPreview(userId, characterName) {
    const response = await fetch(`${getBaseUrl()}/api/bot/user-characters/roster-preview`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ userId, characterName }),
    });
    if (!response.ok) {
        throw new Error(await readLostArkAwareErrorMessage(response, '원정대 조회에 실패했습니다.'));
    }
    return (await response.json());
}
export async function registerCharacterRoster(userId, input) {
    const response = await fetch(`${getBaseUrl()}/api/bot/user-characters/register`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ userId, ...input }),
    });
    if (!response.ok) {
        throw new Error(await readLostArkAwareErrorMessage(response, '캐릭터 등록에 실패했습니다.'));
    }
    return (await response.json());
}
export async function refreshRoster(userId) {
    const response = await fetch(`${getBaseUrl()}/api/bot/user-characters/refresh`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
        throw new Error(await readLostArkAwareErrorMessage(response, '원정대 정보 최신화에 실패했습니다.'));
    }
    return (await response.json());
}
export async function joinRaidSchedule(raidScheduleId, input) {
    const response = await fetch(`${getBaseUrl()}/api/bot/raid-schedules/${encodeURIComponent(raidScheduleId)}/join`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify(input),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '레이드 참여에 실패했습니다.'));
    }
    return (await response.json());
}
export async function cancelRaidSchedule(raidScheduleId, userId) {
    const response = await fetch(`${getBaseUrl()}/api/bot/raid-schedules/${encodeURIComponent(raidScheduleId)}/cancel`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '레이드 참여 취소에 실패했습니다.'));
    }
}
export async function getRaidSchedule(raidScheduleId) {
    const response = await fetch(`${getBaseUrl()}/api/bot/raid-schedules/${encodeURIComponent(raidScheduleId)}`, {
        headers: { authorization: `Bearer ${getSecret()}` },
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '레이드 일정 조회에 실패했습니다.'));
    }
    return (await response.json());
}
//# sourceMappingURL=inxx-api.js.map