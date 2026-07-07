import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('봇 응답 확인')

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.reply('Pong!')
}
