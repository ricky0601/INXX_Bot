import { getRaidCatalog, type RaidCatalogItem } from './inxx-api.js'

const CACHE_TTL_MS = 5 * 60 * 1000

let cache: { items: RaidCatalogItem[]; fetchedAt: number } | null = null

export async function getCachedRaidCatalog(): Promise<RaidCatalogItem[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.items
  }

  const items = await getRaidCatalog()
  cache = { items, fetchedAt: Date.now() }
  return items
}
