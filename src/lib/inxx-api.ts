export type GuildConfig = {
  guildId: string
  forumChannelId: string
  calendarChannelId: string
}

export type InxxUser = {
  id: string
  discordId: string
  discordUsername: string | null
  displayName: string | null
  avatarUrl: string | null
  role: string
  mainCharacterName: string | null
}

export type RaidCatalogItem = {
  id: string
  raidName: string
  difficulty: string
  defaultMaxParticipants: number
}

export type CreateRaidScheduleInput = {
  raidId: string
  date: string
  time: string
  maxParticipants?: number | null
  memo?: string | null
  creatorUserId: string
}

export type RaidSchedule = {
  id: string
  title: string
  raidName: string
  difficulty: string
  scheduledAt: string
  maxParticipants: number | null
  memo: string | null
  createdBy: string | null
}

export type JoinRaidScheduleInput = {
  userId: string
  combatRole: 'dealer' | 'support'
  characterId: string
}

export type JoinRaidScheduleResult = {
  characterName: string
  combatRole: 'dealer' | 'support'
  status: 'joined' | 'cancelled' | 'waitlisted'
}

export type UserCharacterSummary = {
  id: string
  characterName: string
  characterClass: string | null
  itemLevel: number | null
  isMain: boolean
}

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

export async function getGuildConfig(guildId: string): Promise<GuildConfig | null> {
  const response = await fetch(
    `${getBaseUrl()}/api/bot/guild-config?guildId=${encodeURIComponent(guildId)}`,
    { headers: { authorization: `Bearer ${getSecret()}` } },
  )

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch guild config: ${response.status} ${await response.text()}`)
  }

  return (await response.json()) as GuildConfig
}

export async function upsertGuildConfig(input: GuildConfig): Promise<GuildConfig> {
  const response = await fetch(`${getBaseUrl()}/api/bot/guild-config`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getSecret()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(`Failed to save guild config: ${response.status} ${await response.text()}`)
  }

  return (await response.json()) as GuildConfig
}

export async function getInxxUserByDiscordId(discordId: string): Promise<InxxUser | null> {
  const response = await fetch(
    `${getBaseUrl()}/api/bot/user-by-discord-id?discordId=${encodeURIComponent(discordId)}`,
    { headers: { authorization: `Bearer ${getSecret()}` } },
  )

  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch INXX user: ${response.status} ${await response.text()}`)
  }

  return (await response.json()) as InxxUser
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string }
    return body.message ?? fallback
  } catch {
    return fallback
  }
}

export async function getRaidCatalog(): Promise<RaidCatalogItem[]> {
  const response = await fetch(`${getBaseUrl()}/api/bot/raid-catalog`, {
    headers: { authorization: `Bearer ${getSecret()}` },
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '레이드 목록을 불러오지 못했습니다.'))
  }

  return (await response.json()) as RaidCatalogItem[]
}

export async function createRaidSchedule(input: CreateRaidScheduleInput): Promise<RaidSchedule> {
  const response = await fetch(`${getBaseUrl()}/api/bot/raid-schedules`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getSecret()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '레이드 일정 생성에 실패했습니다.'))
  }

  return (await response.json()) as RaidSchedule
}

export async function deleteRaidSchedule(raidScheduleId: string, userId: string): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/bot/raid-schedules/${encodeURIComponent(raidScheduleId)}`,
    {
      method: 'DELETE',
      headers: {
        authorization: `Bearer ${getSecret()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '레이드 일정 삭제에 실패했습니다.'))
  }
}

export async function getUserCharacters(userId: string): Promise<UserCharacterSummary[]> {
  const response = await fetch(
    `${getBaseUrl()}/api/bot/user-characters?userId=${encodeURIComponent(userId)}`,
    { headers: { authorization: `Bearer ${getSecret()}` } },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '캐릭터 목록을 불러오지 못했습니다.'))
  }

  return (await response.json()) as UserCharacterSummary[]
}

export async function joinRaidSchedule(
  raidScheduleId: string,
  input: JoinRaidScheduleInput,
): Promise<JoinRaidScheduleResult> {
  const response = await fetch(
    `${getBaseUrl()}/api/bot/raid-schedules/${encodeURIComponent(raidScheduleId)}/join`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${getSecret()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(input),
    },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '레이드 참여에 실패했습니다.'))
  }

  return (await response.json()) as JoinRaidScheduleResult
}
