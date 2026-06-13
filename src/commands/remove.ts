import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';

export const data = new SlashCommandBuilder()
  .setName('remove')
  .setDescription('Remove a track from the queue')
  .addIntegerOption((opt) =>
    opt.setName('position').setDescription('Queue position (1-based)').setRequired(true).setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  const position = interaction.options.getInteger('position', true);
  const removed = manager.queue.remove(position - 1);

  if (!removed) {
    await interaction.reply({ content: `Invalid position. Queue has ${manager.queue.size} tracks.`, ephemeral: true });
    return;
  }

  await interaction.reply({ content: `Removed **${removed.title}** from the queue.` });
}
