import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';

export const data = new SlashCommandBuilder()
  .setName('clear')
  .setDescription('Clear the queue');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  const count = manager.queue.size;
  manager.queue.clear();
  await interaction.reply({ content: `Cleared **${count}** track(s) from the queue.` });
}
