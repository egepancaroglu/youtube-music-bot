import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';
import { formatDuration } from '../utils/duration.js';

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Show the current queue');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  const tracks = manager.queue.getAll();

  const embed = new EmbedBuilder().setTitle('Queue').setColor(0x5865f2);

  if (manager.currentTrack) {
    embed.addFields({
      name: 'Now Playing',
      value: `[${manager.currentTrack.title}](${manager.currentTrack.url}) — ${manager.currentTrack.artist} (${formatDuration(manager.currentTrack.duration)})`,
    });
  }

  if (tracks.length === 0) {
    embed.setDescription(manager.currentTrack ? 'No more tracks in queue.' : 'The queue is empty.');
  } else {
    const list = tracks
      .slice(0, 20)
      .map(
        (t, i) =>
          `**${i + 1}.** [${t.title}](${t.url}) — ${t.artist} (${formatDuration(t.duration)})`,
      )
      .join('\n');

    const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0);
    embed.setDescription(list);
    embed.setFooter({
      text: `${tracks.length} track${tracks.length !== 1 ? 's' : ''} | Total: ${formatDuration(totalDuration)}`,
    });
  }

  await interaction.reply({ embeds: [embed] });
}
