import { getRaidCatalog } from './inxx-api.js';
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = null;
export async function getCachedRaidCatalog() {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.items;
    }
    const items = await getRaidCatalog();
    cache = { items, fetchedAt: Date.now() };
    return items;
}
//# sourceMappingURL=raid-catalog-cache.js.map