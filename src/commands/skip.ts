import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';
import { EmptyQueueError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip the current track');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  if (!manager.currentTrack) throw new EmptyQueueError();

  const skipped = manager.currentTrack.title;
  manager.player.stop();
  await interaction.reply({ content: `Skipped **${skipped}**.` });
}
