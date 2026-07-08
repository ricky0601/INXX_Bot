import type { RepliableInteraction } from 'discord.js'
import { getInxxUserByDiscordId, type InxxUser } from './inxx-api.js'
import { notLinkedMessage } from './login-hint.js'

export async function requireInxxUser(interaction: RepliableInteraction): Promise<InxxUser | null> {
  const user = await getInxxUserByDiscordId(interaction.user.id)
  if (user) {
    return user
  }

  await interaction.editReply(notLinkedMessage())
  return null
}
