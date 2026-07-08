export function getLoginHint() {
    const webBaseUrl = process.env.INXX_WEB_BASE_URL;
    return webBaseUrl ? `${webBaseUrl}/login` : 'INXX 웹사이트';
}
export function notLinkedMessage() {
    return `INXX 계정이 연동되어 있지 않습니다. 먼저 웹사이트에 로그인해주세요: ${getLoginHint()}`;
}
//# sourceMappingURL=login-hint.js.map