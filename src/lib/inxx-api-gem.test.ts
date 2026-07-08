import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getGemEnhancementView, runGemEnhancementAction } from './gem-enhancement-api.js'

const originalBaseUrl = process.env.INXX_API_BASE_URL
const originalSecret = process.env.DISCORD_BOT_API_SECRET

const view = {
  leaderboard: [],
  currentUserState: null,
  cooldownRemainingSeconds: 0,
}

beforeEach(() => {
  process.env.INXX_API_BASE_URL = 'https://inxx.example.com'
  process.env.DISCORD_BOT_API_SECRET = 'secret'
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalBaseUrl === undefined) {
    delete process.env.INXX_API_BASE_URL
  } else {
    process.env.INXX_API_BASE_URL = originalBaseUrl
  }
  if (originalSecret === undefined) {
    delete process.env.DISCORD_BOT_API_SECRET
  } else {
    process.env.DISCORD_BOT_API_SECRET = originalSecret
  }
})

describe('gem enhancement INXX API client', () => {
  it('fetches gem view with encoded user id and bot secret', async () => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>().mockResolvedValue(
      Response.json({ view }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(getGemEnhancementView('u 1')).resolves.toEqual(view)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://inxx.example.com/api/bot/gem-enhancement?userId=u%201',
      { headers: { authorization: 'Bearer secret' } },
    )
  })

  it('posts gem actions with bot secret and JSON body', async () => {
    const fetchMock = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>().mockResolvedValue(
      Response.json({ view, skipped: true }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(runGemEnhancementAction('u1', 'skip-gaho')).resolves.toEqual({ view, skipped: true })

    expect(fetchMock).toHaveBeenCalledWith('https://inxx.example.com/api/bot/gem-enhancement', {
      method: 'POST',
      headers: {
        authorization: 'Bearer secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userId: 'u1', action: 'skip-gaho' }),
    })
  })
})
