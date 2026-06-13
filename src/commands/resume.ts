import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';
import { EmptyQueueError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume the paused track');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  if (!manager.currentTrack) throw new EmptyQueueError();

  manager.player.resume();
  await interaction.reply({ content: 'Resumed playback.' });
}
