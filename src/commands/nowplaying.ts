import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { GuildMusicManager } from '../music/GuildMusicManager.js';
import { EmptyQueueError } from '../utils/errors.js';
import { formatDuration } from '../utils/duration.js';

export const data = new SlashCommandBuilder()
  .setName('nowplaying')
  .setDescription('Show the currently playing track');

export async function execute(interaction: ChatInputCommandInteraction) {
  const manager = GuildMusicManager.get(interaction.guildId!);
  const track = manager.currentTrack;
  if (!track) throw new EmptyQueueError();

  const status = manager.player.isPaused ? 'Paused' : 'Playing';

  const embed = new EmbedBuilder()
    .setTitle(`Now Playing — ${status}`)
    .setDescription(`[${track.title}](${track.url})`)
    .addFields(
      { name: 'Artist', value: track.artist, inline: true },
      { name: 'Duration', value: formatDuration(track.duration), inline: true },
      { name: 'Requested By', value: track.requestedBy, inline: true },
      { name: 'Volume', value: `${manager.player.volume}%`, inline: true },
      { name: 'Queue', value: `${manager.queue.size} track(s)`, inline: true },
    )
    .setThumbnail(track.thumbnail || null)
    .setColor(manager.player.isPaused ? 0xffaa00 : 0x5865f2);

  await interaction.reply({ embeds: [embed] });
}
