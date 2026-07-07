import 'dotenv/config'
import { REST, Routes } from 'discord.js'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const token = process.env.DISCORD_TOKEN
const clientId = process.env.CLIENT_ID
const guildId = process.env.GUILD_ID

if (!token || !clientId || !guildId) {
  throw new Error('DISCORD_TOKEN, CLIENT_ID, GUILD_ID must be set in .env')
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsPath = join(__dirname, 'commands')

const commands = []
for (const file of readdirSync(commandsPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'))) {
  const mod = await import(pathToFileURL(join(commandsPath, file)).href)
  if ('data' in mod && 'execute' in mod) {
    commands.push(mod.data.toJSON())
  }
}

const rest = new REST().setToken(token)

console.log(`Refreshing ${commands.length} guild (/) commands...`)
const data = (await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
  body: commands,
})) as unknown[]
console.log(`Successfully reloaded ${data.length} guild (/) commands.`)
