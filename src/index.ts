import 'dotenv/config'
import { Client, Collection, Events, GatewayIntentBits } from 'discord.js'
import type { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { handleRaidJoinButton, handleRaidJoinCharacterSelect } from './interactions/raid-join.js'
import { handleRaidDeleteButton } from './interactions/raid-delete.js'

interface Command {
  data: SlashCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
}

const token = process.env.DISCORD_TOKEN
if (!token) {
  throw new Error('DISCORD_TOKEN is not set in .env')
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] }) as Client & {
  commands: Collection<string, Command>
}
client.commands = new Collection()

const __dirname = dirname(fileURLToPath(import.meta.url))
const commandsPath = join(__dirname, 'commands')

for (const file of readdirSync(commandsPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'))) {
  const mod = (await import(pathToFileURL(join(commandsPath, file)).href)) as Command
  if ('data' in mod && 'execute' in mod) {
    client.commands.set(mod.data.name, mod)
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`)
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName)
    if (!command?.autocomplete) return

    try {
      await command.autocomplete(interaction)
    } catch (error) {
      console.error('Autocomplete failed:', error)
    }
    return
  }

  if (interaction.isButton()) {
    if (interaction.customId.startsWith('raid_join:')) {
      try {
        await handleRaidJoinButton(interaction)
      } catch (error) {
        console.error('Failed to handle raid_join button:', error)
      }
    } else if (interaction.customId.startsWith('raid_delete:')) {
      try {
        await handleRaidDeleteButton(interaction)
      } catch (error) {
        console.error('Failed to handle raid_delete button:', error)
      }
    }
    return
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId.startsWith('raid_join_character:')) {
      try {
        await handleRaidJoinCharacterSelect(interaction)
      } catch (error) {
        console.error('Failed to handle raid_join_character select:', error)
      }
    }
    return
  }

  if (!interaction.isChatInputCommand()) return

  const command = client.commands.get(interaction.commandName)
  if (!command) return

  try {
    await command.execute(interaction)
  } catch (error) {
    console.error(error)
    const reply = { content: '명령 처리 중 오류가 발생했습니다.', ephemeral: true }
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply)
    } else {
      await interaction.reply(reply)
    }
  }
})

await client.login(token)
