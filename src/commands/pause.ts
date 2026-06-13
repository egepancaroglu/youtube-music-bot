import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';
import { EmptyQueueError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pause the current track');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  if (!manager.currentTrack) throw new EmptyQueueError();

  manager.player.pause();
  await interaction.reply({ content: 'Paused the current track.' });
}
