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
