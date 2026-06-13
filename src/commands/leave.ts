import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';

export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Leave the voice channel');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  manager.disconnect();
  await interaction.reply({ content: 'Left the voice channel.' });
}
