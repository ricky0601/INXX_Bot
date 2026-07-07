const kstTimeZone = 'Asia/Seoul';
const oneDayMs = 24 * 60 * 60 * 1000;
function formatKstDate(date) {
    return date.toLocaleDateString('en-CA', { timeZone: kstTimeZone });
}
function formatKstWeekday(date) {
    return date.toLocaleDateString('ko-KR', { weekday: 'short', timeZone: kstTimeZone });
}
export function suggestDates(query, reference = new Date()) {
    const normalizedQuery = query.trim();
    const suggestions = [];
    for (let offset = 0; offset < 14; offset++) {
        const date = new Date(reference.getTime() + offset * oneDayMs);
        const dateStr = formatKstDate(date);
        const weekday = formatKstWeekday(date);
        let label = dateStr;
        if (offset === 0) {
            label += ' (오늘)';
        }
        else if (offset === 1) {
            label += ' (내일)';
        }
        else {
            label += ` (${weekday})`;
        }
        suggestions.push({ name: label, value: dateStr });
    }
    if (!normalizedQuery) {
        return suggestions.slice(0, 25);
    }
    return suggestions
        .filter(({ name, value }) => name.includes(normalizedQuery) || value.includes(normalizedQuery))
        .slice(0, 25);
}
export function suggestTimes(query, intervalMinutes = 30) {
    const normalizedQuery = query.trim();
    const suggestions = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += intervalMinutes) {
        const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
        const minute = String(minutes % 60).padStart(2, '0');
        const value = `${hour}:${minute}`;
        suggestions.push({ name: value, value });
    }
    if (!normalizedQuery) {
        return suggestions.slice(0, 25);
    }
    return suggestions.filter(({ value }) => value.includes(normalizedQuery)).slice(0, 25);
}
//# sourceMappingURL=date-time-suggest.js.map