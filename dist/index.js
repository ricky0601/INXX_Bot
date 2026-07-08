import './lib/load-env.js';
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RAID_APPLY_BUTTON_PREFIX, RAID_APPLY_CHARACTER_SELECT_PREFIX, RAID_APPLY_ROLE_SELECT_PREFIX, handleRaidApplyButton, handleRaidApplyCharacterSelect, handleRaidApplyRoleSelect, } from './interactions/raid-apply.js';
import { RAID_CANCEL_BUTTON_PREFIX, handleRaidCancelButton } from './interactions/raid-cancel.js';
import { RAID_MANAGE_BUTTON_PREFIX, RAID_MANAGE_DELETE_PREFIX, handleRaidManageButton, handleRaidManageDeleteButton, } from './interactions/raid-manage.js';
import { CHARACTER_REGISTER_SELECT_PREFIX, handleCharacterRegisterSelect, } from './interactions/character-register.js';
import { GEM_ENHANCEMENT_BUTTON_PREFIX, handleGemEnhancementButton } from './interactions/gem-enhancement.js';
import { handleGemPrefixCommand, isPrefixCommandsEnabled, parseGemPrefixCommand } from './lib/prefix-commands.js';
const token = process.env.DISCORD_TOKEN;
if (!token) {
    throw new Error('DISCORD_TOKEN is not set in .env');
}
const prefixCommandsEnabled = isPrefixCommandsEnabled(process.env.INXX_ENABLE_PREFIX_COMMANDS);
const intents = prefixCommandsEnabled
    ? [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
    : [GatewayIntentBits.Guilds];
const client = new Client({ intents });
client.commands = new Collection();
const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsPath = join(__dirname, 'commands');
for (const file of readdirSync(commandsPath).filter((f) => f.endsWith('.ts') || f.endsWith('.js'))) {
    const mod = (await import(pathToFileURL(join(commandsPath, file)).href));
    if ('data' in mod && 'execute' in mod) {
        client.commands.set(mod.data.name, mod);
    }
}
client.once(Events.ClientReady, (readyClient) => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});
client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command?.autocomplete)
            return;
        try {
            await command.autocomplete(interaction);
        }
        catch (error) {
            console.error('Autocomplete failed:', error);
        }
        return;
    }
    if (interaction.isButton()) {
        if (interaction.customId.startsWith(RAID_APPLY_BUTTON_PREFIX)) {
            try {
                await handleRaidApplyButton(interaction);
            }
            catch (error) {
                console.error('Failed to handle raid_apply button:', error);
            }
        }
        else if (interaction.customId.startsWith(RAID_CANCEL_BUTTON_PREFIX)) {
            try {
                await handleRaidCancelButton(interaction);
            }
            catch (error) {
                console.error('Failed to handle raid_cancel button:', error);
            }
        }
        else if (interaction.customId.startsWith(RAID_MANAGE_BUTTON_PREFIX)) {
            try {
                await handleRaidManageButton(interaction);
            }
            catch (error) {
                console.error('Failed to handle raid_manage button:', error);
            }
        }
        else if (interaction.customId.startsWith(RAID_MANAGE_DELETE_PREFIX)) {
            try {
                await handleRaidManageDeleteButton(interaction);
            }
            catch (error) {
                console.error('Failed to handle raid_manage_delete button:', error);
            }
        }
        else if (interaction.customId.startsWith(GEM_ENHANCEMENT_BUTTON_PREFIX)) {
            try {
                await handleGemEnhancementButton(interaction);
            }
            catch (error) {
                console.error('Failed to handle gem_enhancement button:', error);
            }
        }
        return;
    }
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith(RAID_APPLY_ROLE_SELECT_PREFIX)) {
            try {
                await handleRaidApplyRoleSelect(interaction);
            }
            catch (error) {
                console.error('Failed to handle raid_apply_role select:', error);
            }
        }
        else if (interaction.customId.startsWith(RAID_APPLY_CHARACTER_SELECT_PREFIX)) {
            try {
                await handleRaidApplyCharacterSelect(interaction);
            }
            catch (error) {
                console.error('Failed to handle raid_apply_character select:', error);
            }
        }
        else if (interaction.customId.startsWith(CHARACTER_REGISTER_SELECT_PREFIX)) {
            try {
                await handleCharacterRegisterSelect(interaction);
            }
            catch (error) {
                console.error('Failed to handle char_register select:', error);
            }
        }
        return;
    }
    if (!interaction.isChatInputCommand())
        return;
    const command = client.commands.get(interaction.commandName);
    if (!command)
        return;
    try {
        await command.execute(interaction);
    }
    catch (error) {
        console.error(error);
        const reply = { content: '명령 처리 중 오류가 발생했습니다.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        }
        else {
            await interaction.reply(reply);
        }
    }
});
if (prefixCommandsEnabled) {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot || !message.inGuild())
            return;
        const command = parseGemPrefixCommand(message.content);
        if (!command)
            return;
        try {
            await handleGemPrefixCommand(message, command);
        }
        catch (error) {
            console.error('Failed to handle gem prefix command:', error);
        }
    });
}
await client.login(token);
//# sourceMappingURL=index.js.map