import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';
import { EmptyQueueError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('shuffle')
  .setDescription('Shuffle the queue');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  if (manager.queue.isEmpty) throw new EmptyQueueError();

  manager.queue.shuffle();
  await interaction.reply({ content: `Shuffled **${manager.queue.size}** tracks.` });
}
