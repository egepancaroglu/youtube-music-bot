import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Set the playback volume')
  .addIntegerOption((opt) =>
    opt.setName('percentage').setDescription('Volume (0-100)').setRequired(true).setMinValue(0).setMaxValue(100),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  const volume = interaction.options.getInteger('percentage', true);
  manager.player.volume = volume;
  await interaction.reply({ content: `Volume set to **${volume}%**.` });
}
