export type GemEnhancementResult =
  | 'success'
  | 'failure'
  | 'down'
  | 'destroyed'
  | 'pity_forced'
  | 'destroy_prevented'
  | 'down_prevented'

export type GemEnhancementRates = {
  successProbability: number
  failureProbability: number
  downProbability: number
  destructionProbability: number
  pityGain: number
}

export type GemEnhancementState = {
  userId: string
  level: number
  levelLabel: string
  levelIconUrl: string
  pity: number
  attempts: number
  successes: number
  failures: number
  lastAttemptAt: string | null
  cooldownPenaltyUntil: string | null
  bestLevel: number
  bestLevelLabel: string
  bestLevelReachedAt: string | null
  lastResult: GemEnhancementResult | null
  currentRates: GemEnhancementRates
  gaho: {
    ready: boolean
    count: number
    shield: number
    downShield: number
  }
  gahoExtraTry: number
  enhancedMode: boolean
  duelRemaining: number
  luckyRemaining: number
  guardRemaining: number
  createdAt: string
  updatedAt: string
}

export type GemEnhancementLeaderboardEntry = {
  rank: number
  userId: string
  displayName: string | null
  level: number
  levelLabel: string
  bestLevel: number
  bestLevelLabel: string
  bestLevelReachedAt: string | null
  pity: number
  currentRates: GemEnhancementRates
}

export type GemEnhancementView = {
  leaderboard: GemEnhancementLeaderboardEntry[]
  currentUserState: GemEnhancementState | null
  cooldownRemainingSeconds: number
}

export type GemEnhancementAttemptResult = {
  state: GemEnhancementState
  result: GemEnhancementResult
  levelBefore: number
  levelAfter: number
  rates: GemEnhancementRates
  pityBefore: number
  pityAfter: number
  cooldownSeconds: number
  destroyPrevented: boolean
  downPrevented: boolean
  gaho: GemEnhancementState['gaho']
}

export type GahoDrawResult = {
  state: GemEnhancementState
  effect: {
    key: string
    description: string
  }
}

export type GemEnhancementAction = 'attempt' | 'draw-gaho' | 'skip-gaho'

export type GemEnhancementActionResponse =
  | { view: GemEnhancementView; result: GemEnhancementAttemptResult | GahoDrawResult }
  | { view: GemEnhancementView; skipped: true }

function getBaseUrl() {
  const baseUrl = process.env.INXX_API_BASE_URL
  if (!baseUrl) {
    throw new Error('INXX_API_BASE_URL is not set in .env')
  }
  return baseUrl
}

function getSecret() {
  const secret = process.env.DISCORD_BOT_API_SECRET
  if (!secret) {
    throw new Error('DISCORD_BOT_API_SECRET is not set in .env')
  }
  return secret
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    return body.message ?? fallback
  } catch {
    return fallback
  }
}

export async function getGemEnhancementView(userId: string): Promise<GemEnhancementView> {
  const response = await fetch(
    `${getBaseUrl()}/api/bot/gem-enhancement?userId=${encodeURIComponent(userId)}`,
    { headers: { authorization: `Bearer ${getSecret()}` } },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '보석 강화 정보를 불러오지 못했습니다.'))
  }

  const body = (await response.json()) as { view: GemEnhancementView }
  return body.view
}

export async function runGemEnhancementAction(
  userId: string,
  action: GemEnhancementAction,
): Promise<GemEnhancementActionResponse> {
  const response = await fetch(`${getBaseUrl()}/api/bot/gem-enhancement`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getSecret()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userId, action }),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '보석 강화에 실패했습니다.'))
  }

  return (await response.json()) as GemEnhancementActionResponse
}
