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
async function readErrorMessage(response, fallback) {
    try {
        const body = (await response.json());
        return body.message ?? fallback;
    }
    catch {
        return fallback;
    }
}
export async function getGemEnhancementView(userId) {
    const response = await fetch(`${getBaseUrl()}/api/bot/gem-enhancement?userId=${encodeURIComponent(userId)}`, { headers: { authorization: `Bearer ${getSecret()}` } });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '보석 강화 정보를 불러오지 못했습니다.'));
    }
    const body = (await response.json());
    return body.view;
}
export async function runGemEnhancementAction(userId, action) {
    const response = await fetch(`${getBaseUrl()}/api/bot/gem-enhancement`, {
        method: 'POST',
        headers: {
            authorization: `Bearer ${getSecret()}`,
            'content-type': 'application/json',
        },
        body: JSON.stringify({ userId, action }),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, '보석 강화에 실패했습니다.'));
    }
    return (await response.json());
}
//# sourceMappingURL=gem-enhancement-api.js.map