import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback and clear the queue');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  manager.queue.clear();
  manager.player.stop();
  manager.currentTrack = null;
  await interaction.reply({ content: 'Stopped playback and cleared the queue.' });
}
