import type { RepliableInteraction } from 'discord.js'
import { getInxxUserByDiscordId, type InxxUser } from './inxx-api.js'

export async function requireInxxUser(interaction: RepliableInteraction): Promise<InxxUser | null> {
  const user = await getInxxUserByDiscordId(interaction.user.id)
  if (user) {
    return user
  }

  const webBaseUrl = process.env.INXX_WEB_BASE_URL
  const loginHint = webBaseUrl ? `${webBaseUrl}/login` : 'INXX 웹사이트'
  await interaction.editReply(`INXX 계정이 연동되어 있지 않습니다. 먼저 웹사이트에 로그인해주세요: ${loginHint}`)
  return null
}
