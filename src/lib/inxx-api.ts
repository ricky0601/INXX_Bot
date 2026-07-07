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
  requiredLevel: number | null
  defaultMaxParticipants: number
  imageUrl: string | null
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

export type RaidParticipant = {
  id: string
  userId: string
  userDisplayName: string | null
  userDiscordUsername: string | null
  characterId: string | null
  characterName: string
  characterClass: string | null
  itemLevel: number | null
  combatPower: number | null
  combatRole: 'dealer' | 'support'
  status: 'joined' | 'cancelled' | 'waitlisted'
  joinedAt: string
}

export type RaidAuthor = {
  id: string
  displayName: string | null
  discordUsername: string | null
  avatarUrl: string | null
}

export type RaidCatalogSummary = {
  imageUrl: string | null
  requiredLevel: number | null
}

export type RaidScheduleDetail = {
  schedule: RaidSchedule
  author: RaidAuthor | null
  participants: RaidParticipant[]
  catalog: RaidCatalogSummary
}

export type UserCharacterSummary = {
  id: string
  characterName: string
  characterClass: string | null
  itemLevel: number | null
  combatPower: number | null
  isMain: boolean
}

export type RosterPreviewCharacter = {
  characterName: string
  characterClass: string
  itemLevel: number | null
  alreadyRegistered: boolean
}

export type RosterPreview = {
  searchedCharacterName: string
  serverName: string
  characters: RosterPreviewCharacter[]
}

export type RegisterCharacterRosterInput = {
  mainCharacterName: string
  characters: Array<{ characterName: string; characterClass: string; itemLevel: number | null }>
}

export type RegisterCharacterRosterResult = {
  mainCharacterName: string
  characterCount: number
}

export type RefreshRosterResult = {
  mainCharacterName: string
  characterCount: number
  characters: Array<{
    characterName: string
    characterClass: string | null
    itemLevel: number | null
    combatPower: number | null
  }>
}

const lostArkErrorMessages: Record<string, string> = {
  LostArkCharacterNotFoundError: '해당 캐릭터를 찾을 수 없습니다. 캐릭터명을 다시 확인해주세요.',
  LostArkRateLimitError: 'Lost Ark API 요청이 많아 잠시 후 다시 시도해주세요.',
  LostArkApiTimeoutError: 'Lost Ark API 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
  LOSTARK_API_UNAVAILABLE: 'Lost Ark 연동 설정에 문제가 있습니다. 관리자에게 문의해주세요.',
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

async function readLostArkAwareErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { code?: string; message?: string } | null
  const friendlyMessage = body?.code ? lostArkErrorMessages[body.code] : undefined
  return friendlyMessage ?? body?.message ?? fallback
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

export async function getRosterPreview(userId: string, characterName: string): Promise<RosterPreview> {
  const response = await fetch(`${getBaseUrl()}/api/bot/user-characters/roster-preview`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getSecret()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userId, characterName }),
  })

  if (!response.ok) {
    throw new Error(await readLostArkAwareErrorMessage(response, '원정대 조회에 실패했습니다.'))
  }

  return (await response.json()) as RosterPreview
}

export async function registerCharacterRoster(
  userId: string,
  input: RegisterCharacterRosterInput,
): Promise<RegisterCharacterRosterResult> {
  const response = await fetch(`${getBaseUrl()}/api/bot/user-characters/register`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getSecret()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userId, ...input }),
  })

  if (!response.ok) {
    throw new Error(await readLostArkAwareErrorMessage(response, '캐릭터 등록에 실패했습니다.'))
  }

  return (await response.json()) as RegisterCharacterRosterResult
}

export async function refreshRoster(userId: string): Promise<RefreshRosterResult> {
  const response = await fetch(`${getBaseUrl()}/api/bot/user-characters/refresh`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${getSecret()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    throw new Error(await readLostArkAwareErrorMessage(response, '원정대 정보 최신화에 실패했습니다.'))
  }

  return (await response.json()) as RefreshRosterResult
}

export async function joinRaidSchedule(
  raidScheduleId: string,
  input: JoinRaidScheduleInput,
): Promise<RaidParticipant> {
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

  return (await response.json()) as RaidParticipant
}

export async function cancelRaidSchedule(raidScheduleId: string, userId: string): Promise<void> {
  const response = await fetch(
    `${getBaseUrl()}/api/bot/raid-schedules/${encodeURIComponent(raidScheduleId)}/cancel`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${getSecret()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '레이드 참여 취소에 실패했습니다.'))
  }
}

export async function getRaidSchedule(raidScheduleId: string): Promise<RaidScheduleDetail> {
  const response = await fetch(
    `${getBaseUrl()}/api/bot/raid-schedules/${encodeURIComponent(raidScheduleId)}`,
    {
      headers: { authorization: `Bearer ${getSecret()}` },
    },
  )

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, '레이드 일정 조회에 실패했습니다.'))
  }

  return (await response.json()) as RaidScheduleDetail
}
